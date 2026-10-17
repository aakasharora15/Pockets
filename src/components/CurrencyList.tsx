import { useMemo, useState } from 'react';
import { CURRENCIES, suggestedCurrency, type CurrencyCode } from '../lib/currencies';
import { Icon } from '../lib/icons';

/**
 * Every currency as a tappable list, with a search box. Chosen ones and the phone's local currency
 * come first, so most people never scroll; search by name, code or symbol ("yen", "CHF", "₹").
 */
export function CurrencyList({
  selected,
  onToggle,
  mainBadge = false,
  disabled = false,
  rowClass = 'cur-row',
}: {
  selected: CurrencyCode[];
  onToggle: (code: CurrencyCode) => void;
  /** Mark the first chosen one "Main" (setup). */
  mainBadge?: boolean;
  disabled?: boolean;
  rowClass?: string;
}) {
  const [query, setQuery] = useState('');
  const suggested = useMemo(() => suggestedCurrency(), []);
  // Order is fixed when the list opens, so rows don't jump about as they're ticked.
  const [pinned] = useState(() => [...new Set([...selected, ...(suggested ? [suggested] : [])])]);

  const q = query.trim().toLowerCase();
  const rows = q
    ? CURRENCIES.filter(
        (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.symbol.toLowerCase() === q || c.plural.toLowerCase().includes(q),
      )
    : [...pinned.map((code) => CURRENCIES.find((c) => c.code === code)!), ...CURRENCIES.filter((c) => !pinned.includes(c.code))];

  return (
    <div className="currency-list">
      <label className="currency-search">
        <Icon name="magnifying-glass" size={18} />
        <input type="search" placeholder="Search currencies" aria-label="Search currencies" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="group-card shadow">
        {rows.length === 0 && <div className="currency-none">No currency called “{query.trim()}” yet.</div>}
        {rows.map((c, i) => {
          const on = selected.includes(c.code);
          const main = mainBadge && selected[0] === c.code;
          return (
            <button key={c.code} className={`${rowClass} press-row`} aria-pressed={on} disabled={disabled} onClick={() => onToggle(c.code)}>
              <div className={`symbol-tile${c.symbol.length > 2 ? ' long' : ''}`}>{c.symbol}</div>
              <div className={`cur-body${i ? ' sep' : ''}`}>
                <span className="cur-name">{c.name}</span>
                {main && <span className="badge">Main</span>}
                {!q && c.code === suggested && !on && <span className="cur-hint">Suggested</span>}
                <span className="cur-code">{c.code}</span>
                <span className={`check-circle${on ? ' on' : ''}`}>{on && <Icon name="check" weight="bold" />}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
