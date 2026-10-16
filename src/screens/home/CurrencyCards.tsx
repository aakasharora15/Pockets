import { useEffect, useRef, useState } from 'react';
import type { Expense, PocketWithMembers } from '../../data/types';
import { useCombined } from '../../data/useCombined';
import { currency, type CurrencyCode } from '../../lib/currencies';
import { addMonths, monthName, monthShort } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { formatNumber, formatWhole, formatWholeDown } from '../../lib/money';
import { totalIn, trend } from '../../lib/stats';
import { useNavigate } from 'react-router-dom';
import { useUi } from '../../state/ui';
import { MonthDots } from './MonthDots';

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
          aria-label={`${c.plural}: ${c.symbol}${amount}. Open the calendar`}
          onClick={() => navigate('/calendar', { state: { currency: code } })}
        />
        <div className="month-card-main">
          <span className="cur-card-label">
            {c.plural} · {monthName(month)}
          </span>
          <div className="cur-card-amount num">
            <span className="cur-card-sym">{c.symbol}</span>
            <Amount className={`cur-card-num${fit}`} value={amount} />
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
              <div className="budget-fill" style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
            </div>
            <span className="budget-text">
              {empty
                ? `${formatWhole(0, code)} of ${formatWhole(budget, code)} budget`
                : `${formatWholeDown(total, code)} of ${formatWhole(budget, code)} · ${formatWhole(Math.abs(left), code)} ${left >= 0 ? 'left' : 'over'}`}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  const pages = [
    ...pocket.currencies.map(card),
    ...(combinedCode ? [<CombinedCard key="combined" code={combinedCode} month={month} expenses={expenses} empty={empty} />] : []),
  ];
  return <CardPager pages={pages} codes={pocket.currencies} selected={selected} onSelect={onSelect} resetKey={pocket.id} />;
}

/**
 * Swipeable pages with a page indicator: a dot per page, the one showing highlighted. Swiping to a
 * currency's page selects it; tapping a dot goes to that page.
 */
function CardPager({
  pages,
  codes,
  selected,
  onSelect,
  resetKey,
}: {
  pages: React.ReactNode[];
  codes: CurrencyCode[];
  selected: CurrencyCode;
  onSelect: (c: CurrencyCode) => void;
  resetKey: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(() => Math.max(0, codes.indexOf(selected)));
  const frame = useRef(0);

  // A different Pocket starts on its first page.
  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
    setPage(0);
  }, [resetKey]);

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = track.current;
      if (!el) return;
      const kids = [...el.children] as HTMLElement[];
      const mid = el.scrollLeft + el.clientWidth / 2;
      let i = 0;
      kids.forEach((k, j) => {
        if (Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid) < Math.abs(kids[i].offsetLeft + kids[i].offsetWidth / 2 - mid)) i = j;
      });
      if (i === page) return;
      setPage(i);
      if (codes[i]) onSelect(codes[i]);
    });
  };

  const go = (i: number) => {
    const kid = track.current?.children[i] as HTMLElement | undefined;
    if (kid && track.current) track.current.scrollTo({ left: kid.offsetLeft - parseFloat(getComputedStyle(track.current).paddingLeft), behavior: 'smooth' });
  };

  if (pages.length === 1) return <div className="cards-single">{pages}</div>;
  return (
    <div className="cards-pager">
      <div className="cards-track" ref={track} onScroll={onScroll}>
        {pages}
      </div>
      <div className="page-dots" role="tablist" aria-label="Currencies">
        {pages.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === page}
            aria-label={codes[i] ? currency(codes[i]).plural : 'All currencies combined'}
            className={`page-dot${i === page ? ' on' : ''}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

/** A formatted amount with its decimals dimmed: 12<dim>.50</dim>. */
export function Amount({ className, value }: { className: string; value: string }) {
  const dot = value.lastIndexOf('.');
  if (dot < 0) return <span className={className}>{value}</span>;
  return (
    <span className={className}>
      {value.slice(0, dot)}
      <span className="cur-dec">{value.slice(dot)}</span>
    </span>
  );
}

/** "All in pounds": every currency converted at each expense's own day's rate. */
function CombinedCard({ code, month, expenses, empty }: { code: CurrencyCode; month: string; expenses: Expense[]; empty: boolean }) {
  const c = currency(code);
  const { total, missing, loading, error } = useCombined(expenses, code);
  const others = expenses.some((e) => e.currency !== code);
  let note = 'Each expense at its own day’s rate';
  if (error) note = 'Needs a connection to get exchange rates';
  else if (missing) note = `${missing} not included yet: no rate for their date`;
  else if (!others && !empty) note = `Everything this month is in ${c.plural.toLowerCase()}`;
  return (
    <div className="cur-card combined-card">
      <div className="cur-card-head">
        <span className="cur-card-label">
          All in {c.plural.toLowerCase()} · {monthName(month)}
        </span>
      </div>
      <div className={`cur-card-amount num${loading && !empty ? ' loading' : ''}`}>
        <span className="cur-card-sym">≈{c.symbol}</span>
        <Amount className="cur-card-num" value={formatNumber(empty || error ? 0 : total, code, c.dp)} />
      </div>
      <span className="budget-text">{note}</span>
    </div>
  );
}
