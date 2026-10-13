import type { ReactNode } from 'react';
import { tap } from '../lib/haptics';
import { Icon } from '../lib/icons';

/**
 * A keypad key with an invisible iOS switch inside. Your tap flips the switch, and flipping a
 * switch is what makes an iPhone play its haptic tick (a web app can't trigger one from code on
 * recent iOS). Android vibrates instead (see haptics.ts).
 */
function Key({ className, label, onPress, children }: { className: string; label: string; onPress: () => void; children: ReactNode }) {
  return (
    <label
      className={`${className} press`}
      role="button"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPress();
        }
      }}
    >
      <input ref={(el) => el?.setAttribute('switch', '')} type="checkbox" className="key-haptic" tabIndex={-1} aria-hidden="true" onChange={onPress} />
      {children}
    </label>
  );
}

const PIN_KEYS: [string, string][] = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['', ''], ['0', ''], ['del', ''],
];

/** PIN keypad for setting and entering the app PIN. */
export function PinPad({ onKey: send }: { onKey: (k: string) => void }) {
  const onKey = (k: string) => {
    tap();
    send(k);
  };
  return (
    <div className="pin-pad">
      {PIN_KEYS.map(([d, letters], i) => {
        if (!d) return <div key={i} className="pin-key blank" />;
        if (d === 'del')
          return (
            <Key key={i} className="pin-key blank" label="Delete" onPress={() => onKey('del')}>
              <Icon name="backspace" size={26} />
            </Key>
          );
        return (
          <Key key={i} className="pin-key" label={d} onPress={() => onKey(d)}>
            <span className="pin-digit">{d}</span>
            {letters && <span className="pin-letters">{letters}</span>}
          </Key>
        );
      })}
    </div>
  );
}

export function PinDots({ filled, error }: { filled: number; error?: boolean }) {
  return (
    <div className={`pin-dots${error ? ' shake' : ''}`} aria-label={`${filled} of 4 digits entered`}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`pin-dot${i < filled ? ' on' : ''}`} />
      ))}
    </div>
  );
}

/** Glass amount keypad (expense sheet). "." is hidden for currencies without decimals (₹). */
export function AmountPad({ onKey: send, decimals }: { onKey: (k: string) => void; decimals: boolean }) {
  const onKey = (k: string) => {
    tap();
    send(k);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  return (
    <div className="amount-pad">
      {keys.map((k) => {
        if (k === '.' && !decimals) return <div key={k} className="amount-key blank" />;
        if (k === 'del')
          return (
            <Key key={k} className="amount-key blank" label="Delete" onPress={() => onKey('del')}>
              <Icon name="backspace" size={28} />
            </Key>
          );
        return (
          <Key key={k} className="amount-key" label={k === '.' ? 'Decimal point' : k} onPress={() => onKey(k)}>
            {k}
          </Key>
        );
      })}
    </div>
  );
}
