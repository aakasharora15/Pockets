import { useMemo, useRef, useState } from 'react';
import { AmountPad } from '../components/Keypads';
import { ActionSheet, Sheet, SheetHeader } from '../components/Sheet';
import { addExpense, deleteExpense, saveExpenseEdit } from '../data/expenses';
import type { Category, PocketWithMembers } from '../data/types';
import { currency, type CurrencyCode } from '../lib/currencies';
import { sheetDateLabel, todayKey } from '../lib/dates';
import { Icon } from '../lib/icons';
import { displayTyped, minorToTyped, pressKey, typedToMinor } from '../lib/money';
import { usePockets } from '../state/pockets';
import { useMe } from '../state/session';
import { useUi, type ExpenseSheetRequest } from '../state/ui';

const lastCurrencyKey = (pid: string) => `spendr.lastCurrency.${pid}`;

function lastCurrency(p: PocketWithMembers): CurrencyCode | null {
  try {
    const c = localStorage.getItem(lastCurrencyKey(p.id)) as CurrencyCode | null;
    return c && p.currencies.includes(c) ? c : null;
  } catch {
    return null;
  }
}

/** Removes decimals the currency doesn't use (switching £12.50 to ₹ gives ₹12). */
function fitTyped(typed: string, code: CurrencyCode): string {
  const dp = currency(code).dp;
  const [int, dec] = typed.split('.');
  if (dec === undefined) return typed;
  return dp === 0 ? int : `${int}.${dec.slice(0, dp)}`;
}

