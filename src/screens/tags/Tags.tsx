import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/Chrome';
import { countTagged } from '../../data/tags';
import { Icon } from '../../lib/icons';
import { useCurrentPocket } from '../../state/pockets';

export const tagPath = (tag: string) => `/settings/tags/${encodeURIComponent(tag)}`;

/** Settings › Tags: the Pocket's tags with how many expenses each has. */
export function Tags() {
  const pocket = useCurrentPocket();
  const navigate = useNavigate();
  const tags = pocket.tags ?? [];
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let live = true;
    Promise.all(tags.map(async (t) => [t, await countTagged(pocket.id, t)] as const))
      .then((pairs) => live && setCounts(Object.fromEntries(pairs)))
      .catch(() => {
        /* offline: counts stay hidden */
      });
    return () => {
      live = false;
    };
  }, [pocket.id, tags.join('\n')]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen">
      <div className="scroll sub-scroll">
        <div className="page-head">
          <span className="page-title">Tags</span>
          <span className="page-sub">Group expenses across months and currencies, such as a trip.</span>
        </div>
        {tags.length === 0 ? (
          <div className="empty-note">No tags yet. Add one to an expense from its Add tag row.</div>
        ) : (
          <div className="group-card">
            {[...tags].reverse().map((t, i) => (
              <button key={t} className="cur-row press-row" onClick={() => navigate(tagPath(t))}>
                <div className="symbol-tile">
                  <Icon name="tag" />
                </div>
                <div className={`cur-body${i ? ' sep' : ''}`}>
                  <span className="cur-name">{t}</span>
                  {counts[t] !== undefined && (
                    <span className="cur-code">
                      {counts[t]} {counts[t] === 1 ? 'expense' : 'expenses'}
                    </span>
                  )}
                  <Icon name="caret-right" weight="bold" size={13} color="#5A5A5E" />
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="footnote">Tags belong to this Pocket. Everyone in it can add and use them.</div>
      </div>
      <div className="fade-top" />
      <BackButton to="/settings" />
    </div>
  );
}
