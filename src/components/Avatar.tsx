import type { CSSProperties } from 'react';

/** Avatar sizes used in the design: size → font size. */
const FONT: Record<number, number> = { 28: 10, 36: 13, 42: 15, 44: 16, 72: 26 };

interface Props {
  initials: string;
  size: 28 | 36 | 42 | 44 | 72;
  /** Ring colour when stacked (matches the surface behind). */
  ring?: string;
  overlap?: boolean;
  style?: CSSProperties;
}

export function Avatar({ initials, size, ring, overlap, style }: Props) {
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: FONT[size],
        boxShadow: `0 0 0 2px ${ring ?? 'transparent'}`,
        marginLeft: overlap ? -6 : 0,
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

export function AvatarStack({ initials, size, ring }: { initials: string[]; size: 28 | 36; ring: string }) {
  if (initials.length === 1) return <Avatar initials={initials[0]} size={size} />;
  return (
    <div className="avatar-stack">
      {initials.map((ini, i) => (
        <Avatar key={ini + i} initials={ini} size={size} ring={ring} overlap={i > 0} />
      ))}
    </div>
  );
}
