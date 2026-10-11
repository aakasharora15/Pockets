import { parseReceipt, type ReceiptGuess } from './receiptText';

/**
 * Reads a receipt photo on the phone with Tesseract.js (no photo leaves the device for this).
 * The reader (about 7 MB) is served by Spendr from /ocr and downloaded the first time it's used.
 */
export async function readReceipt(photo: Blob, onProgress?: (p: number) => void): Promise<ReceiptGuess> {
  const { createWorker, OEM } = await import('tesseract.js');
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/',
    langPath: '/ocr/',
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(photo);
    return parseReceipt(data.text);
  } finally {
    await worker.terminate();
  }
}
