import { useEffect, useLayoutEffect, useRef } from 'react';
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
/** Glide to a tab with a little overshoot; lift and settle with a springier one; follow a finger closely. */
const GLIDE = 'transform 0.4s cubic-bezier(0.3, 1.18, 0.5, 1)';
const SPRING = 'transform 0.3s cubic-bezier(0.3, 1.3, 0.5, 1)';
const FOLLOW = 'transform 0.1s ease-out';

/**
 * Tab bar with a Liquid Glass lens, as on iOS 26. At rest a soft capsule sits on the open tab. Press and
 * it lifts into a glass lens that magnifies the icons under it; drag and it follows your finger,
 * stretching with speed; let go and it glides to the nearest tab and opens it.
 *
 * The lens only ever changes transform, written straight to the element (no re-render per frame), so the
 * phone's compositor runs the animation and it stays smooth while the next screen renders.
 */
export function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const index = TABS.findIndex((t) => t.path === pathname);
  const lens = useRef<HTMLSpanElement>(null);
  const view = useRef<HTMLSpanElement>(null);
  const state = useRef({ pos: index, lift: 1, stretch: 0 });
  const drag = useRef<{ id: number; moved: boolean; x: number; t: number } | null>(null);
  const timers = useRef({ calm: 0, settle: 0, frame: 0 });

  const apply = (transition: string) => {
    const l = lens.current;
    const v = view.current;
    if (!l || !v) return;
    const { pos, lift, stretch } = state.current;
    const t = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : transition;
    l.style.transition = v.style.transition = t;
    l.style.transform = `translate3d(${pos * 100}%, 0, 0) scale(${lift * (1 + stretch)}, ${lift * (1 - stretch * 0.45)})`;
    // The copy of the icons inside stays lined up with the bar; the lens's scale magnifies it.
    v.style.transform = `translate3d(${pos * -25}%, 0, 0)`;
  };

  const setLifted = (on: boolean) => {
    state.current.lift = on ? LIFT : 1;
    lens.current?.classList.toggle('lifted', on);
  };

  /** Set the lens down on its tab after a moment. */
  const settle = (after: number) => {
    window.clearTimeout(timers.current.settle);
    timers.current.settle = window.setTimeout(() => {
      setLifted(false);
      apply(SPRING);
    }, after);
  };

  // The open tab changed: glide there, stretched for a longer trip, then set the lens down.
  useLayoutEffect(() => {
    if (index < 0) return;
    const s = state.current;
    const far = Math.abs(s.pos - index) >= 0.5;
    s.pos = index;
    if (far) {
      s.stretch = 0.1;
      apply(GLIDE);
      window.clearTimeout(timers.current.calm);
      timers.current.calm = window.setTimeout(() => {
        s.stretch = 0;
        apply(GLIDE);
      }, 160);
    } else apply(lens.current?.style.transform ? GLIDE : 'none');
    if (s.lift > 1) settle(340);
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.calm);
      window.clearTimeout(t.settle);
      cancelAnimationFrame(t.frame);
    };
  }, []);

  const tabAt = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const w = (r.width - 8) / TABS.length;
    return Math.min(TABS.length - 1, Math.max(0, (e.clientX - r.left - 4) / w - 0.5));
  };

  const release = (to: number) => {
    drag.current = null;
    cancelAnimationFrame(timers.current.frame);
    window.clearTimeout(timers.current.calm);
    const s = state.current;
    s.pos = to;
    s.stretch = 0;
    apply(GLIDE);
    if (to === index) settle(200);
    // Start the glide first, then open the screen: the compositor keeps animating while it renders.
    else requestAnimationFrame(() => requestAnimationFrame(() => navigate(TABS[to].path, { replace: true })));
  };

  return (
    <nav
      className="tabbar glass-pref"
      aria-label="Tabs"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, moved: false, x: e.clientX, t: e.timeStamp };
        window.clearTimeout(timers.current.settle);
        setLifted(true);
        state.current.pos = tabAt(e);
        apply(SPRING);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (d?.id !== e.pointerId) return;
        if (!d.moved && Math.abs(e.clientX - d.x) < 4) return;
        const speed = Math.abs(e.clientX - d.x) / Math.max(8, e.timeStamp - d.t);
        Object.assign(d, { moved: true, x: e.clientX, t: e.timeStamp });
        const s = state.current;
        s.pos = tabAt(e);
        s.stretch = Math.min(MAX_STRETCH, speed * 0.12);
        cancelAnimationFrame(timers.current.frame);
        timers.current.frame = requestAnimationFrame(() => apply(FOLLOW));
        // Once the finger pauses, the lens springs back to round.
        window.clearTimeout(timers.current.calm);
        timers.current.calm = window.setTimeout(() => {
          s.stretch = 0;
          apply(SPRING);
        }, 90);
      }}
      onPointerUp={(e) => drag.current?.id === e.pointerId && release(Math.round(tabAt(e)))}
      onPointerCancel={() => drag.current && release(index)}
    >
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
      {index >= 0 && (
        <span className="tab-lens" ref={lens} aria-hidden>
          <span className="tab-lens-view" ref={view}>
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
