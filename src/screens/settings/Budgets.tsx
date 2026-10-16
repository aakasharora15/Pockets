import { useState } from 'react';
import { BackButton } from '../../components/Chrome';
import { setBudget } from '../../data/pockets';
import { useExpenses } from '../../data/useExpenses';
import { currency, minorFactor, type CurrencyCode } from '../../lib/currencies';
import { currentMonth } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { formatMoney, formatWhole } from '../../lib/money';
import { totalIn } from '../../lib/stats';
import { useCurrentPocket } from '../../state/pockets';
import { useUi } from '../../state/ui';
import { budgetLevel } from '../../lib/stats';

/** Monthly budgets: one per currency, never combined. */
export function Budgets() {
  const pocket = useCurrentPocket();
  const { expenses } = useExpenses(pocket.id, currentMonth());
  return (
    <div className="screen">
      <div className="scroll sub-scroll budgets-scroll">
        <div className="page-head">
          <span className="page-title">Monthly budgets</span>
          <span className="page-sub">One budget per currency. Totals are never combined.</span>
        </div>
        {pocket.currencies.map((code) => (
          <BudgetCard key={code} pocketId={pocket.id} code={code} budget={pocket.budgets[code] ?? 0} spent={totalIn(expenses, code)} />
        ))}
      </div>
      <div className="fade-top" />
      <BackButton to="/settings" />
    </div>
  );
}

function BudgetCard({ pocketId, code, budget, spent }: { pocketId: string; code: CurrencyCode; budget: number; spent: number }) {
  const c = currency(code);
  const { showToast } = useUi();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const start = () => {
    setText(budget ? String(Math.round(budget / minorFactor(code))) : '');
    setEditing(true);
  };

  const commit = async () => {
    setEditing(false);
    const n = Number(text.replace(/[^0-9.]/g, ''));
    const minor = Number.isFinite(n) ? Math.round(n * minorFactor(code)) : 0;
    if (minor === budget) return;
    try {
      await setBudget(pocketId, code, minor > 0 ? minor : null);
    } catch {
      showToast("Couldn't save. Try again");
    }
  };

  const left = budget - spent;
  return (
    <div className="card budget-card">
      <div className="budget-head">
        <div className="budget-sym">{c.symbol}</div>
        <span className="budget-title">{c.short} budget</span>
      </div>
      <div className="budget-field" onClick={() => !editing && start()}>
        {editing ? (
          <input
            autoFocus
            className="budget-input num"
            inputMode="numeric"
            aria-label={`${c.short} budget`}
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <span className={`budget-amount num${budget ? '' : ' unset'}`}>{budget ? formatWhole(budget, code) : `${c.symbol}0`}</span>
        )}
        <Icon name="pencil-simple" size={20} color="var(--text2)" />
      </div>
      {budget > 0 && (
        <div className="budget">
          <div className="budget-track thin">
            <div className={`budget-fill ${budgetLevel(spent, budget)}`} style={{ width: `${Math.min(100, (spent / budget) * 100)}%` }} />
          </div>
          <div className="budget-foot">
            <span>{formatMoney(spent, code)} spent</span>
            <span className={left < 0 ? 'budget-over' : undefined}>
              {formatMoney(Math.abs(left), code)} {left >= 0 ? 'left' : 'over'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
