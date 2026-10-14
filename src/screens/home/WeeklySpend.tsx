import { useMemo } from 'react';
import type { Expense } from '../../data/types';
import { formatShort } from '../../lib/money';
import { weeklyBars } from '../../lib/stats';

export function WeeklySpend({ expenses, code, month, empty }: { expenses: Expense[]; code: string; month: string; empty: boolean }) {
  const { weeks, avg } = useMemo(() => weeklyBars(expenses, code, month), [expenses, code, month]);
  const scale = 100 / Math.max(1, ...weeks.map((w) => w.total), empty ? 1 : avg);
  const cols = { gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` };
  const nothingInCurrency = weeks.every((w) => w.total === 0);
  return (
    <div className="card weekly">
      <div className="card-head">
        <span className="card-title">Weekly spend</span>
        <span className="weekly-avg">{empty || nothingInCurrency || !avg ? '' : `Avg ${formatShort(avg, code)} a week`}</span>
      </div>
      <div className="weekly-chart">
        {!empty && !nothingInCurrency && avg > 0 && <div className="avg-line" style={{ bottom: avg * scale }} />}
        <div className="weekly-cols" style={cols}>
          {weeks.map((w) => {
            const ghost = w.ghost || nothingInCurrency;
            return (
              <div key={w.label} className="weekly-col">
                <span className="weekly-val" style={{ color: w.current ? 'var(--text)' : undefined }}>
                  {ghost ? '' : formatShort(w.total, code)}
                </span>
                <div className={`weekly-bar${ghost ? ' ghost' : w.current ? ' current' : ''}`} style={{ height: ghost ? 8 : Math.max(8, w.total * scale) }} />
              </div>
            );
          })}
        </div>
        {(empty || nothingInCurrency) && <div className="weekly-empty">No spending yet this month</div>}
      </div>
      <div className="weekly-labels" style={cols}>
        {weeks.map((w) => (
          <span key={w.label} className={w.current ? 'on' : undefined}>
            {w.label}
          </span>
        ))}
      </div>
    </div>
  );
}
