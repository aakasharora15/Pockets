import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Swipeable pages with a page indicator: one card at a time, a dot per page underneath with the one
 * showing highlighted. Swiping or tapping a dot reports the new page. Opens on `index`, and again
 * whenever `resetKey` changes (a different Pocket).
 */
export function CardPager({
  pages,
  labels,
  index,
  onChange,
  resetKey,
  label,
}: {
  pages: ReactNode[];
  /** Spoken name of each page, for its dot. */
  labels: string[];
  index: number;
  onChange: (i: number) => void;
  resetKey: string;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(index);
  const frame = useRef(0);
  const pageNow = useRef(page);
  pageNow.current = page;

  const leftOf = (i: number) => {
    const el = track.current;
    const kid = el?.children[i] as HTMLElement | undefined;
    return el && kid ? kid.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft) : 0;
  };

  // Open on the page asked for, without animating.
  useLayoutEffect(() => {
    const i = Math.min(Math.max(0, index), pages.length - 1);
    track.current?.scrollTo({ left: leftOf(i) });
    setPage(i);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = track.current;
      if (!el) return;
      const kids = [...el.children] as HTMLElement[];
      const mid = el.scrollLeft + el.clientWidth / 2;
      const dist = (k: HTMLElement) => Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid);
      let i = 0;
      kids.forEach((k, j) => {
        if (dist(k) < dist(kids[i])) i = j;
      });
      if (i === pageNow.current) return;
      setPage(i);
      onChange(i);
    });
  };

  if (pages.length === 1) return <div className="cards-single">{pages}</div>;
  return (
    <div className="cards-pager">
      <div className="cards-track" ref={track} onScroll={onScroll}>
        {pages}
      </div>
      <div className="page-dots" role="tablist" aria-label={label}>
        {pages.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === page}
            aria-label={labels[i]}
            className={`page-dot${i === page ? ' on' : ''}`}
            onClick={() => track.current?.scrollTo({ left: leftOf(i), behavior: 'smooth' })}
          />
        ))}
      </div>
    </div>
  );
}
