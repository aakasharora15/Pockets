import { AvatarStack } from '../../components/Avatar';
import type { PocketWithMembers } from '../../data/types';
import { currency } from '../../lib/currencies';
import { Icon } from '../../lib/icons';
import { usePockets } from '../../state/pockets';

/** "Just you · £" / "2 people · £ ₹" */
export function pocketSummary(p: PocketWithMembers): string {
  const symbols = p.currencies.map((c) => currency(c).symbol).join(' ');
  if (p.type === 'personal' || p.members.length <= 1) return `Just you · ${symbols}`;
  return `${p.members.length} people · ${symbols}`;
}

export function memberInitials(p: PocketWithMembers): string[] {
  return p.members.slice(0, 3).map((m) => m.initials);
}

/** Glass pill on Home showing the current Pocket. */
export function PocketPill({ pocket, open, onClick }: { pocket: PocketWithMembers; open: boolean; onClick: () => void }) {
  return (
    <button className="pocket-pill glass-pref press" onClick={onClick} aria-expanded={open} aria-haspopup="menu">
      <AvatarStack initials={memberInitials(pocket)} size={28} ring={open ? '#2A3242' : '#0E2747'} />
      <span className="pocket-pill-name">{pocket.name}</span>
      <Icon name={open ? 'caret-up' : 'caret-down'} weight="bold" size={13} />
    </button>
  );
}

export function PocketSwitcher({ onClose, onNew, onJoin }: { onClose: () => void; onNew: () => void; onJoin: () => void }) {
  const { pockets, current, setCurrent } = usePockets();
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="popover switcher" role="menu">
        {pockets.map((p, i) => (
          <button
            key={p.id}
            role="menuitemradio"
            aria-checked={p.id === current?.id}
            className={`switcher-row press-row${i ? ' sep' : ''}`}
            onClick={() => {
              setCurrent(p.id);
              onClose();
            }}
          >
            <AvatarStack initials={memberInitials(p)} size={36} ring="#2C303A" />
            <div className="switcher-text">
              <span className="switcher-name">{p.name}</span>
              <span className="switcher-sub">{pocketSummary(p)}</span>
            </div>
            {p.id === current?.id && <Icon name="check" weight="bold" size={17} />}
          </button>
        ))}
        <div className="switcher-gap" />
        <button role="menuitem" className="switcher-row press-row" onClick={onNew}>
          <div className="switcher-icon">
            <Icon name="plus" />
          </div>
          <div className="switcher-text">
            <span className="switcher-name">New shared Pocket</span>
          </div>
        </button>
        <button role="menuitem" className="switcher-row press-row sep" onClick={onJoin}>
          <div className="switcher-icon">
            <Icon name="qr-code" />
          </div>
          <div className="switcher-text">
            <span className="switcher-name">Join with code</span>
          </div>
        </button>
      </div>
    </>
  );
}
