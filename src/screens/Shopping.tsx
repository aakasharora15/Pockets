import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { BackButton, Fades } from '../components/Chrome';
import { Segmented } from '../components/Segmented';
import { ActionSheet } from '../components/Sheet';
import { ListSkeleton } from '../components/Skeletons';
import { addShoppingItem, removeShoppingItems, setShoppingDone, setShoppingWhen, useShopping } from '../data/shopping';
import type { ShoppingItem, ShoppingWhen } from '../data/types';
import { Icon } from '../lib/icons';
import { firstName } from '../lib/initials';
import { useCurrentPocket } from '../state/pockets';
import { useMe } from '../state/session';
import { useUi } from '../state/ui';

const OTHER: Record<ShoppingWhen, ShoppingWhen> = { week: 'month', month: 'week' };
const LABEL: Record<ShoppingWhen, string> = { week: 'This week', month: 'This month' };

/** A Pocket's shared list of things to buy, this week or this month. Anyone in the Pocket can add or tick off. */
export function Shopping() {
  const pocket = useCurrentPocket();
  const { user } = useMe();
  const { showToast, openExpenseSheet } = useUi();
  const { items, loading } = useShopping(pocket.id);
  const [when, setWhen] = useState<ShoppingWhen>('week');
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<ShoppingItem | null>(null);

  const shared = pocket.type === 'shared';
  const others = pocket.members.filter((m) => m.uid !== user.uid);
  const initialsOf = (uid: string) => pocket.members.find((m) => m.uid === uid)?.initials ?? '?';
  const left = (w: ShoppingWhen) => items.filter((i) => i.when === w && !i.done).length;
  const shown = items.filter((i) => i.when === when);
  const toBuy = shown.filter((i) => !i.done);
  const bought = shown.filter((i) => i.done);

  const run = async (p: Promise<void>, failed: string) => {
    try {
      await p;
    } catch {
      showToast(failed);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const name = text.trim();
    if (!name) return;
    setText('');
    void run(addShoppingItem(pocket.id, name, when, user.uid), `Couldn't add ${name}. Try again`);
  };

  const toggle = (i: ShoppingItem) => void run(setShoppingDone(pocket.id, i.id, !i.done, user.uid), "Couldn't update the list. Try again");

  const row = (i: ShoppingItem, n: number) => (
    <div key={i.id} className={`shop-row${i.done ? ' done' : ''}`}>
      <button className="shop-check press" role="checkbox" aria-checked={i.done} aria-label={i.name} onClick={() => toggle(i)}>
        <span className="shop-box">{i.done && <Icon name="check" weight="bold" size={14} />}</span>
      </button>
      <div className={`shop-body${n ? ' sep' : ''}`}>
        <button className="shop-name press-row" onClick={() => setPicked(i)}>
          {i.name}
        </button>
        {i.done ? (
          <button className="shop-log press" onClick={() => openExpenseSheet({ mode: 'new', name: i.name })}>
            Add expense
          </button>
        ) : (
          shared && <Avatar initials={initialsOf(i.addedByUid)} size={28} />
        )}
      </div>
    </div>
  );

  return (
    <div className="screen">
      <div className="scroll sub-scroll shop-scroll">
        <div className="page-head">
          <span className="page-title">To buy</span>
          <span className="page-sub">
            {shared && others.length
              ? `Shared with ${others.map((m) => firstName(m.name)).join(' and ')}. Anyone can add or tick things off.`
              : `Your list for ${pocket.name}.`}
          </span>
        </div>
        <Segmented
          label="When"
          value={when}
          onChange={setWhen}
          options={(['week', 'month'] as const).map((w) => ({ value: w, label: left(w) ? `${LABEL[w]} · ${left(w)}` : LABEL[w] }))}
        />
        <form className="field shop-add" onSubmit={add}>
          <Icon name="plus" size={19} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={when === 'week' ? 'Add something for this week' : 'Add something for this month'}
            aria-label="Add an item"
            maxLength={60}
            enterKeyHint="done"
            autoCapitalize="sentences"
          />
          {text.trim() && (
            <button type="submit" className="link shop-add-btn press">
              Add
            </button>
          )}
        </form>
        {loading ? (
          <ListSkeleton rows={3} />
        ) : (
          <>
            {toBuy.length > 0 ? (
              <div className="list-card">{toBuy.map(row)}</div>
            ) : (
              <div className="empty-note shop-empty">
                {bought.length ? 'All bought.' : when === 'week' ? 'Nothing on the list for this week.' : 'Nothing on the list for this month.'}
                {shared && !bought.length ? ' Add what you need and everyone in the Pocket sees it.' : ''}
              </div>
            )}
            {bought.length > 0 && (
              <div className="shop-bought">
                <div className="shop-bought-head">
                  <span className="section-label">Bought</span>
                  <button
                    className="link shop-clear press"
                    onClick={() =>
                      void run(
                        removeShoppingItems(
                          pocket.id,
                          bought.map((i) => i.id),
                        ),
                        "Couldn't clear the list. Try again",
                      )
                    }
                  >
                    Clear
                  </button>
                </div>
                <div className="list-card">{bought.map(row)}</div>
              </div>
            )}
          </>
        )}
      </div>
      <Fades blur={false} bottom={false} />
      <BackButton to="/" />
      {picked && (
        <ActionSheet
          title={picked.name}
          message={
            shared
              ? `Added by ${picked.addedByUid === user.uid ? 'you' : firstName(pocket.members.find((m) => m.uid === picked.addedByUid)?.name ?? 'someone')}`
              : undefined
          }
          actions={[
            {
              label: picked.done ? 'Not bought yet' : 'Bought',
              onClick: () => {
                setPicked(null);
                toggle(picked);
              },
            },
            {
              label: `Move to ${LABEL[OTHER[picked.when]]}`,
              onClick: () => {
                setPicked(null);
                void run(setShoppingWhen(pocket.id, picked.id, OTHER[picked.when]), "Couldn't move it. Try again");
              },
            },
            {
              label: 'Add as expense',
              onClick: () => {
                setPicked(null);
                openExpenseSheet({ mode: 'new', name: picked.name });
              },
            },
            {
              label: 'Remove',
              destructive: true,
              onClick: () => {
                setPicked(null);
                void run(removeShoppingItems(pocket.id, [picked.id]), "Couldn't remove it. Try again");
              },
            },
          ]}
          onCancel={() => setPicked(null)}
        />
      )}
    </div>
  );
}
