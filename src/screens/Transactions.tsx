import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Fades } from '../components/Chrome';
import { categoryOf, SwipeRow, useSwipeRows } from '../components/ExpenseRow';
import { ListSkeleton } from '../components/Skeletons';
import type { Expense } from '../data/types';
import { useExpenses } from '../data/useExpenses';
import { currency, type CurrencyCode } from '../lib/currencies';
import { groupLabel, monthYear } from '../lib/dates';
import { firstName } from '../lib/initials';
import { formatMoney } from '../lib/money';
import { Icon } from '../lib/icons';
import { useCurrentPocket, usePockets } from '../state/pockets';
import { useUi } from '../state/ui';

export function Transactions() {
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { month } = useUi();
  const location = useLocation();
  const nav = (location.state ?? {}) as { search?: boolean; currency?: CurrencyCode };
  const { expenses, loading, error } = useExpenses(pocket.id, month);
  const [search, setSearch] = useState('');
  const [person, setPerson] = useState<string | null>(null);
  const [cur, setCur] = useState<CurrencyCode | null>(nav.currency ?? null);
  const [showFilters, setShowFilters] = useState(true);
  const swipe = useSwipeRows(pocket.id);
  const searchRef = useRef<HTMLInputElement>(null);
  const shared = pocket.type === 'shared';
  // Rows sit under their day, so they show the category (and who paid, in a shared Pocket) instead.
  const rowSub = (e: Expense) => {
    const cat = categoryOf(categories, e.categoryId)?.name ?? 'Other';
    const payer = shared ? pocket.members.find((m) => m.uid === e.byUid) : undefined;
    return payer ? `${cat} · ${firstName(payer.name)}` : cat;
  };
  /** "£22.65 · ₹4,500": the day's spending in each currency. */
  const dayTotal = (items: Expense[]) => {
    const sums = new Map<CurrencyCode, number>();
    for (const e of items) sums.set(e.currency, (sums.get(e.currency) ?? 0) + e.amountMinor);
    return [...sums.entries()].map(([c, v]) => formatMoney(v, c)).join(' · ');
  };

  useEffect(() => {
    if (nav.search) searchRef.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPerson(null);
    if (cur && !pocket.currencies.includes(cur)) setCur(null);
  }, [pocket.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (person && e.byUid !== person) return false;
      if (cur && e.currency !== cur) return false;
      if (!q) return true;
      const cat = categoryOf(categories, e.categoryId)?.name ?? '';
      return e.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q);
    });
  }, [expenses, person, cur, search, categories]);

  const groups = useMemo(() => {
    const out: { day: string; items: Expense[] }[] = [];
    for (const e of filtered) {
      const last = out[out.length - 1];
      if (last && last.day === e.date) last.items.push(e);
      else out.push({ day: e.date, items: [e] });
    }
    return out;
  }, [filtered]);

  return (
    <div className="screen">
      <div className="scroll tx-scroll">
        <div className="tx-head">
          <span className="page-title">Transactions</span>
          <span className="tx-month">{monthYear(month)}</span>
        </div>
        <label className="tx-search glass">
          <Icon name="magnifying-glass" size={18} color="var(--text)" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search expenses"
            aria-label="Search expenses"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {showFilters && (
          <div className="tx-chips">
            {shared && (
              <>
                <button className={`chip press${person === null ? ' on' : ''}`} onClick={() => setPerson(null)}>
                  Everyone
                </button>
                {pocket.members.map((m) => (
                  <button key={m.uid} className={`chip press${person === m.uid ? ' on' : ''}`} onClick={() => setPerson(m.uid)} aria-label={m.name}>
                    {firstName(m.name)}
                  </button>
                ))}
                <div className="chip-divider" />
              </>
            )}
            <button className={`chip press${cur === null ? ' on' : ''}`} onClick={() => setCur(null)}>
              All
            </button>
            {pocket.currencies.map((c) => (
              <button key={c} className={`chip press${cur === c ? ' on' : ''}`} onClick={() => setCur(c)} aria-label={currency(c).name}>
                {currency(c).symbol}
              </button>
            ))}
          </div>
        )}
        {loading ? (
          <ListSkeleton rows={6} />
        ) : error ? (
          <div className="empty-note">Couldn't load expenses. Check your connection.</div>
        ) : groups.length === 0 ? (
          <div className="empty-note">No expenses match these filters.</div>
        ) : (
          groups.map((g) => (
            <div key={g.day} className="tx-group">
              <div className="tx-day">
                <span>{groupLabel(g.day)}</span>
                <span className="tx-day-total num">{dayTotal(g.items)}</span>
              </div>
              <div className="list-card">
                {g.items.map((e, i) => (
                  <SwipeRow key={e.id} expense={e} categories={categories} first={i === 0} sub={rowSub(e)} {...swipe(e)} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      <Fades />
      <div className="top-bar">
        <button className="circle-52 glass press" aria-label="Search expenses" onClick={() => searchRef.current?.focus()}>
          <Icon name="magnifying-glass" size={22} />
        </button>
        <button
          className="circle-44 glass press"
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          aria-pressed={showFilters}
          onClick={() => setShowFilters((s) => !s)}
        >
          <Icon name="sliders-horizontal" />
        </button>
      </div>
    </div>
  );
}
