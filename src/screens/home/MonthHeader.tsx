import { useRef } from 'react';
import { addMonths, monthName, monthShort } from '../../lib/dates';

/** Month title with previous/next peeking at 30%. Swipe or tap a peek to change month. */
export function MonthHeader({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const startX = useRef<number | null>(null);
  return (
    <div
      className="month-head"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (dx > 40) onChange(addMonths(month, -1));
        else if (dx < -40) onChange(addMonths(month, 1));
      }}
    >
      <button className="month-peek left" aria-label={`Previous month, ${monthName(addMonths(month, -1))}`} onClick={() => onChange(addMonths(month, -1))}>
        {monthShort(addMonths(month, -1))}
      </button>
      <span className="month-title">{monthName(month)}</span>
      <button className="month-peek right" aria-label={`Next month, ${monthName(addMonths(month, 1))}`} onClick={() => onChange(addMonths(month, 1))}>
        {monthShort(addMonths(month, 1))}
      </button>
    </div>
  );
}
