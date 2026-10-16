import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Fades } from '../components/Chrome';
import { categoryOf, SwipeRow, useSwipeRows } from '../components/ExpenseRow';
import { ListSkeleton } from '../components/Skeletons';
import { useExpenses } from '../data/useExpenses';
import { pastelFor } from '../lib/categories';
import { currency, type CurrencyCode } from '../lib/currencies';
import { addMonths, currentMonth, dayMonth, daysInMonth, monthName, todayKey } from '../lib/dates';
import { Icon } from '../lib/icons';
import { formatMoney, formatNumber } from '../lib/money';
import { byCategory } from '../lib/stats';
import { useCurrentPocket, usePockets } from '../state/pockets';
import { useUi } from '../state/ui';
import { monthSummary } from './calendar/summary';
import { Amount } from './home/CurrencyCards';
import { MonthHeader } from './home/MonthHeader';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface Cell {
  key: string;
  day: number;
  inMonth: boolean;
}

/** Mon-first grid including the trailing/leading days of neighbouring months. */
function cellsFor(month: string): Cell[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const dim = daysInMonth(month);
  const prevDim = daysInMonth(addMonths(month, -1));
  const cells: Cell[] = [];
  for (let i = lead; i > 0; i--) cells.push({ key: `p${i}`, day: prevDim - i + 1, inMonth: false });
  for (let d = 1; d <= dim; d++) cells.push({ key: `${month}-${String(d).padStart(2, '0')}`, day: d, inMonth: true });
  let n = 1;
  while (cells.length % 7) cells.push({ key: `n${n}`, day: n++, inMonth: false });
  return cells;
}

export function Calendar() {
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { month, setMonth } = useUi();
  const swipe = useSwipeRows(pocket.id);
  const navigate = useNavigate();
  const { expenses, loading } = useExpenses(pocket.id, month);
  const today = todayKey();
  const [selected, setSelected] = useState(month === currentMonth() ? today : `${month}-01`);

  useEffect(() => {
    setSelected(month === currentMonth() ? today : `${month}-01`);
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => {
    const m = new Map<string, typeof expenses>();
    for (const e of expenses) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [expenses]);

  const cells = useMemo(() => cellsFor(month), [month]);

  /** Up to two categories spent on that day, biggest first, shown as small icon bubbles. */
  const bubblesFor = (key: string) => {
    const totals = new Map<string, number>();
    for (const e of byDay.get(key) ?? []) totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amountMinor);
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id]) => categoryOf(categories, id));
  };

  // The month at a glance, in the Pocket's main currency, with any others underneath.
  // Opened from a currency's card on Home: that currency first.
  const asked = (useLocation().state as { currency?: CurrencyCode } | null)?.currency;
  const main = asked && pocket.currencies.includes(asked) ? asked : pocket.currencies[0];
  const summary = useMemo(() => monthSummary(expenses, pocket, main, monthName(month)), [expenses, pocket, main, month]);
  const others = pocket.currencies
    .filter((code) => code !== main)
    .map((code) => ({ code, total: expenses.filter((e) => e.currency === code).reduce((s, e) => s + e.amountMinor, 0) }))
    .filter((o) => o.total > 0);

  const dayList = byDay.get(selected) ?? [];
  const dayCurrencies = pocket.currencies.filter((c) => dayList.some((e) => e.currency === c));
  // Expenses in a currency the Pocket no longer shows still appear in the list.
  for (const e of dayList) if (!dayCurrencies.includes(e.currency)) dayCurrencies.push(e.currency);

  return (
    <div className="screen">
      <div className="scroll cal-scroll">
        <MonthHeader month={month} onChange={setMonth} />
        <div className="card cal-card">
          <div className="cal-summary">
            <span className="cal-summary-label">{summary.label}</span>
            <span className="cal-summary-amount num">
              <span className="cur-card-sym">{currency(main).symbol}</span>
              <Amount className="cal-summary-num" value={formatNumber(summary.amount, main, currency(main).dp)} />
            </span>
            <span className="cal-summary-sub">
              {summary.sub}
              {others.map((o) => ` · ${formatMoney(o.total, o.code)} spent`).join('')}
            </span>
          </div>
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal-grid">
            {cells.map((c) => {
              const bubbles = c.inMonth ? bubblesFor(c.key) : [];
              const isSel = c.inMonth && c.key === selected;
              const isToday = c.inMonth && c.key === today;
              const past = c.inMonth && c.key < today;
              return (
                <button
                  key={c.key}
                  disabled={!c.inMonth}
                  className={`cal-cell${c.inMonth ? '' : ' out'}${past ? ' past' : ''}${isSel ? ' sel' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => setSelected(c.key)}
                  aria-label={c.inMonth ? dayMonth(c.key) : undefined}
                  aria-pressed={isSel}
                >
                  <span className="cal-num">{c.day}</span>
                  <span className="cal-bubbles">
                    {bubbles.map((cat, i) => (
                      <span
                        key={cat?.id ?? i}
                        className="cal-bubble"
                        style={{ background: pastelFor(cat?.id ?? 'other', cat?.colour ?? '#9AA0AA'), zIndex: 2 - i }}
                      >
                        <Icon name={cat?.icon ?? 'dots-three'} weight="regular" size={12} />
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <ListSkeleton rows={2} />
        ) : dayList.length === 0 ? (
          <div className="card">
            <div className="day-label">Spent on {dayMonth(selected)}</div>
            <div className="day-none">Nothing spent on this day.</div>
          </div>
        ) : (
          <>
            {dayCurrencies.map((code) => {
              const rows = byCategory(dayList, code);
              const total = rows.reduce((s, r) => s + r.total, 0);
              return (
                <div key={code} className="card">
                  <div className="day-label">Spent on {dayMonth(selected)}</div>
                  <div className="day-amount num">
                    <span className="day-sym">{currency(code).symbol}</span>
                    <span className="day-num">{formatNumber(total, code)}</span>
                  </div>
                  <div className="day-bar">
                    {rows.map((r) => {
                      const c = categoryOf(categories, r.categoryId);
                      return <div key={r.categoryId} style={{ flex: `${r.total} 1 0%`, background: pastelFor(c?.id ?? 'other', c?.colour ?? '#9AA0AA') }} />;
                    })}
                  </div>
                  <div className="day-legend">
                    {rows.map((r) => {
                      const c = categoryOf(categories, r.categoryId);
                      return (
                        <span key={r.categoryId} className="day-legend-item">
                          <span className="day-legend-dot" style={{ background: pastelFor(c?.id ?? 'other', c?.colour ?? '#9AA0AA') }} />
                          {c?.name ?? 'Other'} {formatMoney(r.total, code)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="list-card">
              {dayList.map((e, i) => (
                <SwipeRow key={e.id} expense={e} categories={categories} first={i === 0} {...swipe(e)} />
              ))}
            </div>
          </>
        )}
      </div>
      <Fades />
      <div className="top-bar">
        <button className="circle-52 glass press" aria-label="Search expenses" onClick={() => navigate('/transactions', { state: { search: true } })}>
          <Icon name="magnifying-glass" size={22} />
        </button>
      </div>
    </div>
  );
}
