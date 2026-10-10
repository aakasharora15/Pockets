/** "Prernaa Singh" → "PS"; "Trina" → "TR". */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** First name for greetings ("Welcome, Prernaa"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Makes initials unique within a Pocket by appending a digit ("AA" → "AA2"). */
export function uniqueInitials(wanted: string, taken: string[]): string {
  const set = new Set(taken.map((t) => t.toUpperCase()));
  if (!set.has(wanted.toUpperCase())) return wanted;
  for (let i = 2; i < 100; i++) {
    const candidate = `${wanted}${i}`;
    if (!set.has(candidate.toUpperCase())) return candidate;
  }
  return wanted;
}
