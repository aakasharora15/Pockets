import type { ReactNode } from 'react';
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

export function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="group">
      {title && <span className="section-label">{title}</span>}
      <div className="group-card shadow">{children}</div>
    </div>
  );
}
