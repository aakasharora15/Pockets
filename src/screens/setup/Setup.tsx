import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { BackButton } from '../../components/Chrome';
import { completeSetup } from '../../data/pockets';
import { CurrencyList } from '../../components/CurrencyList';
import { suggestedCurrency, type CurrencyCode } from '../../lib/currencies';
import { Icon } from '../../lib/icons';
import { firstName, initialsFor } from '../../lib/initials';
import { useLock } from '../../state/lock';
import { usePockets } from '../../state/pockets';
import { useSession } from '../../state/session';
import { useUi } from '../../state/ui';
import { Switch } from '../../components/Switch';
import { Progress } from './Progress';
import { SetPinScreen } from './PinScreen';

type Start = 'personal' | 'create' | 'join';

interface Draft {
  step: 1 | 2 | 3 | 4;
  name: string;
  currencies: CurrencyCode[];
  start: Start;
  /** Name for the shared Pocket when creating one. */
  pocketName: string;
  /** Also keep a Personal Pocket when starting with a shared one. */
  keepPersonal: boolean;
}

const START_OPTIONS: { start: Start; icon: string; title: string; sub: string }[] = [
  { start: 'personal', icon: 'user', title: 'Just me', sub: 'A private Pocket for your own spending. You can share later.' },
  { start: 'create', icon: 'users-three', title: 'Create a shared Pocket', sub: 'For a home, flat or trip. Invite people when it’s ready.' },
  { start: 'join', icon: 'qr-code', title: 'Join a shared Pocket', sub: 'Someone sent you a code or link.' },
];

const KEY = 'spendr.setup';

function loadDraft(fallbackName: string): Draft {
  // Opened from an invite link: joining is the likely choice.
  let invited = false;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Draft>;
      if (d.start) return d as Draft;
    }
    invited = !!sessionStorage.getItem('spendr.join');
  } catch {
    /* ignore */
  }
  // The phone's local currency starts ticked; one tap to change.
  const local = suggestedCurrency();
  return { step: 1, name: fallbackName, currencies: local ? [local] : [], start: invited ? 'join' : 'personal', pocketName: 'Home', keepPersonal: false };
}

/** First-run setup: name → currencies → app PIN → just me, create or join a shared Pocket. */
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
      const shared = draft.start !== 'personal';
      const { personalId, sharedId } = await completeSetup({
        uid: user.uid,
        email: user.email ?? '',
        name,
        initials,
        currencies: draft.currencies,
        sharedName: draft.start === 'create' ? draft.pocketName.trim() : undefined,
        // Personal is always created (it's where rescued expenses go) but stays out of sight.
        hidePersonal: shared && !draft.keepPersonal,
      });
      sessionStorage.removeItem(KEY);
      setCurrent(sharedId ?? personalId);
      if (sharedId) setInvitePocketId(sharedId);
      showToast(`Welcome, ${firstName(name)}`);
      // An invite link opened before signing up is picked up on its own; otherwise ask for the code.
      const invited = !!sessionStorage.getItem('spendr.join');
      navigate(draft.start === 'join' && !invited ? '/join' : '/', { replace: true });
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
            <CurrencyList
              mainBadge
              selected={draft.currencies}
              onToggle={(code) =>
                setDraft((d) => ({
                  ...d,
                  currencies: d.currencies.includes(code) ? d.currencies.filter((x) => x !== code) : [...d.currencies, code],
                }))
              }
            />
          </div>
          <button className="primary-btn bottom-primary press" disabled={draft.currencies.length === 0} onClick={() => go(pinState === 'unlocked' ? 4 : 3)}>
            {draft.currencies.length ? `Continue · ${draft.currencies.length} selected` : 'Continue'}
          </button>
        </>
      )}

      {draft.step === 4 && (
        <>
          <div className="flow-head">
            <span className="flow-title">How will you use Spendr?</span>
            <span className="flow-sub">A shared Pocket is for expenses you track with someone else, like a partner or flatmates.</span>
          </div>
          <div className="choice-stack">
            {START_OPTIONS.map((o) => {
              const on = draft.start === o.start;
              return (
                <button
                  key={o.start}
                  className={`choice press${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setDraft((d) => ({ ...d, start: o.start }))}
                >
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
            {draft.start !== 'personal' && (
              <div className="group-card setup-extra">
                {draft.start === 'create' && (
                  <label className="setup-extra-row">
                    <span className="row-label">Pocket name</span>
                    <input
                      aria-label="Pocket name"
                      maxLength={60}
                      value={draft.pocketName}
                      placeholder="Home"
                      onChange={(e) => setDraft((d) => ({ ...d, pocketName: e.target.value }))}
                    />
                  </label>
                )}
                <div className={`setup-extra-row${draft.start === 'create' ? ' sep' : ''}`}>
                  <div className="setup-extra-text">
                    <span className="row-label">Also keep a Personal Pocket</span>
                    <span className="setup-extra-sub">Private expenses only you can see. You can change this in Settings.</span>
                  </div>
                  <Switch on={draft.keepPersonal} label="Also keep a Personal Pocket" onChange={(v) => setDraft((d) => ({ ...d, keepPersonal: v }))} />
                </div>
              </div>
            )}
            {error && <span className="helper error">{error}</span>}
          </div>
          <button className="primary-btn bottom-primary press" disabled={busy || (draft.start === 'create' && !draft.pocketName.trim())} onClick={finish}>
            {draft.start === 'join' ? 'Continue to join' : 'Continue'}
          </button>
        </>
      )}
    </div>
  );
}
