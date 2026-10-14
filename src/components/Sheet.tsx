import { useEffect, useRef, useState, type ReactNode } from 'react';

interface SheetProps {
  onClose: () => void;
  /** Distance from the top of the screen (default: the large detent, just below the status bar). */
  top?: number | string;
  className?: string;
  children: ReactNode;
  /** Called when the grabber is dragged up or down past a threshold. */
  onDrag?: (direction: 'up' | 'down') => void;
  label: string;
}

/** Bottom sheet with backdrop (tap to close) and grabber. */
export function Sheet({ onClose, top = 'calc(var(--top) + 4px)', className = '', children, onDrag, label }: SheetProps) {
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const end = () => {
    if (start.current !== null) {
      if (dy > 120) {
        if (onDrag) onDrag('down');
        else onClose();
      }
      else if (dy < -60 && onDrag) onDrag('up');
    }
    start.current = null;
    setDy(0);
  };

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div
        className={`sheet ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={{ top, transform: dy > 0 ? `translateY(${dy}px)` : undefined }}
      >
        <div
          className="grabber-hit"
          onPointerDown={(e) => {
            start.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => start.current !== null && setDy(e.clientY - start.current)}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <div className="grabber" />
        </div>
        {children}
      </div>
    </>
  );
}

interface HeaderProps {
  title: string;
  onCancel: () => void;
  action?: { label: string; onClick: () => void; disabled?: boolean };
}

export function SheetHeader({ title, onCancel, action }: HeaderProps) {
  return (
    <div className="sheet-head">
      <button className="press" onClick={onCancel}>
        Cancel
      </button>
      <span className="sheet-head-title">{title}</span>
      {action ? (
        <button className="sheet-head-action press" disabled={action.disabled} onClick={action.onClick}>
          {action.label}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

interface ActionSheetProps {
  title: string;
  message?: string;
  actions: { label: string; onClick: () => void; destructive?: boolean }[];
  onCancel: () => void;
}

export function ActionSheet({ title, message, actions, onCancel }: ActionSheetProps) {
  return (
    <>
      <div className="backdrop" onClick={onCancel} />
      <div className="action-sheet" role="alertdialog" aria-label={title}>
        <div className="action-group">
          <div className="action-head">
            <span className="action-title">{title}</span>
            {message && <span className="action-msg">{message}</span>}
          </div>
          {actions.map((a) => (
            <button key={a.label} className={`action-btn sep press${a.destructive ? ' destructive' : ''}`} onClick={a.onClick}>
              {a.label}
            </button>
          ))}
        </div>
        <button className="action-cancel press" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}
