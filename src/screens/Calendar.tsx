import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fades } from '../components/Chrome';
import { categoryOf, SwipeRow, useSwipeRows } from '../components/ExpenseRow';
import { ListSkeleton } from '../components/Skeletons';
import { useExpenses } from '../data/useExpenses';
import { pastelFor } from '../lib/categories';
import { currency } from '../lib/currencies';
import { addMonths, currentMonth, dayMonth, daysInMonth, todayKey } from '../lib/dates';
import { Icon } from '../lib/icons';
import { formatMoney, formatNumber } from '../lib/money';
import { byCategory } from '../lib/stats';
import { useCurrentPocket, usePockets } from '../state/pockets';
import { useUi } from '../state/ui';
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

  const dotsFor = (key: string) => {
    const list = byDay.get(key) ?? [];
    const seen: string[] = [];
    for (const e of list) {
      const c = categoryOf(categories, e.categoryId);
      if (c && !seen.includes(c.colour)) seen.push(c.colour);
      if (seen.length === 3) break;
    }
    return seen;
  };

  const legend = useMemo(() => {
    const used = new Set(expenses.map((e) => categoryOf(categories, e.categoryId)?.id));
    return categories.filter((c) => used.has(c.id));
  }, [expenses, categories]);

  const dayList = byDay.get(selected) ?? [];
  const dayCurrencies = pocket.currencies.filter((c) => dayList.some((e) => e.currency === c));
  // Expenses in a currency the Pocket no longer shows still appear in the list.
  for (const e of dayList) if (!dayCurrencies.includes(e.currency)) dayCurrencies.push(e.currency);

  return (
    <div className="screen">
      <div className="scroll cal-scroll">
        <MonthHeader month={month} onChange={setMonth} />
        <div className="card cal-card">
          <div className="cal-weekdays">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="cal-grid">
            {cells.map((c) => {
              const dots = c.inMonth ? dotsFor(c.key) : [];
              const isSel = c.inMonth && c.key === selected;
              const isToday = c.inMonth && c.key === today;
              return (
                <button
                  key={c.key}
                  disabled={!c.inMonth}
                  className={`cal-cell${c.inMonth ? '' : ' out'}${isSel ? ' sel' : ''}${isToday && !isSel ? ' today' : ''}`}
                  onClick={() => setSelected(c.key)}
                  aria-label={c.inMonth ? dayMonth(c.key) : undefined}
                  aria-pressed={isSel}
                >
                  <span className="cal-num" style={{ marginTop: dots.length ? 0 : 9 }}>
                    {c.day}
                  </span>
                  <div className="cal-dots">
                    {dots.map((col) => (
                      <span key={col} className="cal-dot" style={{ background: col }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {legend.length > 0 && (
            <div className="cal-legend">
              {legend.map((c) => (
                <div key={c.id} className="cal-legend-item">
                  <span className="cal-legend-dot" style={{ background: c.colour }} />
                  {c.name}
                </div>
              ))}
            </div>
          )}
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
