import { useLayoutEffect, useRef, useState } from 'react';
import type { PocketWithMembers } from '../../data/types';
import { Icon } from '../../lib/icons';
import { usePockets } from '../../state/pockets';
import { pocketSummary } from './PocketSwitcher';

/** Up to three Pockets fit in the toggle; the rest are in the menu. */
const MAX_SHOWN = 3;

/** The Pockets shown, in list order, always including the open one. */
function shownPockets(pockets: PocketWithMembers[], currentId: string): PocketWithMembers[] {
  const first = pockets.slice(0, MAX_SHOWN);
  if (first.some((p) => p.id === currentId)) return first;
  const current = pockets.find((p) => p.id === currentId);
  return current ? [...first.slice(0, MAX_SHOWN - 1), current] : first;
}

/**
 * Home's Pocket switch, a segmented toggle in the top bar. Tap another Pocket to open it and the
 * thumb slides across; tap the open one for the full list, new and join.
 */
export function PocketToggle({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pockets, current, setCurrent } = usePockets();
  const track = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);
  const [animate, setAnimate] = useState(false);
  const shown = current ? shownPockets(pockets, current.id) : [];
  const names = shown.map((p) => p.name).join('|');

  // The thumb follows the open Pocket's button, re-measured when names or fonts change its width.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const on = el.querySelector<HTMLElement>('.pt-seg.on');
      if (on) setThumb({ x: on.offsetLeft, w: on.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const b of el.querySelectorAll('.pt-seg')) ro.observe(b);
    return () => ro.disconnect();
  }, [current?.id, names]);

  // No slide on the first paint, only when switching.
  useLayoutEffect(() => {
    if (thumb && !animate) requestAnimationFrame(() => setAnimate(true));
  }, [thumb, animate]);

  if (!current) return null;

  return (
    <div className="pocket-toggle glass-pref" role="group" aria-label="Pockets">
      <div className="pt-track" ref={track}>
        {thumb && <span className={`pt-thumb${animate ? ' slide' : ''}`} style={{ width: thumb.w, transform: `translateX(${thumb.x}px)` }} />}
        {shown.map((p) => {
          const on = p.id === current.id;
          return (
            <button
              key={p.id}
              className={`pt-seg press${on ? ' on' : ''}`}
              onClick={on ? onOpenMenu : () => setCurrent(p.id)}
              aria-haspopup={on ? 'menu' : undefined}
              aria-label={on ? `${p.name}, ${pocketSummary(p)}. Show Pockets` : `Switch to ${p.name}`}
            >
              <span className="pt-name">{p.name}</span>
              {on && <Icon name="caret-down" weight="bold" size={11} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
