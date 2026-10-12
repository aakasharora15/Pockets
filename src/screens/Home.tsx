import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Fades } from '../components/Chrome';
import { categoryOf, SwipeRow, useSwipeRows } from '../components/ExpenseRow';
import { ListSkeleton } from '../components/Skeletons';
import type { Expense, PocketWithMembers } from '../data/types';
import { useCombined } from '../data/useCombined';
import { useExpenses } from '../data/useExpenses';
import { OTHER_ID } from '../lib/categories';
import { currency, type CurrencyCode } from '../lib/currencies';
import { addMonths, monthName, monthShort } from '../lib/dates';
import { Icon } from '../lib/icons';
import { firstName } from '../lib/initials';
import { formatMoney, formatNumber, formatShort, formatWhole, formatWholeDown } from '../lib/money';
import { byCategory, inMonth, totalIn, trend, weeklyBars } from '../lib/stats';
import { useCurrentPocket, usePockets } from '../state/pockets';
import { useSession } from '../state/session';
import { useUi } from '../state/ui';
import { NewPocketSheet } from './pockets/NewPocketSheet';
import { PocketPill, PocketSwitcher } from './pockets/PocketSwitcher';

export function Home() {
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { month, setMonth } = useUi();
  const navigate = useNavigate();
  const prev = addMonths(month, -1);
  const { expenses: both, loading } = useExpenses(pocket.id, prev, month);
  const expenses = useMemo(() => inMonth(both, month), [both, month]);
  const prevExpenses = useMemo(() => inMonth(both, prev), [both, prev]);
  const [cur, setCur] = useState<CurrencyCode>(pocket.currencies[0]);
  const [switcher, setSwitcher] = useState(false);
  const [newPocket, setNewPocket] = useState(false);
  const swipe = useSwipeRows(pocket.id);

  useEffect(() => {
    if (!pocket.currencies.includes(cur)) setCur(pocket.currencies[0]);
  }, [pocket.id, pocket.currencies.join()]); // eslint-disable-line react-hooks/exhaustive-deps

  const empty = !loading && expenses.length === 0;

  return (
    <div className="screen">
      <div className="scroll home-scroll">
        <MonthHeader month={month} onChange={setMonth} />
        <CurrencyCards pocket={pocket} month={month} expenses={expenses} prevExpenses={prevExpenses} empty={empty} onSelect={setCur} />
        {loading ? (
          <>
            <div className="skel skel-card" />
            <ListSkeleton />
          </>
        ) : (
          <>
            <WeeklySpend expenses={expenses} code={cur} month={month} empty={empty} />
            {!empty && <WhereItWent expenses={expenses} code={cur} onSeeAll={() => navigate('/transactions', { state: { currency: cur } })} />}
            {!empty && pocket.type === 'shared' && <ByPerson expenses={expenses} code={cur} pocket={pocket} />}
            <Insight pocketId={pocket.id} month={month} expenses={expenses} code={cur} empty={empty} />
            {!empty && (
              <div className="recent">
                <div className="recent-head">
                  <span className="recent-title">Recent</span>
                  <button className="link see-all press" onClick={() => navigate('/transactions')}>
                    See all
                  </button>
                </div>
                <div className="list-card">
                  {expenses.slice(0, 5).map((e, i) => (
                    <SwipeRow key={e.id} expense={e} categories={categories} first={i === 0} {...swipe(e)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Fades />
      <div className="top-bar" style={{ zIndex: switcher ? 35 : 15 }}>
        <button className="circle-52 glass press" aria-label="Search expenses" onClick={() => navigate('/transactions', { state: { search: true } })}>
          <Icon name="magnifying-glass" size={22} />
        </button>
        <PocketPill pocket={pocket} open={switcher} onClick={() => setSwitcher((s) => !s)} />
        <div className="spacer-52" />
      </div>
      {switcher && (
        <PocketSwitcher
          onClose={() => setSwitcher(false)}
          onNew={() => {
            setSwitcher(false);
            setNewPocket(true);
          }}
          onJoin={() => {
            setSwitcher(false);
            navigate('/join');
          }}
        />
      )}
      {newPocket && <NewPocketSheet onClose={() => setNewPocket(false)} />}
    </div>
  );
}

/** Month title with previous/next peeking at 30%. Swipe or tap a peek to change month. */
export function MonthHeader({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const startX = useRef<number | null>(null);
  return (
    <div
      className="month-head"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (dx > 40) onChange(addMonths(month, -1));
        else if (dx < -40) onChange(addMonths(month, 1));
      }}
    >
      <button className="month-peek left" aria-label={`Previous month, ${monthName(addMonths(month, -1))}`} onClick={() => onChange(addMonths(month, -1))}>
        {monthShort(addMonths(month, -1))}
      </button>
      <span className="month-title">{monthName(month)}</span>
      <button className="month-peek right" aria-label={`Next month, ${monthName(addMonths(month, 1))}`} onClick={() => onChange(addMonths(month, 1))}>
        {monthShort(addMonths(month, 1))}
      </button>
    </div>
  );
}

function CurrencyCards({
  pocket,
  month,
  expenses,
  prevExpenses,
  empty,
  onSelect,
}: {
  pocket: PocketWithMembers;
  month: string;
  expenses: Expense[];
  prevExpenses: Expense[];
  empty: boolean;
  onSelect: (c: CurrencyCode) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const { combinedFor } = useUi();
  // Optional extra card: everything converted into one currency (Settings › Combined total).
  const combinedCode = pocket.currencies.length > 1 ? combinedFor(pocket.id) : null;
  const many = pocket.currencies.length > 1;
  const slides = pocket.currencies.length + (combinedCode ? 1 : 0);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / (326 + 12));
    if (i !== index && i < slides) {
      setIndex(i);
      // The cards below keep following the last single currency.
      if (pocket.currencies[i]) onSelect(pocket.currencies[i]);
    }
  };

  useEffect(() => {
    track.current?.scrollTo({ left: 0 });
    setIndex(0);
  }, [pocket.id]);

  return (
    <div className="cards-wrap">
      <div className="cards-track" ref={track} onScroll={onScroll}>
        {pocket.currencies.map((code) => {
          const c = currency(code);
          const total = totalIn(expenses, code);
          const t = trend(total, totalIn(prevExpenses, code));
          const budget = pocket.budgets[code];
          const left = budget ? budget - total : 0;
          return (
            <div key={code} className="cur-card" style={{ width: many ? 326 : '100%' }}>
              <div className="cur-card-head">
                <span className="cur-card-label">
                  {c.plural} · {monthName(month)}
                </span>
                {!empty && t !== null && t !== 0 && (
                  <div className="trend" style={{ color: t < 0 ? 'var(--good)' : 'var(--bad)' }}>
                    <Icon name={t < 0 ? 'arrow-down' : 'arrow-up'} weight="bold" size={12} />
                    {Math.abs(t)}% vs {monthShort(addMonths(month, -1))}
                  </div>
                )}
              </div>
              <div className="cur-card-amount num">
                <span className="cur-card-sym">{c.symbol}</span>
                <span className="cur-card-num">{empty ? '0' : formatNumber(total, code)}</span>
              </div>
              {budget ? (
                <div className="budget">
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
        })}
        {combinedCode && <CombinedCard code={combinedCode} month={month} expenses={expenses} empty={empty} />}
      </div>
      {many && (
        <div className="dots">
          {Array.from({ length: slides }, (_, i) => (
            <span key={i} className={`dot${i === index ? ' on' : ''}`} />
          ))}
        </div>
      )}
    </div>
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
    <div className="cur-card combined-card" style={{ width: 326 }}>
      <div className="cur-card-head">
        <span className="cur-card-label">
          All in {c.plural.toLowerCase()} · {monthName(month)}
        </span>
      </div>
      <div className={`cur-card-amount num${loading && !empty ? ' loading' : ''}`}>
        <span className="cur-card-sym">≈{c.symbol}</span>
        <span className="cur-card-num">{empty || error ? '0' : formatNumber(total, code)}</span>
      </div>
      <span className="budget-text">{note}</span>
    </div>
  );
}

function WeeklySpend({ expenses, code, month, empty }: { expenses: Expense[]; code: string; month: string; empty: boolean }) {
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
                <span className="weekly-val" style={{ color: w.current ? '#FFFFFF' : undefined }}>
                  {ghost ? '' : formatShort(w.total, code)}
                </span>
                <div
                  className={`weekly-bar${ghost ? ' ghost' : w.current ? ' current' : ''}`}
                  style={{ height: ghost ? 8 : Math.max(8, w.total * scale) }}
                />
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

function WhereItWent({ expenses, code, onSeeAll }: { expenses: Expense[]; code: string; onSeeAll: () => void }) {
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
              <div className="cat-tile">
                <Icon name={cat?.icon ?? 'dots-three'} />
              </div>
              <div className="where-body">
                <div className="where-top">
                  <span className="where-name">{cat?.name ?? 'Other'}</span>
                  <span className="where-amt num">{code === 'INR' ? formatMoney(v, code) : formatWhole(v, code)}</span>
                </div>
                <div className="where-bar-row">
                  <div className="bar-track where-track">
                    <div className="bar-fill" style={{ width: `${(v / max) * 100}%`, background: cat?.colour ?? '#9AA0AA' }} />
                  </div>
                  <span className="where-pct">{Math.round((v / total) * 100)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ByPerson({ expenses, code, pocket }: { expenses: Expense[]; code: string; pocket: PocketWithMembers }) {
  const { user } = useSession();
  const people = useMemo(() => {
    const sums = new Map<string, { initials: string; name: string; total: number }>();
    for (const m of pocket.members) {
      const name = firstName(m.name) + (m.uid === user?.uid ? ' (you)' : '');
      sums.set(m.uid, { initials: m.initials, name, total: 0 });
    }
    for (const e of expenses) {
      if (e.currency !== code) continue;
      // People who left keep their initials on their expenses.
      const p = sums.get(e.byUid) ?? { initials: e.byInitials, name: e.byInitials, total: 0 };
      p.total += e.amountMinor;
      sums.set(e.byUid, p);
    }
    return [...sums.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [expenses, code, pocket.members, user?.uid]);
  const total = totalIn(expenses, code);
  return (
    <div className="card by-person">
      <span className="card-title">By person</span>
      {people.map(([uid, p]) => (
        <div key={uid} className="person-row">
          <Avatar initials={p.initials} size={42} />
          <div className="person-body">
            <div className="person-top">
              <span className="person-name">{p.name}</span>
              <span className="person-amt num">{formatMoney(p.total, code)}</span>
            </div>
            <div className="person-track">
              <div className="person-fill" style={{ width: total ? `${(p.total / total) * 100}%` : 0 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Insight({ pocketId, month, expenses, code, empty }: { pocketId: string; month: string; expenses: Expense[]; code: string; empty: boolean }) {
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
