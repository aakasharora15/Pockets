// Copies the receipt reader (Tesseract.js worker, its WebAssembly core and English data) into
// public/ocr, so Spendr serves it itself instead of loading it from a CDN. Runs before dev and build.
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = join(process.cwd(), 'public', 'ocr');
mkdirSync(out, { recursive: true });

const pkg = (name) => dirname(require.resolve(`${name}/package.json`));
const files = [
  [join(pkg('tesseract.js'), 'dist', 'worker.min.js'), 'worker.min.js'],
  // The worker picks one of these by what the browser supports (LSTM engine only).
  ...['tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'].map((f) => [
    join(pkg('tesseract.js-core'), f),
    f,
  ]),
  [join(pkg('@tesseract.js-data/eng'), '4.0.0_best_int', 'eng.traineddata.gz'), 'eng.traineddata.gz'],
];

for (const [from, name] of files) {
  const to = join(out, name);
  if (existsSync(to) && statSync(to).size === statSync(from).size) continue;
  copyFileSync(from, to);
}
