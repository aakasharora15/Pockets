import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { BackButton } from '../../components/Chrome';
import { completeSetup } from '../../data/pockets';
import { CURRENCIES, type CurrencyCode } from '../../lib/currencies';
import { Icon } from '../../lib/icons';
import { firstName, initialsFor } from '../../lib/initials';
import { useLock } from '../../state/lock';
import { usePockets } from '../../state/pockets';
import { useSession } from '../../state/session';
import { useUi } from '../../state/ui';
import { Progress } from './Progress';
import { SetPinScreen } from './PinScreen';

interface Draft {
  step: 1 | 2 | 3 | 4;
  name: string;
  currencies: CurrencyCode[];
  share: boolean;
}

const KEY = 'spendr.setup';

function loadDraft(fallbackName: string): Draft {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Draft;
  } catch {
    /* ignore */
  }
  return { step: 1, name: fallbackName, currencies: [], share: false };
}

/** 01c–01f · Setup: name → currencies → app PIN → share? */
export function Setup() {
  const { user, logOut } = useSession();
  const { createPin, state: pinState } = useLock();
  const { setCurrent } = usePockets();
  const { showToast, setInvitePocketId } = useUi();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(() => loadDraft(user?.displayName ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  const go = (step: Draft['step']) => setDraft((d) => ({ ...d, step }));
  const initials = initialsFor(draft.name);

  const finish = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError('');
    try {
      const name = draft.name.trim();
      const { personalId, sharedId } = await completeSetup({
        uid: user.uid,
        email: user.email ?? '',
        name,
        initials,
        currencies: draft.currencies,
        share: draft.share,
      });
      sessionStorage.removeItem(KEY);
      setCurrent(sharedId ?? personalId);
      if (sharedId) setInvitePocketId(sharedId);
      showToast(`Welcome, ${firstName(name)}`);
      navigate('/', { replace: true });
    } catch {
      setError("Couldn't finish setting up. Check your connection and try again.");
      setBusy(false);
    }
  };

  if (draft.step === 3) {
    return (
      <SetPinScreen
        step={3}
        onBack={() => go(2)}
        onDone={async (pin) => {
          await createPin(pin);
          go(4);
        }}
      />
    );
  }

  return (
    <div className="screen">
      <BackButton
        onClick={() => {
          if (draft.step === 1) {
            sessionStorage.removeItem(KEY);
            void logOut();
          } else if (draft.step === 4 && pinState === 'unlocked') go(2);
          else go((draft.step - 1) as Draft['step']);
        }}
      />
      <Progress step={draft.step} />

      {draft.step === 1 && (
        <>
          <div className="flow-head">
            <span className="flow-title">What should we call you?</span>
            <span className="flow-sub">Your name shows on expenses you add to shared Pockets.</span>
          </div>
          <div className="setup-body">
            <label className="field">
              <input
                autoFocus
                autoComplete="name"
                autoCapitalize="words"
                placeholder="Your name"
                aria-label="Your name"
                maxLength={60}
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && initials && go(2)}
              />
            </label>
            {initials && (
              <div className="shown-as">
                <Avatar initials={initials} size={44} />
                <div className="shown-as-text">
                  <span className="shown-as-title">Shown as {initials}</span>
                  <span className="shown-as-sub">Made from your initials. You can change it later.</span>
                </div>
              </div>
            )}
          </div>
          <button className="primary-btn bottom-primary press" disabled={!initials} onClick={() => go(2)}>
            Continue
          </button>
        </>
      )}

      {draft.step === 2 && (
        <>
          <div className="flow-head">
            <span className="flow-title">Which currencies do you spend in?</span>
            <span className="flow-sub">Pick one or more. The first one you pick is your main currency.</span>
          </div>
          <div className="setup-list">
            <div className="group-card">
              {CURRENCIES.map((c, i) => {
                const on = draft.currencies.includes(c.code);
                const main = draft.currencies[0] === c.code;
                return (
                  <button
                    key={c.code}
                    className="cur-row"
                    aria-pressed={on}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        currencies: on ? d.currencies.filter((x) => x !== c.code) : [...d.currencies, c.code],
                      }))
                    }
                  >
                    <div className="symbol-tile">{c.symbol}</div>
                    <div className={`cur-body${i ? ' sep' : ''}`}>
                      <span className="cur-name">{c.name}</span>
                      {main && <span className="badge">Main</span>}
                      <span className={`check-circle${on ? ' on' : ''}`}>{on && <Icon name="check" weight="bold" />}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <button className="primary-btn bottom-primary press" disabled={draft.currencies.length === 0} onClick={() => go(pinState === 'unlocked' ? 4 : 3)}>
            {draft.currencies.length ? `Continue · ${draft.currencies.length} selected` : 'Continue'}
          </button>
        </>
      )}

      {draft.step === 4 && (
        <>
          <div className="flow-head">
            <span className="flow-title">Share with someone?</span>
            <span className="flow-sub">You always get a private Personal Pocket. A shared Pocket is for expenses you track with someone else.</span>
          </div>
          <div className="choice-stack">
            {[
              { share: false, icon: 'user', title: 'Just me for now', sub: 'Start with your Personal Pocket. You can share from Settings any time.' },
              { share: true, icon: 'users-three', title: 'Share with someone', sub: 'Create a shared Pocket and invite them by QR code, link or code.' },
            ].map((o) => {
              const on = draft.share === o.share;
              return (
                <button key={o.title} className={`choice press${on ? ' on' : ''}`} aria-pressed={on} onClick={() => setDraft((d) => ({ ...d, share: o.share }))}>
                  <div className="choice-tile">
                    <Icon name={o.icon} />
                  </div>
                  <div className="choice-text">
                    <span className="choice-title">{o.title}</span>
                    <span className="choice-sub">{o.sub}</span>
                  </div>
                  <span className={`check-circle${on ? ' on' : ''}`}>{on && <Icon name="check" weight="bold" />}</span>
                </button>
              );
            })}
            {error && <span className="helper error">{error}</span>}
          </div>
          <button className="primary-btn bottom-primary press" disabled={busy} onClick={finish}>
            Continue
          </button>
        </>
      )}
    </div>
  );
}
