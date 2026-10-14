import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarStack } from '../components/Avatar';
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
import { PocketDeck } from './pockets/PocketDeck';
import { memberInitials, PocketSwitcher } from './pockets/PocketSwitcher';

export function Home() {
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { month, setMonth, openExpenseSheet } = useUi();
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
        <PocketDeck onOpenMenu={() => setSwitcher(true)} onMore={() => setSwitcher(true)} />
        <div className="action-pills">
          <button className="action-pill primary press" onClick={() => openExpenseSheet({ mode: 'new' })}>
            <Icon name="plus" weight="bold" size={16} />
            Add expense
          </button>
          <button className="action-pill press" onClick={() => navigate('/settings', { state: { sheet: 'export' } })}>
            <Icon name="download-simple" size={17} />
            Export
          </button>
          <button className="action-pill press" onClick={() => navigate('/settings/tags')}>
            <Icon name="tag" size={17} />
            Tags
          </button>
        </div>
        <MonthHeader month={month} onChange={setMonth} />
        <CurrencyCards pocket={pocket} month={month} expenses={expenses} prevExpenses={prevExpenses} empty={empty} selected={cur} onSelect={setCur} />
        {loading ? (
          <>
            <div className="skel skel-card" />
            <ListSkeleton />
          </>
        ) : (
          <>
            <WeeklySpend expenses={expenses} code={cur} month={month} empty={empty} />
            {!empty && <WhereItWent expenses={expenses} code={cur} onSeeAll={() => navigate('/transactions', { state: { currency: cur } })} />}
            {!empty && pocket.type === 'shared' && <ByPerson expenses={expenses} pocket={pocket} />}
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
        {pocket.type === 'shared' ? (
          <button className="top-people press" aria-label="People in this Pocket" onClick={() => navigate('/settings/people')}>
            <AvatarStack initials={memberInitials(pocket)} size={36} ring="var(--page)" />
          </button>
        ) : (
          <div className="spacer-52" />
        )}
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

/**
 * Month totals per currency. One currency: a single large card. Several: side by side, two to a
 * row, and tapping one picks the currency the charts below show.
 */
function CurrencyCards({
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
  // Optional extra card: everything converted into one currency (Settings › Combined total).
  const combinedCode = pocket.currencies.length > 1 ? combinedFor(pocket.id) : null;
  const many = pocket.currencies.length > 1;
  // Amounts shrink with their length so they always fit the card; side-by-side cards share one size.
  const digits = Math.max(...pocket.currencies.map((code) => formatNumber(empty ? 0 : totalIn(expenses, code), code, 0).length));
  const fit = digits >= 12 ? ' fit-5' : digits >= 10 ? ' fit-4' : digits >= 8 ? ' fit-3' : digits >= 6 ? ' fit-2' : '';

  const card = (code: CurrencyCode) => {
    const c = currency(code);
    const total = totalIn(expenses, code);
    const t = trend(total, totalIn(prevExpenses, code));
    const budget = pocket.budgets[code];
    const left = budget ? budget - total : 0;
    // Totals always show the currency's decimals (dimmed), so £ and ₹ cards read the same way.
    const amount = formatNumber(empty ? 0 : total, code, c.dp);
    const trendChip =
      !empty && t !== null && t !== 0 ? (
        <div className="trend" style={{ color: t < 0 ? 'var(--good)' : 'var(--bad)' }}>
          <Icon name={t < 0 ? 'arrow-down' : 'arrow-up'} weight="bold" size={12} />
          {Math.abs(t)}% vs {monthShort(addMonths(month, -1))}
        </div>
      ) : null;
    const budgetBar = budget ? (
      <div className="budget">
        <div className="budget-track">
          <div className="budget-fill" style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
        </div>
        <span className="budget-text">
          {many
            ? `${formatWhole(Math.abs(left), code)} ${left >= 0 ? 'left' : 'over'}`
            : empty
              ? `${formatWhole(0, code)} of ${formatWhole(budget, code)} budget`
              : `${formatWholeDown(total, code)} of ${formatWhole(budget, code)} · ${formatWhole(Math.abs(left), code)} ${left >= 0 ? 'left' : 'over'}`}
        </span>
      </div>
    ) : null;

    if (!many) {
      return (
        <div key={code} className="cur-card">
          <div className="cur-card-head">
            <span className="cur-card-label">
              {c.plural} · {monthName(month)}
            </span>
            {trendChip}
          </div>
          <div className="cur-card-amount num">
            <span className="cur-card-sym">{c.symbol}</span>
            <Amount className={`cur-card-num${fit}`} value={amount} />
          </div>
          {budgetBar}
        </div>
      );
    }
    const on = code === selected;
    return (
      <button
        key={code}
        className={`cur-card compact press${on ? ' on' : ''}`}
        aria-pressed={on}
        aria-label={`${c.plural}: ${c.symbol}${amount}. Show ${c.plural.toLowerCase()} below`}
        onClick={() => onSelect(code)}
      >
        <span className="cur-card-label">{c.plural}</span>
        <div className="cur-card-amount num">
          <span className="cur-card-sym">{c.symbol}</span>
          {/* Long amounts get a smaller size so they fit half the width. */}
          <Amount className={`cur-card-num${fit}`} value={amount} />
        </div>
        {trendChip}
        {budgetBar}
      </button>
    );
  };

  return (
    <div className={many ? 'cards-grid' : 'cards-single'}>
      {pocket.currencies.map(card)}
      {combinedCode && <CombinedCard code={combinedCode} month={month} expenses={expenses} empty={empty} />}
    </div>
  );
}

/** A formatted amount with its decimals dimmed: 12<dim>.50</dim>. */
function Amount({ className, value }: { className: string; value: string }) {
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
                <span className="weekly-val" style={{ color: w.current ? 'var(--text)' : undefined }}>
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

/**
 * Who paid this month, on one card whichever currency card is showing. Each person gets a line per
 * currency they paid in, with its own bar against everyone's total in that currency. Never converted.
 */
function ByPerson({ expenses, pocket }: { expenses: Expense[]; pocket: PocketWithMembers }) {
  const { user } = useSession();
  // The Pocket's currencies first, then any others that turn up.
  const codes = useMemo(() => {
    const used = new Set(expenses.map((e) => e.currency));
    return [...pocket.currencies.filter((c) => used.has(c)), ...[...used].filter((c) => !pocket.currencies.includes(c))] as CurrencyCode[];
  }, [expenses, pocket.currencies]);
  const people = useMemo(() => {
    const rows = new Map<string, { initials: string; name: string; totals: Partial<Record<CurrencyCode, number>> }>();
    for (const m of pocket.members) {
      rows.set(m.uid, { initials: m.initials, name: firstName(m.name) + (m.uid === user?.uid ? ' (you)' : ''), totals: {} });
    }
    for (const e of expenses) {
      // People who left keep their initials on their expenses.
      const p = rows.get(e.byUid) ?? { initials: e.byInitials, name: e.byInitials, totals: {} };
      p.totals[e.currency] = (p.totals[e.currency] ?? 0) + e.amountMinor;
      rows.set(e.byUid, p);
    }
    // Biggest spender first, comparing in the Pocket's main currency, then the next.
    return [...rows.entries()].sort((a, b) => {
      for (const c of codes) {
        const d = (b[1].totals[c] ?? 0) - (a[1].totals[c] ?? 0);
        if (d) return d;
      }
      return 0;
    });
  }, [expenses, codes, pocket.members, user?.uid]);
  const totals = useMemo(() => Object.fromEntries(codes.map((c) => [c, totalIn(expenses, c)])) as Record<CurrencyCode, number>, [expenses, codes]);
  return (
    <div className="card by-person">
      <span className="card-title">Paid by</span>
      {people.map(([uid, p]) => {
        const paid = codes.filter((c) => p.totals[c]);
        // Someone who hasn't paid anything yet shows 0 in the main currency.
        const lines = paid.length ? paid : codes.slice(0, 1);
        return (
          <div key={uid} className="person-row">
            <Avatar initials={p.initials} size={42} />
            <div className="person-body">
              <span className="person-name">{p.name}</span>
              {lines.map((c) => (
                <div key={c} className="person-line">
                  <div className="person-track">
                    <div className="person-fill" style={{ width: totals[c] ? `${((p.totals[c] ?? 0) / totals[c]) * 100}%` : 0 }} />
                  </div>
                  <span className="person-amt num">{formatMoney(p.totals[c] ?? 0, c)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
