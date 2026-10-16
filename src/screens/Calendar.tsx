import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardPager } from '../components/CardPager';
import { Fades } from '../components/Chrome';
import { categoryOf, SwipeRow, useSwipeRows } from '../components/ExpenseRow';
import { ListSkeleton } from '../components/Skeletons';
import { useExpenses } from '../data/useExpenses';
import { pastelFor } from '../lib/categories';
import { currency } from '../lib/currencies';
import { addMonths, currentMonth, dayMonth, daysInMonth, monthName, todayKey } from '../lib/dates';
import { Icon } from '../lib/icons';
import { formatMoney, formatNumber } from '../lib/money';
import { byCategory } from '../lib/stats';
import { useCurrentPocket, usePockets } from '../state/pockets';
import { useUi, useViewCurrency } from '../state/ui';
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
  const { month, setMonth, openExpenseSheet } = useUi();
  const swipe = useSwipeRows(pocket.id);
  const navigate = useNavigate();
  const { expenses, loading } = useExpenses(pocket.id, month);
  // One currency at a time, the same one Home is showing; swipe the cards at the top to change it.
  const [code, setCode] = useViewCurrency(pocket.currencies);
  const shown = useMemo(() => expenses.filter((e) => e.currency === code), [expenses, code]);
  const today = todayKey();
  const [selected, setSelected] = useState(month === currentMonth() ? today : `${month}-01`);

  useEffect(() => {
    setSelected(month === currentMonth() ? today : `${month}-01`);
  }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const byDay = useMemo(() => {
    const m = new Map<string, typeof expenses>();
    for (const e of shown) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [shown]);

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

  // The month at a glance, a card per currency to swipe between, like Home's.
  const summaries = pocket.currencies.map((c) => {
    const s = monthSummary(
      expenses.filter((e) => e.currency === c),
      pocket,
      c,
      monthName(month),
    );
    const cur = currency(c);
    return (
      <div key={c} className="card cal-summary">
        <span className={`cal-summary-label${s.over ? ' budget-over' : ''}`}>
          {cur.plural} · {s.label}
        </span>
        <span className="cal-summary-amount num">
          <span className="cur-card-sym">{cur.symbol}</span>
          <Amount className="cal-summary-num" value={formatNumber(s.amount, c, cur.dp)} />
        </span>
        <span className="cal-summary-sub">{s.sub}</span>
      </div>
    );
  });

  const dayList = byDay.get(selected) ?? [];
  const dayCurrencies = dayList.length ? [code] : [];

  return (
    <div className="screen">
      <div className="scroll cal-scroll">
        <MonthHeader month={month} onChange={setMonth} />
        <CardPager
          pages={summaries}
          labels={pocket.currencies.map((c) => currency(c).plural)}
          label="Currencies"
          index={Math.max(0, pocket.currencies.indexOf(code))}
          onChange={(i) => setCode(pocket.currencies[i])}
          resetKey={pocket.id}
        />
        <div className="card cal-card">
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
                        <Icon name={cat?.icon ?? 'dots-three'} weight="bold" size={9} />
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
          <div className="day-empty">
            <span>Nothing spent on {dayMonth(selected)}</span>
            {selected <= today && (
              <button className="link press" onClick={() => openExpenseSheet({ mode: 'new', date: selected })}>
                Add expense
              </button>
            )}
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
