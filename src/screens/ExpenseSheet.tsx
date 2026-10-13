import { useEffect, useMemo, useRef, useState } from 'react';
import { AmountPad } from '../components/Keypads';
import { ActionSheet, Sheet, SheetHeader } from '../components/Sheet';
import { Switch } from '../components/Switch';
import { addExpense, deleteExpense, newExpenseId, saveExpenseEdit, type ExpenseInput } from '../data/expenses';
import { compressPhoto, deleteReceipt, loadReceipt, saveReceipt, type Photo } from '../data/receipts';
import { newRecurringId, startRecurring, stopRecurring, updateRecurring, useRecurring } from '../data/recurring';
import { rememberTag } from '../data/tags';
import type { Category, PocketWithMembers } from '../data/types';
import { currency, type CurrencyCode } from '../lib/currencies';
import { sheetDateLabel, todayKey } from '../lib/dates';
import { Icon } from '../lib/icons';
import { displayTyped, minorToTyped, pressKey, typedToMinor } from '../lib/money';
import { dayOf, repeatLabel } from '../lib/recurring';
import { useObjectUrl } from '../lib/useObjectUrl';
import { ReceiptViewer } from './ReceiptViewer';
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
  // Who paid: the person this expense counts against in a shared Pocket.
  const [who, setWho] = useState(original?.byUid ?? user.uid);
  const [date, setDate] = useState<string>(original?.date ?? (request.mode === 'new' ? request.date : undefined) ?? todayKey());
  const [note, setNote] = useState(original?.note ?? '');
  const [detent, setDetent] = useState<'medium' | 'large'>(editing ? 'large' : 'medium');
  const [menu, setMenu] = useState<'category' | 'pocket' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const dateInput = useRef<HTMLInputElement>(null);
  const [newId] = useState(() => newExpenseId(current!.id));
  const [tag, setTag] = useState(original?.tag ?? '');

  // Repeat monthly: on when the expense is linked to a repeat that still exists.
  const { list: repeats } = useRecurring(editing?.pocketId ?? pocket.id);
  const linkedRepeat = original?.recurringId ? repeats.find((r) => r.id === original.recurringId) : undefined;
  const [repeat, setRepeat] = useState<boolean | null>(editing ? null : false);
  const repeatOn = repeat ?? !!linkedRepeat;

  // Receipt photo: kept, added, replaced or removed.
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoState, setPhotoState] = useState<'none' | 'loading' | 'saved' | 'new' | 'removed'>(original?.receipt ? 'loading' : 'none');
  const [viewing, setViewing] = useState(false);
  const [reading, setReading] = useState<number | null>(null);

  useEffect(() => {
    if (!original?.receipt || !editing) return;
    let live = true;
    loadReceipt(editing.pocketId, original.id)
      .then((p) => {
        if (!live) return;
        setPhoto(p);
        setPhotoState(p ? 'saved' : 'none');
      })
      .catch(() => live && setPhotoState('saved'));
    return () => {
      live = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPhoto = photoState === 'saved' || photoState === 'new' || photoState === 'loading';

  const amountMinor = cur ? typedToMinor(typed, cur) : 0;
  const canSave = !!cur && amountMinor > 0 && !busy;
  const category = categories.find((c) => c.id === categoryId) ?? null;
  const shared = pocket.type === 'shared';
  const members = pocket.members;
  // Someone who has left can still be the payer of an older expense.
  const payers =
    original && !members.some((m) => m.uid === original.byUid) && pocket.id === editing?.pocketId
      ? [...members, { uid: original.byUid, initials: original.byInitials }]
      : members;

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
    const by = payers.find((m) => m.uid === who);
    const moving = !!editing && editing.pocketId !== pocket.id;
    // A repeat lives in its Pocket: moving the expense starts a new one there.
    const keepRepeat = repeatOn && !!linkedRepeat && !moving;
    const rid = repeatOn ? (keepRepeat ? linkedRepeat!.id : newRecurringId(pocket.id)) : undefined;
    const input: ExpenseInput = {
      currency: cur,
      amountMinor,
      name: name.trim() || category.name,
      categoryId: category.id,
      byUid: who,
      byInitials: by?.initials ?? original?.byInitials ?? '?',
      date,
      note,
      tag: rememberTag(pocket, tag),
      // Keep the link on an expense a stopped repeat logged; drop it when you switch repeat off here.
      recurringId: rid ?? (linkedRepeat ? undefined : original?.recurringId),
      receipt: (photoState === 'new' || photoState === 'saved' || photoState === 'loading') && !(moving && !photo),
    };
    try {
      let id = newId;
      if (editing) {
        id = await saveExpenseEdit(original!, editing.pocketId, pocket.id, input, user.uid);
        showToast('Expense updated');
      } else {
        await addExpense(pocket.id, input, newId);
        showToast(pocket.id === current?.id ? 'Expense saved' : `Saved to ${pocket.name}`);
      }
      // Repeat: start, update or stop. Failures here don't undo the saved expense.
      const sideEffects: Promise<unknown>[] = [];
      if (rid && keepRepeat) sideEffects.push(updateRecurring(pocket.id, rid, input));
      else if (rid) sideEffects.push(startRecurring(pocket.id, rid, input, user.uid));
      if (linkedRepeat && (!repeatOn || moving)) sideEffects.push(stopRecurring(editing!.pocketId, linkedRepeat.id));
      // Receipt photo: save a new one (or carry it to the new Pocket), delete a removed one.
      if (photo && (photoState === 'new' || (moving && photoState === 'saved'))) sideEffects.push(saveReceipt(pocket.id, id, photo));
      if (photoState === 'removed' && original?.receipt && !moving) sideEffects.push(deleteReceipt(editing!.pocketId, original.id));
      const results = await Promise.allSettled(sideEffects);
      if (results.some((r) => r.status === 'rejected')) showToast('Saved, but the photo or repeat needs another try');
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
      await deleteExpense(editing.pocketId, original!.id, !!original!.receipt);
      showToast('Expense deleted');
      closeExpenseSheet();
    } catch {
      showToast("Couldn't delete. Try again");
    }
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const p = await compressPhoto(file);
      setPhoto(p);
      setPhotoState('new');
    } catch {
      showToast("Couldn't use that photo");
    }
  };

  const fillFromPhoto = async () => {
    if (!photo || reading !== null) return;
    setReading(0);
    try {
      const { readReceipt } = await import('../lib/ocr');
      const guess = await readReceipt(photo.blob, (p) => setReading(p));
      let code = cur;
      if (guess.currency && pocket.currencies.includes(guess.currency) && (!cur || !typed)) code = guess.currency;
      code = code ?? pocket.currencies[0];
      if (guess.amount !== undefined) {
        setCur(code);
        const dp = currency(code).dp;
        setTyped(String(dp ? guess.amount.toFixed(dp) : Math.round(guess.amount)).replace(/^0+(?=\d)/, ''));
      }
      if (guess.merchant) setName(guess.merchant);
      showToast(guess.amount !== undefined || guess.merchant ? 'Filled in from the receipt' : "Couldn't read the receipt");
    } catch {
      showToast(navigator.onLine ? "Couldn't read the receipt" : 'Reading a receipt the first time needs a connection');
    } finally {
      setReading(null);
    }
  };

  const symbols = pocket.currencies.map((c) => currency(c).symbol);
  const hint = symbols.length > 1 ? `Choose ${symbols.slice(0, -1).join(', ')} or ${symbols[symbols.length - 1]} to start` : `Choose ${symbols[0]} to start`;

  return (
    <>
      <Sheet
        onClose={closeExpenseSheet}
        top={detent === 'medium' ? 'max(calc(var(--top) + 4px), calc(100% - 672px))' : 'calc(var(--top) + 4px)'}
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
                    <Icon name="caret-up-down" weight="bold" size={13} color="var(--chevron)" />
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
                    <Icon name="caret-up-down" weight="bold" size={13} color="var(--chevron)" />
                  </div>
                </button>

                {shared && (
                  <div className="detail-row">
                    <span className="detail-icon">
                      <Icon name="user-circle" size={19} />
                    </span>
                    <div className="detail-body sep">
                      <span className="detail-label">Paid by</span>
                      <div className="mini-seg" role="radiogroup" aria-label="Paid by">
                        {payers.map((m) => (
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
                    <Icon name="caret-right" weight="bold" size={13} color="var(--chevron)" />
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
                    <Icon name="caret-right" weight="bold" size={13} color="var(--chevron)" />
                  </div>
                </label>

                <label className="detail-row tag-row">
                  <span className="detail-icon">
                    <Icon name="tag" size={19} />
                  </span>
                  <div className="detail-body sep">
                    <span className="detail-label">Add tag</span>
                    <input
                      className="note-input"
                      placeholder="Trip, event"
                      aria-label="Tag"
                      maxLength={40}
                      list="pocket-tags"
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                    />
                    <datalist id="pocket-tags">
                      {(pocket.tags ?? []).map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                    <Icon name="caret-right" weight="bold" size={13} color="var(--chevron)" />
                  </div>
                </label>

                <div className="detail-row">
                  <span className="detail-icon">
                    <Icon name="repeat" size={19} />
                  </span>
                  <div className="detail-body sep">
                    <div className="detail-stack">
                      <span className="detail-label">Repeat monthly</span>
                      {repeatOn && <span className="detail-sub">{repeatLabel(linkedRepeat && repeat === null ? linkedRepeat.day : dayOf(date))}</span>}
                    </div>
                    <Switch on={repeatOn} onChange={setRepeat} label="Repeat monthly" />
                  </div>
                </div>

                {hasPhoto ? (
                  <>
                    <button className="detail-row" onClick={() => setViewing(true)}>
                      <span className="detail-icon">
                        <Icon name="receipt" size={19} />
                      </span>
                      <div className="detail-body sep">
                        <span className="detail-label">Receipt</span>
                        {photo ? <Thumb photo={photo} /> : <span className="detail-value">Loading</span>}
                        <Icon name="caret-right" weight="bold" size={13} color="var(--chevron)" />
                      </div>
                    </button>
                    {photo && (
                      <button className="detail-row" onClick={fillFromPhoto} disabled={reading !== null}>
                        <span className="detail-icon">
                          <Icon name="scan" size={19} />
                        </span>
                        <div className="detail-body sep">
                          <span className="detail-label">Fill in from receipt</span>
                          {reading !== null && <span className="detail-value">Reading {Math.round(reading * 100)}%</span>}
                        </div>
                      </button>
                    )}
                  </>
                ) : (
                  <label className="detail-row">
                    <span className="detail-icon">
                      <Icon name="camera" size={19} />
                    </span>
                    <div className="detail-body sep">
                      <span className="detail-label">Add receipt photo</span>
                      <Icon name="caret-right" weight="bold" size={13} color="var(--chevron)" />
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="date-input"
                      aria-label="Add receipt photo"
                      onChange={(e) => {
                        void pickPhoto(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
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
      {viewing && (
        <ReceiptViewer
          photo={photo}
          onClose={() => setViewing(false)}
          onRemove={() => {
            setViewing(false);
            setPhoto(null);
            setPhotoState(original?.receipt ? 'removed' : 'none');
          }}
          onFill={() => {
            setViewing(false);
            void fillFromPhoto();
          }}
        />
      )}
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

function Thumb({ photo }: { photo: Photo }) {
  const url = useObjectUrl(photo.blob);
  return url ? <img className="receipt-thumb" src={url} alt="" /> : <span className="receipt-thumb" />;
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
