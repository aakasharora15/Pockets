import { useMemo } from 'react';
import { Avatar } from '../../components/Avatar';
import type { Expense, PocketWithMembers } from '../../data/types';
import type { CurrencyCode } from '../../lib/currencies';
import { firstName } from '../../lib/initials';
import { formatMoney } from '../../lib/money';
import { totalIn } from '../../lib/stats';
import { useSession } from '../../state/session';

/**
 * Who paid this month, on one card whichever currency card is showing. Each person gets a line per
 * currency they paid in, with its own bar against everyone's total in that currency. Never converted.
 */
export function ByPerson({ expenses, pocket }: { expenses: Expense[]; pocket: PocketWithMembers }) {
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
