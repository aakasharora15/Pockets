import { useEffect, useRef, useState } from 'react';
import type { Category, Expense } from '../data/types';
import { OTHER_ID } from '../lib/categories';
import { longDate } from '../lib/dates';
import { Icon } from '../lib/icons';
import { formatMoney } from '../lib/money';

export function categoryOf(categories: Category[], id: string): Category | undefined {
  return categories.find((c) => c.id === id) ?? categories.find((c) => c.id === OTHER_ID);
}

interface RowProps {
  expense: Expense;
  categories: Category[];
  first: boolean;
  onOpen: () => void;
  /** Hide the tag chip (on the tag's own page). */
  hideTag?: boolean;
}

/** One expense row: neutral icon tile, name, date, amount (design rows in Recent / Transactions / Calendar). */
export function ExpenseRow({ expense, categories, first, onOpen, hideTag }: RowProps) {
  const cat = categoryOf(categories, expense.categoryId);
  const waiting = useLasting(!!expense.pending, 1500);
  return (
    <button className="ex-row press-row" onClick={onOpen}>
      <div className="cat-tile">
        <Icon name={cat?.icon ?? 'dots-three'} />
      </div>
      <div className={`ex-body${first ? '' : ' sep'}`}>
        <div className="ex-text">
          <span className="ex-name">{expense.name || cat?.name || 'Expense'}</span>
          <div className="ex-meta">
            <span>{longDate(expense.date)}</span>
            {waiting ? (
              <span className="ex-sync">
                <Icon name="cloud-arrow-up" weight="bold" size={13} />
                Waiting to sync
              </span>
            ) : (
              <>
                {expense.recurringId && <Icon name="repeat" size={13} label="Repeats monthly" />}
                {expense.receipt && <Icon name="receipt" size={13} label="Receipt photo" />}
                {expense.tag && !hideTag && <span className="ex-tag">{expense.tag}</span>}
              </>
            )}
          </div>
        </div>
        <span className="ex-amt num">{formatMoney(expense.amountMinor, expense.currency)}</span>
      </div>
    </button>
  );
}

/** True once `on` has stayed true for `ms` (so a normal save doesn't flash "Waiting to sync"). */
function useLasting(on: boolean, ms: number): boolean {
  const [lasting, setLasting] = useState(false);
  useEffect(() => {
    if (!on) {
      setLasting(false);
      return;
    }
    const t = window.setTimeout(() => setLasting(true), navigator.onLine ? ms : 0);
    return () => window.clearTimeout(t);
  }, [on, ms]);
  return lasting;
}

const ACTIONS_W = 148;

/** Transactions row: swipe left to reveal Edit and Delete. */
export function SwipeRow({
  open,
  onOpenChange,
  onEdit,
  onDelete,
  ...row
}: RowProps & { open: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const moved = useRef(false);
  const base = open ? -ACTIONS_W : 0;
  const x = drag ?? base;

  return (
    <div className={`ex-swipe${row.first ? '' : ' sep-swipe'}`}>
      <div className="ex-actions" aria-hidden={!open}>
        <button className="ex-action edit" onClick={onEdit} tabIndex={open ? 0 : -1}>
          <Icon name="pencil-simple" size={20} />
          Edit
        </button>
        <button className="ex-action del" onClick={onDelete} tabIndex={open ? 0 : -1}>
          <Icon name="trash" size={20} />
          Delete
        </button>
      </div>
      <div
        style={{ transform: `translateX(${x}px)`, transition: drag === null ? undefined : 'none', width: '100%' }}
        className="ex-swipe-inner"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, base };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (!moved.current && Math.abs(dx) < 8) return;
          if (!moved.current && Math.abs(e.clientY - s.y) > Math.abs(dx)) {
            start.current = null;
            return;
          }
          moved.current = true;
          setDrag(Math.max(-ACTIONS_W - 30, Math.min(0, s.base + dx)));
        }}
        onPointerUp={() => {
          if (moved.current && drag !== null) onOpenChange(drag < -ACTIONS_W / 2);
          start.current = null;
          setDrag(null);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(null);
        }}
        onClickCapture={(e) => {
          if (moved.current) {
            e.stopPropagation();
            moved.current = false;
          } else if (open) {
            e.stopPropagation();
            onOpenChange(false);
          }
        }}
      >
        <ExpenseRow {...row} first />
      </div>
    </div>
  );
}
