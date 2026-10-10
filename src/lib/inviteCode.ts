/** Invite codes: 6 characters, no 0/O/1/I, shown as XXX-XXX. Stored without the dash. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

export function generateCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  // Rejection sampling keeps the distribution uniform over the 32-character alphabet.
  let out = '';
  while (out.length < 6) {
    for (const b of random(12)) {
      if (b < 256 - (256 % CODE_ALPHABET.length)) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
      if (out.length === 6) break;
    }
  }
  return out;
}

export function formatCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3, 6)}`;
}

/** Normalises user input ("k7p-q2m" → "K7PQ2M"). Returns null if it can't be a code. */
export function normaliseCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 6) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

export function inviteLink(code: string, origin = window.location.origin): string {
  return `${origin}/join/${code}`;
}
