import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

/** How deep a screen sits: tabs are 0, Settings pages 1, a tag's page 2. */
export function depthOf(path: string): number {
  if (path.startsWith('/settings/tags/')) return 2;
  if (path.startsWith('/settings/') || path.startsWith('/join')) return 1;
  return 0;
}

const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/**
 * Screen transitions as on iOS: a deeper screen slides in from the right, going back slides the
 * previous one in from the left, and switching tabs is instant. In the installed app (where iOS
 * has no back gesture of its own) dragging from the left edge goes back, following the finger.
 */
export function RouteStage({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const depth = depthOf(pathname);
  const prev = useRef(depth);
  const dir = useMemo(() => {
    const d = depth > prev.current ? 'push' : depth < prev.current ? 'pop' : 'none';
    prev.current = depth;
    return d;
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const [dx, setDx] = useState<number | null>(null);

  const end = (go: boolean) => {
    drag.current = null;
    const el = stage.current;
    if (go && el) {
      setDx(el.clientWidth);
      window.setTimeout(() => {
        el.querySelector<HTMLButtonElement>('.back-btn')?.click();
        setDx(null);
      }, 180);
    } else setDx(null);
  };

  return (
    <div
      key={pathname}
      ref={stage}
      className={`route route-${dir}${dx !== null ? ' dragging' : ''}`}
      style={dx !== null ? { transform: `translateX(${dx}px)` } : undefined}
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (depth === 0 || !standalone() || e.clientX - rect.left > 24) return;
        if ((e.target as Element).closest('.sheet, .action-sheet')) return;
        drag.current = { x: e.clientX, id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current?.id === e.pointerId) setDx(Math.max(0, e.clientX - drag.current.x));
      }}
      onPointerUp={(e) => {
        if (drag.current?.id !== e.pointerId) return;
        end((dx ?? 0) > e.currentTarget.clientWidth * 0.33);
      }}
      onPointerCancel={() => drag.current && end(false)}
    >
      {children}
    </div>
  );
}
