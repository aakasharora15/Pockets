import { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { Sheet, SheetHeader } from '../../components/Sheet';
import { createSharedPocket } from '../../data/pockets';
import { CURRENCIES, currency, suggestedCurrency, type CurrencyCode } from '../../lib/currencies';
import { useMe } from '../../state/session';
import { usePockets } from '../../state/pockets';
import { useUi } from '../../state/ui';

export function NewPocketSheet({ onClose }: { onClose: () => void }) {
  const { user, profile } = useMe();
  const { current, setCurrent } = usePockets();
  const { setInvitePocketId } = useUi();
  const [name, setName] = useState('');
  const [currencies, setCurrencies] = useState<CurrencyCode[]>(current?.currencies ?? ['GBP']);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = name.trim().length > 0 && currencies.length > 0;

  // A handful first (this Pocket's, the phone's own, then the common ones); More shows the rest.
  const lead = [
    ...new Set([...(current?.currencies ?? []), ...(suggestedCurrency() ? [suggestedCurrency()!] : []), 'GBP', 'EUR', 'USD', 'INR'] as CurrencyCode[]),
  ].slice(0, 6);
  const shown = more ? [...lead.map((c) => currency(c)), ...CURRENCIES.filter((c) => !lead.includes(c.code))] : lead.map((c) => currency(c));

  const create = async (invite: boolean) => {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const id = await createSharedPocket(name.trim(), currencies, { uid: user.uid, name: profile.name, initials: profile.initials });
      setCurrent(id);
      onClose();
      if (invite) setInvitePocketId(id);
    } catch {
      setError("Couldn't create the Pocket. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} label="New shared Pocket">
      <SheetHeader title="New shared Pocket" onCancel={onClose} action={{ label: 'Create', onClick: () => create(false), disabled: !valid || busy }} />
      <label className="field">
        <input autoFocus placeholder="Pocket name" aria-label="Pocket name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <span className="field-label sheet-label">Currencies</span>
      <div className="chip-wrap">
        {shown.map((c) => {
          const on = currencies.includes(c.code);
          return (
            <button
              key={c.code}
              className={`chip press${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => setCurrencies((cs) => (on ? cs.filter((x) => x !== c.code) : [...cs, c.code]))}
            >
              {c.symbol} {c.short}
            </button>
          );
        })}
        {!more && (
          <button className="chip press" onClick={() => setMore(true)}>
            More
          </button>
        )}
      </div>
      <div className="owner-note">
        <Avatar initials={profile.initials} size={36} />
        <span>You'll be the owner. You can invite people next.</span>
      </div>
      {error && <span className="helper error">{error}</span>}
      <button className="primary-btn sheet-bottom press" disabled={!valid || busy} onClick={() => create(true)}>
        Create and invite
      </button>
    </Sheet>
  );
}
