import { Icon } from '../lib/icons';

const PIN_KEYS: [string, string][] = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['', ''], ['0', ''], ['del', ''],
];

/** Glass PIN keypad (screens 01e and 02). */
export function PinPad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <div className="pin-pad">
      {PIN_KEYS.map(([d, letters], i) => {
        if (!d) return <div key={i} className="pin-key blank" />;
        if (d === 'del')
          return (
            <button key={i} className="pin-key blank press" aria-label="Delete" onClick={() => onKey('del')}>
              <Icon name="backspace" size={26} />
            </button>
          );
        return (
          <button key={i} className="pin-key press" onClick={() => onKey(d)}>
            <span className="pin-digit">{d}</span>
            {letters && <span className="pin-letters">{letters}</span>}
          </button>
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
export function AmountPad({ onKey, decimals }: { onKey: (k: string) => void; decimals: boolean }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
  return (
    <div className="amount-pad">
      {keys.map((k) => {
        if (k === '.' && !decimals) return <div key={k} className="amount-key blank" />;
        if (k === 'del')
          return (
            <button key={k} className="amount-key blank press" aria-label="Delete" onClick={() => onKey('del')}>
              <Icon name="backspace" size={28} />
            </button>
          );
        return (
          <button key={k} className="amount-key press" onClick={() => onKey(k)}>
            {k}
          </button>
        );
      })}
    </div>
  );
}
