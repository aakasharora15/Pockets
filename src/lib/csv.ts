import type { Category, Expense, Member } from '../data/types';
import { formatPlain } from './money';

function cell(v: string): string {
  // Quote when needed; neutralise leading characters spreadsheets treat as formulas.
  let s = v;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV per Pocket: date, name, category, currency, amount (major units), added by, note. */
export function expensesToCsv(expenses: Expense[], categories: Category[], members: Member[]): string {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const memberName = new Map(members.map((m) => [m.uid, m.name]));
  const rows = [['date', 'name', 'category', 'currency', 'amount', 'added by', 'note']];
  for (const e of [...expenses].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) {
    rows.push([
      e.date,
      e.name,
      catName.get(e.categoryId) ?? 'Other',
      e.currency,
      formatPlain(e.amountMinor, e.currency),
      memberName.get(e.byUid) ?? e.byInitials,
      e.note ?? '',
    ]);
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}

export async function shareOrDownload(filename: string, text: string): Promise<void> {
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' });
  const file = new File([blob], filename, { type: 'text/csv' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
