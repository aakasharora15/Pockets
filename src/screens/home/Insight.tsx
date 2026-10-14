import { useEffect, useState } from 'react';
import { categoryOf } from '../../components/ExpenseRow';
import type { Expense } from '../../data/types';
import { Icon } from '../../lib/icons';
import { formatMoney } from '../../lib/money';
import { byCategory } from '../../lib/stats';
import { usePockets } from '../../state/pockets';

export function Insight({ pocketId, month, expenses, code, empty }: { pocketId: string; month: string; expenses: Expense[]; code: string; empty: boolean }) {
  const { categories } = usePockets();
  const key = `spendr.insight.${pocketId}.${month}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(key) === '1');
    } catch {
      setDismissed(false);
    }
  }, [key]);

  if (dismissed) return null;
  let text = 'Add your first expense to get started';
  if (!empty) {
    const top = byCategory(expenses, code)[0];
    if (!top) return null;
    const cat = categoryOf(categories, top.categoryId);
    text = `${cat?.name ?? 'Other'} is your biggest spend this month at ${formatMoney(top.total, code)}.`;
  }
  return (
    <div className="insight">
      <div className="insight-icon">
        <Icon name="sparkle" />
      </div>
      <span className="insight-text">{text}</span>
      <button
        className="insight-x press"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(key, '1');
          } catch {
            /* storage unavailable */
          }
        }}
      >
        <Icon name="x" weight="bold" />
      </button>
    </div>
  );
}
