import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Expense, PocketWithMembers } from '../../data/types';
import { currency, type CurrencyCode } from '../../lib/currencies';
import { currentMonth, daysInMonth, monthName, todayKey } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { formatNumber } from '../../lib/money';
import { monthSummary } from '../calendar/summary';
import { Amount } from './CurrencyCards';

/**
 * The month at a glance: one number, and every day as a dot (dark where you spent, the accent for
 * today, faint for the rest), this week lifted out. Tap for the full calendar.
 */
export function MonthGlance({ pocket, month, expenses, code }: { pocket: PocketWithMembers; month: string; expenses: Expense[]; code: CurrencyCode }) {
  const navigate = useNavigate();
  const today = todayKey();
  const s = useMemo(() => monthSummary(expenses, pocket, code, monthName(month)), [expenses, pocket, code, month]);
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
  const c = currency(code);

  return (
    <button
      className="card glance press"
      onClick={() => navigate('/calendar')}
      aria-label={`${s.label} ${c.symbol}${formatNumber(s.amount, code, c.dp)}, ${s.sub}. Open calendar`}
    >
      <div className="glance-text">
        <span className="glance-label">
          <span className="glance-icon">
            <Icon name="calendar-blank" weight="fill" size={13} />
          </span>
          {s.label}
        </span>
        <span className="glance-amount num">
          <span className="cur-card-sym">{c.symbol}</span>
          <Amount className="glance-num" value={formatNumber(s.amount, code, c.dp)} />
        </span>
        <span className="glance-sub">{s.sub}</span>
      </div>
      <div className="glance-dots" aria-hidden>
        {weeks.map((row, i) => (
          <div key={i} className={`glance-week${isNow && row.includes(today) ? ' now' : ''}`}>
            {row.map((day, j) => (
              <span key={j} className={`glance-dot${!day ? ' blank' : day === today ? ' today' : s.days.has(day) ? ' spent' : day > today ? ' future' : ''}`} />
            ))}
          </div>
        ))}
      </div>
      <span className="glance-caret">
        <Icon name="caret-right" weight="bold" size={14} />
      </span>
    </button>
  );
}
