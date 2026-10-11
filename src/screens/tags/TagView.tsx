import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../../components/Chrome';
import { categoryOf, ExpenseRow } from '../../components/ExpenseRow';
import { ListSkeleton } from '../../components/Skeletons';
import { ActionSheet } from '../../components/Sheet';
import { useCombined } from '../../data/useCombined';
import { useTagExpenses } from '../../data/useExpenses';
import { deleteTag } from '../../data/tags';
import { currency, type CurrencyCode } from '../../lib/currencies';
import { expensesToCsv, shareOrDownload, slug } from '../../lib/csv';
import { Icon } from '../../lib/icons';
import { formatMoney, formatNumber } from '../../lib/money';
import { byCategory, totalIn } from '../../lib/stats';
import { useCurrentPocket, usePockets } from '../../state/pockets';
import { useUi } from '../../state/ui';

/** 22 · Trip / tag view: totals per currency, by category, and every expense with the tag. */
export function TagView() {
  const { tag: raw = '' } = useParams();
  const tag = decodeURIComponent(raw);
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { openExpenseSheet, showToast, combinedFor } = useUi();
  const navigate = useNavigate();
  const { expenses, loading } = useTagExpenses(pocket.id, tag);
  const [confirm, setConfirm] = useState(false);

  // Currencies in use, the Pocket's order first.
  const codes = useMemo(() => {
    const used = new Set(expenses.map((e) => e.currency));
    return [...pocket.currencies.filter((c) => used.has(c)), ...[...used].filter((c) => !pocket.currencies.includes(c))] as CurrencyCode[];
  }, [expenses, pocket.currencies]);

  const combinedCode = codes.length > 1 ? combinedFor(pocket.id) : null;
  const combined = useCombined(expenses, combinedCode);

  // By category: one stacked bar per currency, and a legend with each category's totals.
  const legend = useMemo(() => {
    const m = new Map<string, Partial<Record<CurrencyCode, number>>>();
    for (const code of codes) {
      for (const r of byCategory(expenses, code)) {
        const id = categoryOf(categories, r.categoryId)?.id ?? 'other';
        const row = m.get(id) ?? {};
        row[code] = (row[code] ?? 0) + r.total;
        m.set(id, row);
      }
    }
    return [...m.entries()];
  }, [expenses, codes, categories]);

  const exportTag = async () => {
    try {
      await shareOrDownload(`spendr-${slug(pocket.name)}-${slug(tag, 'tag')}.csv`, expensesToCsv(expenses, categories, pocket.members));
    } catch {
      showToast("Couldn't export. Try again");
    }
  };

  const remove = async () => {
    setConfirm(false);
    try {
      await deleteTag(pocket.id, tag);
      showToast(`${tag} removed`);
      navigate('/settings/tags');
    } catch {
      showToast(navigator.onLine ? "Couldn't remove. Try again" : 'Removing a tag needs a connection');
    }
  };

  return (
    <div className="screen">
      <div className="scroll sub-scroll tag-scroll">
        <div className="page-head">
          <span className="page-title tag-title">{tag}</span>
          <span className="page-sub">
            Tag · {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
          </span>
        </div>
        {loading ? (
          <ListSkeleton rows={4} />
        ) : expenses.length === 0 ? (
          <div className="empty-note">No expenses with this tag.</div>
        ) : (
          <>
            <div className="tag-totals">
              {codes.map((code) => (
                <div key={code} className="card tag-total">
                  <span className="tag-total-label">In {currency(code).plural.toLowerCase()}</span>
                  <div className="tag-total-amount num">
                    <span className="tag-total-sym">{currency(code).symbol}</span>
                    <span className="tag-total-num">{formatNumber(totalIn(expenses, code), code, code === 'INR' ? 0 : undefined)}</span>
                  </div>
                </div>
              ))}
            </div>
            {combinedCode && (
              <div className="tag-combined">
                {combined.error
                  ? 'Combined total needs a connection for exchange rates'
                  : combined.loading
                    ? 'Converting'
                    : `≈ ${formatMoney(combined.total, combinedCode)} in all, each at its own day's rate${combined.missing ? ` (${combined.missing} not included yet)` : ''}`}
              </div>
            )}
            <div className="card tag-cats">
              <span className="card-title">By category</span>
              {codes.map((code) => {
                const rows = byCategory(expenses, code);
                return (
                  <div key={code} className="tag-bar-row">
                    <span className="tag-bar-sym">{currency(code).symbol}</span>
                    <div className="tag-bar">
                      {rows.map((r) => (
                        <div key={r.categoryId} style={{ flex: r.total, background: categoryOf(categories, r.categoryId)?.colour ?? '#9AA0AA' }} />
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="tag-legend">
                {legend.map(([cid, totals]) => {
                  const cat = categoryOf(categories, cid);
                  return (
                    <span key={cid} className="tag-legend-item">
                      <span className="tag-dot" style={{ background: cat?.colour ?? '#9AA0AA' }} />
                      {cat?.name ?? 'Other'}{' '}
                      {codes
                        .filter((c) => totals[c])
                        .map((c) => formatMoney(totals[c]!, c))
                        .join(' · ')}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="list-card">
              {expenses.map((e, i) => (
                <ExpenseRow key={e.id} expense={e} categories={categories} first={i === 0} hideTag onOpen={() => openExpenseSheet({ mode: 'edit', expense: e, pocketId: pocket.id })} />
              ))}
            </div>
            <button className="delete-link press" onClick={() => setConfirm(true)}>
              Remove tag
            </button>
          </>
        )}
      </div>
      <div className="fade-top" />
      <BackButton to="/settings/tags" />
      {expenses.length > 0 && (
        <button className="circle-44 glass press top-right" aria-label="Export CSV" onClick={exportTag}>
          <Icon name="export" />
        </button>
      )}
      {confirm && (
        <ActionSheet
          title={`Remove ${tag}?`}
          message="The tag comes off its expenses. The expenses stay."
          actions={[{ label: 'Remove tag', destructive: true, onClick: remove }]}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}
