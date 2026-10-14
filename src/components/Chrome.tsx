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

/** How far the lens lifts when pressed, and how much it may stretch while moving fast. */
const LIFT = 1.24;
const MAX_STRETCH = 0.22;

/**
 * Tab bar with a Liquid Glass lens, as on iOS 26. At rest a soft capsule sits on the open tab. Press and
 * it lifts into a clear lens that magnifies the icons under it; drag and it follows your finger,
 * stretching with speed; let go and it glides to the nearest tab and opens it.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const index = TABS.findIndex((t) => t.path === pathname);
  const [pos, setPos] = useState(index);
  const [lifted, setLifted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [stretch, setStretch] = useState(0);
  const drag = useRef<{ id: number; moved: boolean; x: number; t: number } | null>(null);
  const calm = useRef(0);

  /** Stretch the lens now and let it relax back once it stops moving. */
  const wobble = (amount: number, after = 90) => {
    setStretch(Math.min(MAX_STRETCH, amount));
    window.clearTimeout(calm.current);
    calm.current = window.setTimeout(() => setStretch(0), after);
  };

  // The open tab changed: glide there, stretched for the trip, then set the lens down.
  useEffect(() => {
    if (index < 0) return;
    setPos((p) => {
      if (Math.abs(p - index) >= 0.5) wobble(0.14, 200);
      return index;
    });
    const t = window.setTimeout(() => setLifted(false), 340);
    return () => window.clearTimeout(t);
  }, [index]);

  useEffect(() => () => window.clearTimeout(calm.current), []);

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
      window.setTimeout(() => setLifted(false), 200);
    } else navigate(TABS[to].path, { replace: true });
  };

  const vars = { '--pos': pos, '--lift': lifted ? LIFT : 1, '--stretch': stretch } as CSSProperties;

  return (
    <nav
      className={`tabbar glass-pref${lifted ? ' lifted' : ''}${dragging ? ' dragging' : ''}`}
      style={vars}
      aria-label="Tabs"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, moved: false, x: e.clientX, t: e.timeStamp };
        setLifted(true);
        setPos(tabAt(e));
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d?.id !== e.pointerId) return;
        if (!d.moved && Math.abs(e.clientX - d.x) < 4) return;
        const speed = Math.abs(e.clientX - d.x) / Math.max(8, e.timeStamp - d.t);
        Object.assign(d, { moved: true, x: e.clientX, t: e.timeStamp });
        setDragging(true);
        setPos(tabAt(e));
        wobble(speed * 0.12);
      }}
      onPointerUp={(e) => drag.current?.id === e.pointerId && release(Math.round(tabAt(e)))}
      onPointerCancel={() => drag.current && release(index)}
    >
      <div className="tab-row">
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
      </div>
      {index >= 0 && (
        <span className="tab-lens" aria-hidden>
          {/* A copy of the icons lined up with the bar; the lens's scale magnifies it. */}
          <span className="tab-lens-view">
            {TABS.map((t, i) => (
              <span key={t.path} className={`tab${i === index ? ' on' : ''}`}>
                <Icon name={t.icon} size={26} weight={i === index ? 'regular' : 'light'} />
              </span>
            ))}
          </span>
        </span>
      )}
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
