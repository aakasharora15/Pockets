import { useState } from 'react';
import { BackButton } from '../../components/Chrome';
import { categoryOf } from '../../components/ExpenseRow';
import { ListSkeleton } from '../../components/Skeletons';
import { ActionSheet } from '../../components/Sheet';
import { stopRecurring, useRecurring } from '../../data/recurring';
import type { Recurring as Repeat } from '../../data/types';
import { dayMonth } from '../../lib/dates';
import { Icon } from '../../lib/icons';
import { formatMoney } from '../../lib/money';
import { ordinal } from '../../lib/recurring';
import { useCurrentPocket, usePockets } from '../../state/pockets';
import { useUi } from '../../state/ui';

/** Settings › Repeating expenses: what's logged each month, and when next. */
export function Recurring() {
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { showToast } = useUi();
  const { list, loading } = useRecurring(pocket.id);
  const [stopping, setStopping] = useState<Repeat | null>(null);

  const stop = async (r: Repeat) => {
    setStopping(null);
    try {
      await stopRecurring(pocket.id, r.id);
      showToast(`${r.name} won't repeat`);
    } catch {
      showToast("Couldn't stop it. Try again");
    }
  };

  return (
    <div className="screen">
      <div className="scroll sub-scroll">
        <div className="page-head">
          <span className="page-title">Repeating</span>
          <span className="page-sub">Logged automatically each month, such as rent or subscriptions.</span>
        </div>
        {loading ? (
          <ListSkeleton rows={3} />
        ) : list.length === 0 ? (
          <div className="empty-note">Nothing repeats yet. Turn on Repeat monthly when you add an expense.</div>
        ) : (
          <div className="list-card">
            {list.map((r, i) => {
              const cat = categoryOf(categories, r.categoryId);
              return (
                <button key={r.id} className="ex-row press-row" onClick={() => setStopping(r)}>
                  <div className="cat-tile">
                    <Icon name={cat?.icon ?? 'dots-three'} />
                  </div>
                  <div className={`ex-body${i ? ' sep' : ''}`}>
                    <div className="ex-text">
                      <span className="ex-name">{r.name}</span>
                      <div className="ex-meta">
                        <span className="ex-meta-text">
                          Next {dayMonth(r.nextDate)} · {ordinal(r.day)} monthly
                        </span>
                      </div>
                    </div>
                    <span className="ex-amt num">{formatMoney(r.amountMinor, r.currency)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="footnote">
          Whoever opens Spendr first on the day logs it, once. To change the amount or name, edit any expense it logged. Repeats need a connection to be logged; if you're offline they're added when you're back.
        </div>
      </div>
      <div className="fade-top" />
      <BackButton to="/settings" />
      {stopping && (
        <ActionSheet
          title={`Stop repeating ${stopping.name}?`}
          message="Expenses it already logged stay."
          actions={[{ label: 'Stop repeating', destructive: true, onClick: () => stop(stopping) }]}
          onCancel={() => setStopping(null)}
        />
      )}
    </div>
  );
}
