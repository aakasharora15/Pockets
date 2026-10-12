import { useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../lib/icons';

interface RowProps {
  icon: string;
  /** Icon tile colour, as in iOS Settings. */
  tint?: string;
  label: string;
  value?: ReactNode;
  first?: boolean;
  chevron?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

/** Settings-style row: neutral 29px tile with white outline icon, label, value, caret. */
export function SettingsRow({ icon, tint, label, value, first, chevron = true, onClick, children }: RowProps) {
  const body = (
    <>
      <div className={`row-tile${tint ? ' tinted' : ''}`} style={tint ? { background: tint } : undefined}>
        <Icon name={icon} weight={tint ? 'fill' : 'regular'} />
      </div>
      <div className={`row-body${first ? '' : ' sep'}`}>
        <span className="row-label">{label}</span>
        {value !== undefined && <span className="row-value">{value}</span>}
        {children}
        {chevron && <Icon name="caret-right" weight="bold" size={13} color="var(--chevron)" />}
      </div>
    </>
  );
  return onClick ? (
    <button className="row press-row" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="row">{body}</div>
  );
}

const MENU_ITEM = 44;

/**
 * A setting with a few choices, as iOS does it: the current choice on the right with up/down
 * chevrons, and a menu of the choices when tapped.
 */
export function SettingsMenuRow<T extends string>({
  icon,
  tint,
  label,
  value,
  options,
  onChange,
  first,
}: {
  icon: string;
  tint?: string;
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  first?: boolean;
}) {
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  const open = (e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const height = options.length * MENU_ITEM + 12;
    // Below the row, or above it when there isn't room above the tab bar.
    const top = r.bottom + 6 + height > window.innerHeight - 110 ? r.top - height - 6 : r.bottom + 6;
    setAt({ top, right: window.innerWidth - r.right + 8 });
  };
  const pick = (v: T) => {
    setAt(null);
    onChange(v);
  };
  return (
    <>
      <button className="row press-row" onClick={open} aria-haspopup="menu" aria-expanded={!!at}>
        <div className={`row-tile${tint ? ' tinted' : ''}`} style={tint ? { background: tint } : undefined}>
          <Icon name={icon} weight={tint ? 'fill' : 'regular'} />
        </div>
        <div className={`row-body${first ? '' : ' sep'}`}>
          <span className="row-label">{label}</span>
          <span className="row-value menu-value">
            {options.find(([v]) => v === value)?.[1]}
            <Icon name="caret-up-down" weight="bold" size={13} />
          </span>
        </div>
      </button>
      {at &&
        createPortal(
          <>
            <div className="menu-dismiss" onClick={() => setAt(null)} />
            <div className="glass-menu settings-menu" role="menu" style={{ top: at.top, right: at.right }}>
              {options.map(([v, name]) => (
                <button key={v} role="menuitemradio" aria-checked={v === value} className="menu-item" onClick={() => pick(v)}>
                  <span className="menu-check">{v === value && <Icon name="check" weight="bold" />}</span>
                  <span className="menu-name">{name}</span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="group">
      {title && <span className="section-label">{title}</span>}
      <div className="group-card shadow">{children}</div>
    </div>
  );
}
