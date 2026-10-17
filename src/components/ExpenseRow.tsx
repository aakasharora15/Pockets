import { useEffect, useRef, useState } from 'react';
import { deleteExpense } from '../data/expenses';
import type { Category, Expense } from '../data/types';
import { OTHER_ID } from '../lib/categories';
import { longDate } from '../lib/dates';
import { Icon } from '../lib/icons';
import { formatMoney } from '../lib/money';
import { useUi } from '../state/ui';

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
  /** Shown under the name instead of the date, where the list is already grouped by day. */
  sub?: string;
}

/** One expense row: icon tile in its category's colour, name, date (or `sub`), amount. */
export function ExpenseRow({ expense, categories, first, onOpen, hideTag, sub }: RowProps) {
  const cat = categoryOf(categories, expense.categoryId);
  const waiting = useLasting(!!expense.pending, 1500);
  return (
    <button className="ex-row press-row" onClick={onOpen}>
      <div className="cat-tile tinted" style={{ '--cat': cat?.colour ?? '#9AA0AA' } as React.CSSProperties}>
        <Icon name={cat?.icon ?? 'dots-three'} />
      </div>
      <div className={`ex-body${first ? '' : ' sep'}`}>
        <div className="ex-text">
          <span className="ex-name">{expense.name || cat?.name || 'Expense'}</span>
          <div className="ex-meta">
            <span>{sub ?? longDate(expense.date)}</span>
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
/** Swiping past this share of the row deletes it without tapping Delete, as in iOS Mail. */
const FULL_SWIPE = 0.6;

/** Expense row with swipe left to reveal Edit and Delete, or a long swipe to delete. */
export function SwipeRow({
  open,
  onOpenChange,
  onEdit,
  onDelete,
  ...row
}: RowProps & { open: boolean; onOpenChange: (open: boolean) => void; onEdit: () => void; onDelete: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; base: number } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const moved = useRef(false);
  const width = () => box.current?.clientWidth ?? 350;
  const base = open ? -ACTIONS_W : 0;
  const x = removing ? -width() : (drag ?? base);
  const full = removing || (drag !== null && drag < -width() * FULL_SWIPE);

  return (
    <div ref={box} data-swipe-id={row.expense.id} className={`ex-swipe${row.first ? '' : ' sep-swipe'}`}>
      <div className={`ex-actions${full ? ' full' : ''}`} aria-hidden={!open} style={{ width: Math.max(ACTIONS_W, -x) }}>
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
          setDrag(Math.max(-width(), Math.min(0, s.base + dx)));
        }}
        onPointerUp={() => {
          if (moved.current && drag !== null) {
            if (drag < -width() * FULL_SWIPE) {
              setRemoving(true);
              window.setTimeout(onDelete, 220);
            } else onOpenChange(drag < -ACTIONS_W / 2);
          }
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

/**
 * Swipe actions for a list of expenses: one row open at a time, closed by tapping anywhere else;
 * Edit opens the sheet, Delete (or a long swipe) deletes straight away.
 */
export function useSwipeRows(pocketId: string) {
  const { openExpenseSheet, showToast } = useUi();
  const [openRow, setOpenRow] = useState<string | null>(null);

  useEffect(() => {
    if (!openRow) return;
    const close = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t?.closest?.(`[data-swipe-id="${openRow}"]`)) setOpenRow(null);
    };
    document.addEventListener('pointerdown', close, true);
    return () => document.removeEventListener('pointerdown', close, true);
  }, [openRow]);

  return (e: Expense) => ({
    open: openRow === e.id,
    onOpenChange: (o: boolean) => setOpenRow(o ? e.id : null),
    onOpen: () => openExpenseSheet({ mode: 'edit', expense: e, pocketId }),
    onEdit: () => {
      setOpenRow(null);
      openExpenseSheet({ mode: 'edit', expense: e, pocketId });
    },
    onDelete: async () => {
      setOpenRow(null);
      try {
        await deleteExpense(pocketId, e.id, !!e.receipt);
        showToast('Expense deleted');
      } catch {
        showToast("Couldn't delete. Try again");
      }
    },
  });
}
