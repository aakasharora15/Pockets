import { useEffect, useRef, useState } from 'react';
import { AvatarStack } from '../../components/Avatar';
import type { PocketWithMembers } from '../../data/types';
import { Icon } from '../../lib/icons';
import { usePockets } from '../../state/pockets';
import { memberInitials, pocketSummary } from './PocketSwitcher';

/**
 * Home's hero: your Pockets as a deck of cards. The open one sits in front, lit in the accent; the
 * others stand behind it like folders, tap one to open it. The last card adds or joins a Pocket.
 * Switching plays the swap: the chosen card comes forward and the old one tucks in behind.
 */
export function PocketDeck({ onOpenMenu, onMore }: { onOpenMenu: () => void; onMore: () => void }) {
  const { pockets, current, setCurrent } = usePockets();
  const shown = useRef(current?.id);
  const [swap, setSwap] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    const id = current?.id;
    if (id && shown.current && shown.current !== id) setSwap({ from: shown.current, to: id });
    shown.current = id;
  }, [current?.id]);

  if (!current) return null;
  const others = pockets.filter((p) => p.id !== current.id);

  return (
    <div className="deck" role="group" aria-label="Pockets">
      <button
        key={current.id}
        className={`deck-front press${swap?.to === current.id ? ' deck-enter' : ''}`}
        onClick={onOpenMenu}
        aria-haspopup="menu"
        aria-label={`${current.name}, ${pocketSummary(current)}. Show Pockets`}
      >
        <AvatarStack initials={memberInitials(current)} size={28} ring="var(--deck-ring)" />
        <div className="deck-text">
          <span className="deck-name">{current.name}</span>
          <span className="deck-sub">{pocketSummary(current)}</span>
        </div>
        <Icon name="caret-down" weight="bold" size={13} />
      </button>
      <div className="deck-back">
        {others.map((p, i) => (
          <DeckCard key={p.id} pocket={p} index={i} returning={swap?.from === p.id} onClick={() => setCurrent(p.id)} />
        ))}
        <button className="deck-card deck-add press" style={{ zIndex: 1 }} onClick={onMore} aria-label="New or join a Pocket">
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}

function DeckCard({ pocket, index, returning, onClick }: { pocket: PocketWithMembers; index: number; returning: boolean; onClick: () => void }) {
  return (
    <button
      className={`deck-card press${returning ? ' deck-return' : ''}`}
      style={{ zIndex: 20 - index }}
      onClick={onClick}
      aria-label={`Open ${pocket.name}`}
    >
      <span className="deck-card-name">{pocket.name}</span>
    </button>
  );
}