/** 11–15 · New / Edit expense */
export function ExpenseSheet({ request }: { request: ExpenseSheetRequest }) {
  const { user } = useMe();
  const { pockets, current, categoriesFor } = usePockets();
  const { closeExpenseSheet, showToast } = useUi();
  const editing = request.mode === 'edit' ? request : null;
  const original = editing?.expense;

  const [pocketId, setPocketId] = useState(editing?.pocketId ?? current!.id);
  const pocket = pockets.find((p) => p.id === pocketId) ?? current!;
  const categories = categoriesFor(pocket.id);

  const [cur, setCur] = useState<CurrencyCode | null>(original?.currency ?? lastCurrency(pocket));
  const [typed, setTyped] = useState(original ? minorToTyped(original.amountMinor, original.currency) : '');
  const [name, setName] = useState(original?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(original?.categoryId ?? null);
  const [who, setWho] = useState(user.uid);
  const [date, setDate] = useState<string>(original?.date ?? (request.mode === 'new' ? request.date : undefined) ?? todayKey());
  const [note, setNote] = useState(original?.note ?? '');
  const [detent, setDetent] = useState<'medium' | 'large'>(editing ? 'large' : 'medium');
  const [menu, setMenu] = useState<'category' | 'pocket' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const dateInput = useRef<HTMLInputElement>(null);

  const amountMinor = cur ? typedToMinor(typed, cur) : 0;
  const canSave = !!cur && amountMinor > 0 && !busy;
  const category = categories.find((c) => c.id === categoryId) ?? null;
  const shared = pocket.type === 'shared';
  const members = pocket.members;

  const choosePocket = (p: PocketWithMembers) => {
    setPocketId(p.id);
    setMenu(null);
    if (!cur || !p.currencies.includes(cur)) {
      const next = p.currencies[0];
      setCur(next);
      setTyped((t) => fitTyped(t, next));
    }
    if (categoryId && !categoriesFor(p.id).some((c) => c.id === categoryId)) setCategoryId(null);
    if (!p.members.some((m) => m.uid === who)) setWho(user.uid);
  };

  const save = async () => {
    if (!canSave || !cur) return;
    if (!category) {
      setDetent('large');
      setMenu('category');
      return;
    }
    setBusy(true);
    const by = members.find((m) => m.uid === (editing ? original!.byUid : who));
    const input = {
      currency: cur,
      amountMinor,
      name: name.trim() || category.name,
      categoryId: category.id,
      byUid: editing ? original!.byUid : who,
      byInitials: editing ? original!.byInitials : by?.initials ?? '?',
      date,
      note,
    };
    try {
      if (editing) {
        await saveExpenseEdit(original!, editing.pocketId, pocket.id, input, shared ? who : user.uid);
        showToast('Expense updated');
      } else {
        await addExpense(pocket.id, input);
        showToast(pocket.id === current?.id ? 'Expense saved' : `Saved to ${pocket.name}`);
      }
      try {
        localStorage.setItem(lastCurrencyKey(pocket.id), cur);
      } catch {
        /* storage unavailable */
      }
      closeExpenseSheet();
    } catch {
      setBusy(false);
      showToast("Couldn't save. Try again");
    }
  };

  const remove = async () => {
    if (!editing) return;
    setConfirmDelete(false);
    try {
      await deleteExpense(editing.pocketId, original!.id);
      showToast('Expense deleted');
      closeExpenseSheet();
    } catch {
      showToast("Couldn't delete. Try again");
    }
  };

  const symbols = pocket.currencies.map((c) => currency(c).symbol);
  const hint = symbols.length > 1 ? `Choose ${symbols.slice(0, -1).join(', ')} or ${symbols[symbols.length - 1]} to start` : `Choose ${symbols[0]} to start`;

  return (
    <>
      <Sheet
        onClose={closeExpenseSheet}
        top={detent === 'medium' ? 'max(58px, calc(100% - 672px))' : 58}
        className={`expense-sheet ${detent}`}
        label={editing ? 'Edit expense' : 'New expense'}
        onDrag={(dir) => (dir === 'up' ? setDetent('large') : detent === 'large' && !editing ? setDetent('medium') : closeExpenseSheet())}
      >
        <SheetHeader title={editing ? 'Edit expense' : 'New expense'} onCancel={closeExpenseSheet} action={{ label: 'Save', onClick: save, disabled: !canSave }} />

        <div className="cur-pills">
          {pocket.currencies.map((code) => {
            const c = currency(code);
            return (
              <button
                key={code}
                className={`cur-pill press${cur === code ? ' on' : ''}`}
                aria-pressed={cur === code}
                onClick={() => {
                  setCur(code);
                  setTyped((t) => fitTyped(t, code));
                }}
              >
                <span className="cur-pill-sym">{c.symbol}</span>
                {c.short}
              </button>
            );
          })}
        </div>

        <button className={`amount num${typed ? '' : ' placeholder'}`} onClick={() => setDetent('medium')} aria-label="Amount">
          <span className="amount-sym">{typed && cur ? currency(cur).symbol : ''}</span>
          <span className="amount-num">{cur ? displayTyped(typed, cur) : '0'}</span>
          {detent === 'medium' && <span className="caret-bar" />}
        </button>

        {detent === 'medium' ? (
          <>
            <div className="amount-hint">{cur ? '' : hint}</div>
            <AmountPad
              decimals={!cur || currency(cur).dp > 0}
              onKey={(k) => {
                if (!cur) return;
                setTyped((t) => pressKey(t, k, cur));
              }}
            />
          </>
        ) : (
          <>
            <label className="name-field">
              <Icon name="text-t" size={18} color="var(--text2)" />
              <input placeholder="What was it for?" aria-label="What was it for?" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <div className="details-wrap">
              <div className="details">
                <button className="detail-row" onClick={() => setMenu(menu === 'pocket' ? null : 'pocket')}>
                  <span className="detail-icon">
                    <Icon name="users-three" size={19} />
                  </span>
                  <div className="detail-body">
                    <span className="detail-label">Pocket</span>
                    <span className="detail-value">{pocket.name}</span>
                    <Icon name="caret-up-down" weight="bold" size={13} color="#5A5A5E" />
                  </div>
                </button>

                <button className="detail-row" onClick={() => setMenu(menu === 'category' ? null : 'category')}>
                  {category ? (
                    <span className="detail-cat-tile">
                      <Icon name={category.icon} />
                    </span>
                  ) : (
                    <span className="detail-icon">
                      <Icon name="squares-four" size={19} />
                    </span>
                  )}
                  <div className="detail-body sep">
                    <span className="detail-label">Category</span>
                    <span className="detail-value">{category?.name ?? 'Choose'}</span>
                    <Icon name="caret-up-down" weight="bold" size={13} color="#5A5A5E" />
                  </div>
                </button>

                {shared && (
                  <div className="detail-row">
                    <span className="detail-icon">
                      <Icon name="user-circle" size={19} />
                    </span>
                    <div className="detail-body sep">
                      <span className="detail-label">{editing ? 'Edited by' : 'Added by'}</span>
                      <div className="mini-seg" role="radiogroup" aria-label={editing ? 'Edited by' : 'Added by'}>
                        {members.map((m) => (
                          <button key={m.uid} role="radio" aria-checked={who === m.uid} className={`mini-seg-item${who === m.uid ? ' on' : ''}`} onClick={() => setWho(m.uid)}>
                            {m.initials}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <label className="detail-row">
                  <span className="detail-icon">
                    <Icon name="calendar-blank" size={19} />
                  </span>
                  <div className="detail-body sep">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">{sheetDateLabel(date)}</span>
                    <Icon name="caret-right" weight="bold" size={13} color="#5A5A5E" />
                  </div>
                  <input
                    ref={dateInput}
                    type="date"
                    className="date-input"
                    aria-label="Date"
                    value={date}
                    onChange={(e) => e.target.value && setDate(e.target.value)}
                  />
                </label>

                <label className="detail-row">
                  <span className="detail-icon">
                    <Icon name="note-pencil" size={19} />
                  </span>
                  <div className="detail-body sep">
                    <span className="detail-label">Note</span>
                    <input className="note-input" placeholder="Optional" aria-label="Note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                    <Icon name="caret-right" weight="bold" size={13} color="#5A5A5E" />
                  </div>
                </label>
              </div>

              {menu && <div className="menu-catcher" onClick={() => setMenu(null)} />}
              {menu === 'category' && (
                <CategoryMenu
                  categories={categories}
                  selected={categoryId}
                  onPick={(c) => {
                    setCategoryId(c.id);
                    setMenu(null);
                  }}
                />
              )}
              {menu === 'pocket' && (
                <div className="glass-menu pocket-menu" role="menu">
                  {pockets.map((p) => (
                    <button key={p.id} role="menuitemradio" aria-checked={p.id === pocket.id} className="menu-item" onClick={() => choosePocket(p)}>
                      <span className="menu-check">{p.id === pocket.id && <Icon name="check" weight="bold" />}</span>
                      <span className="menu-name">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {editing && (
              <button className="delete-link press" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            )}
          </>
        )}

        <button className={`primary-btn sheet-bottom save-btn press${canSave ? '' : ' off'}`} disabled={!canSave} onClick={save}>
          Save expense
        </button>
      </Sheet>
      {confirmDelete && (
        <div className="sheet-layer">
          <ActionSheet
            title={`Delete ${original?.name || 'this expense'}?`}
            message="This can't be undone."
            actions={[{ label: 'Delete expense', destructive: true, onClick: remove }]}
            onCancel={() => setConfirmDelete(false)}
          />
        </div>
      )}
    </>
  );
}

function CategoryMenu({ categories, selected, onPick }: { categories: Category[]; selected: string | null; onPick: (c: Category) => void }) {
  const ordered = useMemo(() => [...categories].sort((a, b) => a.order - b.order), [categories]);
  return (
    <div className="glass-menu cat-menu" role="menu">
      {ordered.map((c) => (
        <button key={c.id} role="menuitemradio" aria-checked={c.id === selected} className="menu-item" onClick={() => onPick(c)}>
          <span className="menu-check">{c.id === selected && <Icon name="check" weight="bold" />}</span>
          <span className="menu-name">{c.name}</span>
          <span className="menu-tile">
            <Icon name={c.icon} />
          </span>
        </button>
      ))}
    </div>
  );
}
