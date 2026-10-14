import { AvatarStack } from '../../components/Avatar';
import type { PocketWithMembers } from '../../data/types';
import { Icon } from '../../lib/icons';
import { usePockets } from '../../state/pockets';
import { memberInitials, pocketSummary } from './PocketSwitcher';

/**
 * Home's hero: your Pockets as a deck of cards. The open one sits in front, lit in the accent; the
 * others stand behind it like folders, tap one to open it. The last card adds or joins a Pocket.
 */
export function PocketDeck({ onOpenMenu, onMore }: { onOpenMenu: () => void; onMore: () => void }) {
  const { pockets, current, setCurrent } = usePockets();
  if (!current) return null;
  const others = pockets.filter((p) => p.id !== current.id);

  return (
    <div className="deck" role="group" aria-label="Pockets">
      <button className="deck-front press" onClick={onOpenMenu} aria-haspopup="menu" aria-label={`${current.name}, ${pocketSummary(current)}. Show Pockets`}>
        <div className="deck-front-top">
          <span className="deck-name">{current.name}</span>
          <Icon name="caret-down" weight="bold" size={13} />
        </div>
        <div className="deck-front-bottom">
          <span className="deck-sub">{pocketSummary(current)}</span>
          <AvatarStack initials={memberInitials(current)} size={28} ring="var(--deck-ring)" />
        </div>
      </button>
      <div className="deck-back">
        {others.map((p, i) => (
          <DeckCard key={p.id} pocket={p} index={i} onClick={() => setCurrent(p.id)} />
        ))}
        <button className="deck-card deck-add press" style={{ zIndex: 1 }} onClick={onMore} aria-label="New or join a Pocket">
          <Icon name="plus" size={20} />
        </button>
      </div>
    </div>
  );
}

function DeckCard({ pocket, index, onClick }: { pocket: PocketWithMembers; index: number; onClick: () => void }) {
  return (
    <button className="deck-card press" style={{ zIndex: 20 - index }} onClick={onClick} aria-label={`Open ${pocket.name}`}>
      <Icon name={pocket.type === 'shared' ? 'users-three' : 'user'} size={18} />
      <span className="deck-card-name">{pocket.name}</span>
    </button>
  );
}
