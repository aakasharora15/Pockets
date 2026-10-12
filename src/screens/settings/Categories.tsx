import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/Chrome';
import { ActionSheet, Sheet, SheetHeader } from '../../components/Sheet';
import { addCategory, deleteCategory, reorderCategories } from '../../data/categories';
import { countInCategory } from '../../data/expenses';
import type { Category } from '../../data/types';
import { OTHER_ID } from '../../lib/categories';
import { CATEGORY_ICON_CHOICES, Icon } from '../../lib/icons';
import { useCurrentPocket, usePockets } from '../../state/pockets';
import { useUi } from '../../state/ui';

const ROW_H = 52;

export function Categories() {
  const pocket = useCurrentPocket();
  const { categories } = usePockets();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<{ cat: Category; count: number } | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const drag = useRef<{ id: string; startY: number; startIndex: number } | null>(null);
  const [dragY, setDragY] = useState(0);

  const ids = categories.map((c) => c.id).join(',');
  useEffect(() => {
    let live = true;
    Promise.all(categories.map(async (c) => [c.id, await countInCategory(pocket.id, c.id)] as const))
      .then((pairs) => live && setCounts(Object.fromEntries(pairs)))
      .catch(() => {
        /* offline: counts stay hidden */
      });
    return () => {
      live = false;
    };
  }, [pocket.id, ids]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = order ? order.map((id) => categories.find((c) => c.id === id)).filter((c): c is Category => !!c) : categories;
  const people = pocket.type === 'personal' ? 1 : pocket.members.length;

  const remove = async (cat: Category) => {
    let count = counts[cat.id];
    if (count === undefined) {
      try {
        count = await countInCategory(pocket.id, cat.id);
      } catch {
        showToast("You need to be online to delete a category");
        return;
      }
    }
    if (count > 0) setConfirm({ cat, count });
    else await doDelete(cat, false);
  };

  const doDelete = async (cat: Category, hasExpenses: boolean) => {
    setConfirm(null);
    try {
      await deleteCategory(pocket.id, cat.id, hasExpenses);
      showToast(`${cat.name} deleted`);
    } catch {
      showToast("Couldn't delete. Try again");
    }
  };

  const onHandleDown = (e: React.PointerEvent, id: string) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const current = list.map((c) => c.id);
    setOrder(current);
    drag.current = { id, startY: e.clientY, startIndex: current.indexOf(id) };
    setDragY(0);
  };

  const onHandleMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !order) return;
    const dy = e.clientY - d.startY;
    const target = Math.max(0, Math.min(order.length - 1, d.startIndex + Math.round(dy / ROW_H)));
    const from = order.indexOf(d.id);
    if (target !== from) {
      const next = [...order];
      next.splice(from, 1);
      next.splice(target, 0, d.id);
      setOrder(next);
    }
    setDragY(dy - (target - d.startIndex) * ROW_H);
  };

  const onHandleUp = async () => {
    const d = drag.current;
    drag.current = null;
    setDragY(0);
    if (!d || !order) return;
    const changed = order.join(',') !== categories.map((c) => c.id).join(',');
    if (changed) {
      try {
        await reorderCategories(pocket.id, order);
      } catch {
        showToast("Couldn't save the order. Try again");
      }
    }
    setOrder(null);
  };

  return (
    <div className="screen">
      <div className="scroll sub-scroll">
        <div className="page-head">
          <span className="page-title">Categories</span>
          <span className="page-sub">Home, budgets and your monthly recap are grouped by these.</span>
        </div>
        <div className="group-card">
          <button className="cur-row press-row add-row" onClick={() => setAdding(true)}>
            <div className="add-tile">
              <Icon name="plus" />
            </div>
            <span className="add-label">Add category</span>
          </button>
        </div>
        <div className="group-card">
          {list.map((c, i) => {
            const isOther = c.id === OTHER_ID;
            const dragging = drag.current?.id === c.id;
            return (
              <div key={c.id} className={`cat-row${dragging ? ' dragging' : ''}`} style={dragging ? { transform: `translateY(${dragY}px)` } : undefined}>
                <div className="cat-row-lead">
                  {isOther ? (
                    <Icon name="lock-simple" size={16} color="rgba(235, 240, 250, 0.4)" label="Can't delete" />
                  ) : (
                    <button className="press" aria-label={`Delete ${c.name}`} onClick={() => remove(c)}>
                      <Icon name="minus-circle" weight="fill" size={22} color="var(--destructive)" />
                    </button>
                  )}
                </div>
                <div className="symbol-tile cat-row-tile">
                  <Icon name={c.icon} />
                </div>
                <div className={`cur-body${i ? ' sep' : ''}`}>
                  <span className="cat-row-name">{c.name}</span>
                  {counts[c.id] !== undefined && (
                    <span className="cur-code">
                      {counts[c.id]} {counts[c.id] === 1 ? 'expense' : 'expenses'}
                    </span>
                  )}
                  <span
                    className="drag-handle"
                    aria-label={`Reorder ${c.name}`}
                    onPointerDown={(e) => onHandleDown(e, c.id)}
                    onPointerMove={onHandleMove}
                    onPointerUp={onHandleUp}
                    onPointerCancel={onHandleUp}
                  >
                    <Icon name="list" size={18} color="rgba(235, 240, 250, 0.4)" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="footnote">
          Deleting a category moves its expenses to Other, after you confirm. Empty categories delete straight away. Other can't be deleted.
          {people === 2 ? ' Changes apply to both phones.' : people > 2 ? ' Changes apply to everyone in this Pocket.' : ''}
        </div>
      </div>
      <div className="fade-top" />
      <BackButton to="/settings" />
      <button className="done-btn glass press" onClick={() => navigate('/settings')}>
        Done
      </button>
      {confirm && (
        <ActionSheet
          title={`Delete ${confirm.cat.name}?`}
          message={`${confirm.count} ${confirm.count === 1 ? 'expense' : 'expenses'} will move to Other. This can't be undone.`}
          actions={[{ label: 'Delete category', destructive: true, onClick: () => doDelete(confirm.cat, true) }]}
          onCancel={() => setConfirm(null)}
        />
      )}
      {adding && <NewCategorySheet existing={categories} onClose={() => setAdding(false)} />}
    </div>
  );
}

function NewCategorySheet({ existing, onClose }: { existing: Category[]; onClose: () => void }) {
  const pocket = useCurrentPocket();
  const { showToast } = useUi();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICON_CHOICES[0]);
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length > 0 && !busy;

  const add = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await addCategory(pocket.id, existing, name, icon);
      showToast(`${name.trim()} added`);
      onClose();
    } catch {
      showToast("Couldn't add. Try again");
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} label="New category">
      <SheetHeader title="New category" onCancel={onClose} action={{ label: 'Add', onClick: add, disabled: !valid }} />
      <div className="newcat-preview">
        <Icon name={icon} />
      </div>
      <label className="field newcat-field">
        <input autoFocus placeholder="Name" aria-label="Category name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <span className="field-label sheet-label">Icon</span>
      <div className="icon-grid" role="radiogroup" aria-label="Icon">
        {CATEGORY_ICON_CHOICES.map((n) => (
          <button key={n} role="radio" aria-checked={icon === n} aria-label={n.replace(/-/g, ' ')} className={`icon-choice press${icon === n ? ' on' : ''}`} onClick={() => setIcon(n)}>
            <Icon name={n} />
          </button>
        ))}
      </div>
      <button className="primary-btn sheet-bottom press" disabled={!valid} onClick={add}>
        Add category
      </button>
    </Sheet>
  );
}
