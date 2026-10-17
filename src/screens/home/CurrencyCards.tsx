import type { Expense, PocketWithMembers } from '../../data/types';
import { useCombined } from '../../data/useCombined';
import { currency, type CurrencyCode } from '../../lib/currencies';
import { addMonths, monthShort } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { formatNumber, formatWhole, formatWholeDown } from '../../lib/money';
import { budgetLevel, totalIn, trend } from '../../lib/stats';
import { useNavigate } from 'react-router-dom';
import { CardPager } from '../../components/CardPager';
import { useUi } from '../../state/ui';
import { MonthDots } from './MonthDots';
import { decimalSign, symbolAfter, withSymbol } from '../../lib/locale';

/**
 * Month totals, one card per currency: the total, how it compares with last month and the budget on
 * the left, and that currency's month as dots on the right. Tap a card for the calendar in that
 * currency. With several currencies the cards are pages you swipe through, with a dot for each
 * underneath; the page showing picks the currency the charts below use.
 */
export function CurrencyCards({
  pocket,
  month,
  expenses,
  prevExpenses,
  empty,
  selected,
  onSelect,
}: {
  pocket: PocketWithMembers;
  month: string;
  expenses: Expense[];
  prevExpenses: Expense[];
  empty: boolean;
  selected: CurrencyCode;
  onSelect: (c: CurrencyCode) => void;
}) {
  const { combinedFor } = useUi();
  const navigate = useNavigate();
  // Optional extra card: everything converted into one currency (Settings › Combined total).
  const combinedCode = pocket.currencies.length > 1 ? combinedFor(pocket.id) : null;
  // Amounts shrink with their length so they always fit beside the dots; the cards share one size.
  const digits = Math.max(...pocket.currencies.map((code) => formatNumber(empty ? 0 : totalIn(expenses, code), code, 0).length));
  const fit = digits >= 12 ? ' fit-5' : digits >= 10 ? ' fit-4' : digits >= 8 ? ' fit-3' : digits >= 6 ? ' fit-2' : '';

  const card = (code: CurrencyCode) => {
    const c = currency(code);
    const total = totalIn(expenses, code);
    const t = trend(total, totalIn(prevExpenses, code));
    const budget = pocket.budgets[code];
    const left = budget ? budget - total : 0;
    const spentDays = new Set(expenses.filter((e) => e.currency === code).map((e) => e.date));
    // Totals always show the currency's decimals (dimmed), so £ and ₹ cards read the same way.
    const amount = formatNumber(empty ? 0 : total, code, c.dp);
    return (
      <div key={code} className="cur-card month-card">
        <button
          className="month-card-tap"
          aria-label={`${c.plural}: ${withSymbol(code, amount)}. Open the calendar`}
          onClick={() => {
            onSelect(code);
            navigate('/calendar');
          }}
        />
        <div className="month-card-main">
          <span className="cur-card-label">{c.plural}</span>
          <div className={`cur-card-amount num${symbolAfter(code) ? ' sym-after' : ''}`}>
            <span className="cur-card-sym">{c.symbol}</span>
            <Amount className={`cur-card-num${fit}`} value={amount} code={code} />
          </div>
          {!empty && t !== null && t !== 0 && (
            <div className="trend" style={{ color: t < 0 ? 'var(--good)' : 'var(--bad)' }}>
              <Icon name={t < 0 ? 'arrow-down' : 'arrow-up'} weight="bold" size={12} />
              {Math.abs(t)}% vs {monthShort(addMonths(month, -1))}
            </div>
          )}
        </div>
        <span className="month-card-dots">
          <MonthDots month={month} spentDays={spentDays} />
          <Icon name="caret-right" weight="bold" size={13} />
        </span>
        {budget ? (
          <div className="budget month-card-budget">
            <div className="budget-track">
              <div className={`budget-fill ${budgetLevel(total, budget)}`} style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
            </div>
            <span className="budget-text">
              {empty ? (
                `${formatWhole(0, code)} of ${formatWhole(budget, code)} budget`
              ) : (
                <>
                  {formatWholeDown(total, code)} of {formatWhole(budget, code)} ·{' '}
                  <span className={left < 0 ? 'budget-over' : undefined}>
                    {formatWhole(Math.abs(left), code)} {left >= 0 ? 'left' : 'over'}
                  </span>
                </>
              )}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  const pages = [
    ...pocket.currencies.map(card),
    ...(combinedCode ? [<CombinedCard key="combined" code={combinedCode} expenses={expenses} empty={empty} />] : []),
  ];
  const labels = [...pocket.currencies.map((code) => currency(code).plural), ...(combinedCode ? ['All currencies combined'] : [])];
  return (
    <CardPager
      pages={pages}
      labels={labels}
      label="Currencies"
      index={Math.max(0, pocket.currencies.indexOf(selected))}
      onChange={(i) => pocket.currencies[i] && onSelect(pocket.currencies[i])}
      resetKey={pocket.id}
    />
  );
}

/** A formatted amount with its decimals dimmed: 12<dim>.50</dim>. */
export function Amount({ className, value, code }: { className: string; value: string; code: string }) {
  const dot = value.lastIndexOf(decimalSign(code));
  if (dot < 0) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      {value.slice(0, dot)}
      <span className="cur-dec">{value.slice(dot)}</span>
    </span>
  );
}

/** "All in pounds": every currency converted at each expense's own day's rate. */
function CombinedCard({ code, expenses, empty }: { code: CurrencyCode; expenses: Expense[]; empty: boolean }) {
  const c = currency(code);
  const { total, missing, loading, error } = useCombined(expenses, code);
  const others = expenses.some((e) => e.currency !== code);
  let note = 'Each expense at its own day’s rate';
  if (error) note = 'Needs a connection to get exchange rates';
  else if (missing) {
    // Some currencies have no published daily rate at all; say which, rather than "not yet".
    const noRate = [...new Set(expenses.map((e) => e.currency))].filter((x) => x !== code && !currency(x).rates);
    note = noRate.length
      ? `${noRate.map((x) => currency(x).plural).join(' and ')} not included: no daily exchange rate is published`
      : `${missing} not included yet: no rate for their date`;
  } else if (!others && !empty) note = `Everything this month is in ${c.plural.toLowerCase()}`;
  return (
    <div className="cur-card combined-card">
      <div className="cur-card-head">
        <span className="cur-card-label">All in {c.plural.toLowerCase()}</span>
      </div>
      <div className={`cur-card-amount num${loading && !empty ? ' loading' : ''}${symbolAfter(code) ? ' sym-after' : ''}`}>
        <span className="cur-card-sym">≈{c.symbol}</span>
        <Amount className="cur-card-num" value={formatNumber(empty || error ? 0 : total, code, c.dp)} code={code} />
      </div>
      <span className="budget-text">{note}</span>
    </div>
  );
}
