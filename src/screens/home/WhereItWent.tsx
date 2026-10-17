import { useMemo } from 'react';
import { categoryOf } from '../../components/ExpenseRow';
import type { Expense } from '../../data/types';
import { OTHER_ID } from '../../lib/categories';
import { Icon } from '../../lib/icons';
import { formatMoney, formatWhole } from '../../lib/money';
import { byCategory, totalIn } from '../../lib/stats';
import { usePockets } from '../../state/pockets';

export function WhereItWent({ expenses, code, onSeeAll }: { expenses: Expense[]; code: string; onSeeAll: () => void }) {
  const { categories } = usePockets();
  const rows = useMemo(() => {
    // Expenses in a category that no longer exists count towards Other.
    const merged = new Map<string, number>();
    for (const r of byCategory(expenses, code)) {
      const id = categories.some((c) => c.id === r.categoryId) ? r.categoryId : OTHER_ID;
      merged.set(id, (merged.get(id) ?? 0) + r.total);
    }
    return [...merged.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [expenses, code, categories]);
  const total = totalIn(expenses, code);
  if (rows.length === 0) return null;
  const max = rows[0][1];
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Where it went</span>
        <button className="link see-all press" onClick={onSeeAll}>
          See all
        </button>
      </div>
      <div className="where-list">
        {rows.map(([cid, v]) => {
          const cat = categoryOf(categories, cid);
          return (
            <div key={cid} className="where-row">
              <div className="cat-tile tinted" style={{ '--cat': cat?.colour ?? '#9AA0AA' } as React.CSSProperties}>
                <Icon name={cat?.icon ?? 'dots-three'} />
              </div>
              <div className="where-body">
                <div className="where-top">
                  <span className="where-name">{cat?.name ?? 'Other'}</span>
                  <span className="where-amt num">
                    {code === 'INR' ? formatMoney(v, code) : formatWhole(v, code)}
                    <span className="where-pct">{Math.round((v / total) * 100)}%</span>
                  </span>
                </div>
                <div className="bar-track where-track">
                  <div className="bar-fill" style={{ width: `${(v / max) * 100}%`, background: cat?.colour ?? '#9AA0AA' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
