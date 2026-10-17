import { useState } from 'react';
import { BackButton } from '../../components/Chrome';
import { updatePocket } from '../../data/pockets';
import { CurrencyList } from '../../components/CurrencyList';
import type { CurrencyCode } from '../../lib/currencies';
import { useCurrentPocket } from '../../state/pockets';
import { useMe } from '../../state/session';
import { useUi } from '../../state/ui';

export function Currencies() {
  const pocket = useCurrentPocket();
  const { user } = useMe();
  const { showToast } = useUi();
  const [busy, setBusy] = useState(false);
  const isOwner = pocket.ownerUid === user.uid;
  const people = pocket.type === 'personal' ? 1 : pocket.members.length;
  const who = people <= 1 ? 'you spend in' : people === 2 ? 'you both spend in' : 'you all spend in';
  const phones = people <= 1 ? '' : people === 2 ? 'Applies to both phones. ' : 'Applies to everyone in this Pocket. ';

  const toggle = async (code: CurrencyCode) => {
    if (!isOwner || busy) return;
    const on = pocket.currencies.includes(code);
    if (on && pocket.currencies.length === 1) return;
    const next = on ? pocket.currencies.filter((c) => c !== code) : [...pocket.currencies, code];
    setBusy(true);
    try {
      await updatePocket(pocket.id, { currencies: next });
    } catch {
      showToast("Couldn't save. Try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="scroll sub-scroll">
        <div className="page-head">
          <span className="page-title">Currencies</span>
          <span className="page-sub">Choose the currencies {who}. Only these appear on Home, in New expense and in filters.</span>
        </div>
        <CurrencyList selected={pocket.currencies} onToggle={(code) => void toggle(code)} disabled={!isOwner} />
        <div className="footnote">
          {phones}Turning a currency off hides it; its expenses stay in your history and exports. At least one must stay on.
          {!isOwner && ' Only the owner can change these.'}
        </div>
      </div>
      <div className="fade-top" />
      <BackButton to="/settings" />
    </div>
  );
}
