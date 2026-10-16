import { useMemo } from 'react';
import { currentMonth, daysInMonth, todayKey } from '../../lib/dates';

/**
 * The month as dots, Monday first: dark where there was spending, the accent for today, faint for the
 * rest (fainter still ahead of today), with this week on a soft band.
 */
export function MonthDots({ month, spentDays }: { month: string; spentDays: Set<string> }) {
  const today = todayKey();
  const weeks = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const slots: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth(month); d++) slots.push(`${month}-${String(d).padStart(2, '0')}`);
    while (slots.length % 7) slots.push(null);
    const rows: (string | null)[][] = [];
    for (let i = 0; i < slots.length; i += 7) rows.push(slots.slice(i, i + 7));
    return rows;
  }, [month]);
  const isNow = month === currentMonth();
  return (
    <span className="month-dots" aria-hidden>
      {weeks.map((row, i) => (
        <span key={i} className={`month-week${isNow && row.includes(today) ? ' now' : ''}`}>
          {row.map((day, j) => (
            <span key={j} className={`month-dot${!day ? ' blank' : day === today ? ' today' : spentDays.has(day) ? ' spent' : day > today ? ' future' : ''}`} />
          ))}
        </span>
      ))}
    </span>
  );
}
