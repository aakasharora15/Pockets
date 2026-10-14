import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../lib/icons';
import { useUi } from '../state/ui';

export function BackButton({ onClick, to }: { onClick?: () => void; to?: string }) {
  const navigate = useNavigate();
  return (
    <button className="back-btn glass press" aria-label="Back" onClick={() => (onClick ? onClick() : to ? navigate(to) : navigate(-1))}>
      <Icon name="caret-left" weight="bold" />
    </button>
  );
}

const TABS = [
  { path: '/', icon: 'house', label: 'Home' },
  { path: '/transactions', icon: 'currency-gbp', label: 'Transactions' },
  { path: '/calendar', icon: 'calendar-blank', label: 'Calendar' },
  { path: '/settings', icon: 'gear-six', label: 'Settings' },
];

export function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="tabbar glass-pref" aria-label="Tabs">
      {TABS.map((t) => {
        const on = pathname === t.path;
        return (
          <button
            key={t.path}
            className={`tab press${on ? ' on' : ''}`}
            aria-label={t.label}
            aria-current={on ? 'page' : undefined}
            onClick={() => navigate(t.path, { replace: true })}
          >
            {/* Icons only; the open tab is brighter and a touch heavier. Names stay for VoiceOver. */}
            <Icon name={t.icon} size={26} weight={on ? 'regular' : 'light'} />
          </button>
        );
      })}
    </nav>
  );
}

export function PlusButton() {
  const { openExpenseSheet } = useUi();
  return (
    <button className="plus-btn glass-pref press" aria-label="New expense" onClick={() => openExpenseSheet({ mode: 'new' })}>
      <span className="plus-mark" />
    </button>
  );
}

export function Fades({ blur = true, top = true, bottom = true, topHeight }: { blur?: boolean; top?: boolean; bottom?: boolean; topHeight?: number }) {
  return (
    <>
      {top && <div className={`fade-top${blur ? ' blur' : ''}`} style={topHeight ? { height: topHeight } : undefined} />}
      {bottom && <div className="fade-bottom" />}
    </>
  );
}

export function Toast() {
  const { toast } = useUi();
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <Icon name="check" weight="bold" />
      {toast}
    </div>
  );
}

/** "You're offline" card shown while there are unsynced expense writes. */
export function OfflineToast() {
  const { online, pendingExpenses } = useUi();
  if (online || pendingExpenses === 0) return null;
  const n = pendingExpenses;
  return (
    <div className="offline-toast" role="status" aria-live="polite">
      <div className="offline-icon">
        <Icon name="wifi-slash" weight="bold" />
      </div>
      <div className="offline-text">
        <span className="offline-title">You're offline</span>
        <span className="offline-msg">
          {n} {n === 1 ? 'expense' : 'expenses'} saved on this phone. They'll sync when you're back online.
        </span>
      </div>
    </div>
  );
}
