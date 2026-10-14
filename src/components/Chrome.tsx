import { useEffect, useRef, useState, type CSSProperties } from 'react';
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

/**
 * Where the capsule last sat, in tabs (fractional while dragging), and whether it was lifted. Each tab
 * screen mounts its own bar, so the new one starts there and glides over.
 */
let last = { pos: -1, lifted: false };

/**
 * Tab bar with a Liquid Glass capsule, as on iOS 26. The capsule sits behind the open tab. Press and it
 * lifts into a clear lens that magnifies the icons under it; drag and it follows your finger; let go and
 * it settles on the nearest tab and opens it.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const index = TABS.findIndex((t) => t.path === pathname);
  const [pos, setPos] = useState(last.pos >= 0 ? last.pos : index);
  const [lifted, setLifted] = useState(last.lifted);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; moved: boolean; x: number } | null>(null);

  useEffect(() => {
    last = { pos: index, lifted: false };
    // Two frames: let the bar paint where the old one left off, so the move animates. Then set it down.
    let f = requestAnimationFrame(() => (f = requestAnimationFrame(() => setPos(index))));
    const t = window.setTimeout(() => setLifted(false), 320);
    return () => {
      cancelAnimationFrame(f);
      window.clearTimeout(t);
    };
  }, [index]);

  const tabAt = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const w = (r.width - 8) / TABS.length;
    return Math.min(TABS.length - 1, Math.max(0, (e.clientX - r.left - 4) / w - 0.5));
  };

  const release = (to: number) => {
    drag.current = null;
    setDragging(false);
    if (to === index) {
      setPos(index);
      window.setTimeout(() => setLifted(false), 180);
      return;
    }
    last = { pos, lifted: true };
    navigate(TABS[to].path, { replace: true });
  };

  return (
    <nav
      className={`tabbar glass-pref${lifted ? ' lifted' : ''}${dragging ? ' dragging' : ''}`}
      aria-label="Tabs"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, moved: false, x: e.clientX };
        setLifted(true);
        setPos(tabAt(e));
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d?.id !== e.pointerId) return;
        if (!d.moved && Math.abs(e.clientX - d.x) < 4) return;
        d.moved = true;
        setDragging(true);
        setPos(tabAt(e));
      }}
      onPointerUp={(e) => drag.current?.id === e.pointerId && release(Math.round(tabAt(e)))}
      onPointerCancel={() => drag.current && release(index)}
    >
      {pos >= 0 && (
        <span className="tab-lens" style={{ '--pos': pos } as CSSProperties} aria-hidden>
          {/* A copy of the icons, lined up with the bar, so the lens can magnify what's under it. */}
          <span className="tab-lens-view">
            {TABS.map((t, i) => (
              <span key={t.path} className={`tab${i === index ? ' on' : ''}`}>
                <Icon name={t.icon} size={26} weight={i === index ? 'regular' : 'light'} />
              </span>
            ))}
          </span>
        </span>
      )}
      {TABS.map((t) => {
        const on = pathname === t.path;
        return (
          <button
            key={t.path}
            className={`tab${on ? ' on' : ''}`}
            aria-label={t.label}
            aria-current={on ? 'page' : undefined}
            // Taps and drags go through the bar's pointer handlers; this is for the keyboard.
            onClick={(e) => e.detail === 0 && navigate(t.path, { replace: true })}
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
