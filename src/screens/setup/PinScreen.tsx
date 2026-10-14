import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BackButton } from '../../components/Chrome';
import { PinDots, PinPad } from '../../components/Keypads';
import { auth } from '../../firebase';
import { authMessage } from '../../lib/authErrors';
import { buzz } from '../../lib/haptics';
import { Icon } from '../../lib/icons';
import { PIN_RESET_KEY } from '../../state/lock';
import { useSession } from '../../state/session';
import { Logo } from '../auth/Logo';
import { Progress } from './Progress';

interface SetProps {
  /** Shows the setup progress bar (step 3 of 4). */
  step?: number;
  onBack?: () => void;
  onDone: (pin: string) => Promise<void> | void;
}

/** Set the app PIN. Entered twice; a mismatch starts again. */
export function SetPinScreen({ step, onBack, onDone }: SetProps) {
  const [first, setFirst] = useState<string | null>(null);
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  // Digits typed while the fourth dot is showing belong to the confirmation, not the bin.
  const carry = useRef('');

  const typed = useRef('');
  typed.current = digits;

  const press = (k: string) => {
    setError(false);
    if (k !== 'del' && typed.current.length >= 4) {
      if (first === null && carry.current.length < 4) carry.current += k;
      return;
    }
    setDigits((d) => (k === 'del' ? d.slice(0, -1) : d.length < 4 ? d + k : d));
  };

  useEffect(() => {
    if (digits.length !== 4) return;
    const t = window.setTimeout(() => {
      if (first === null) {
        setFirst(digits);
        setDigits(carry.current);
        carry.current = '';
      } else if (first === digits) {
        void onDone(digits);
      } else {
        setFirst(null);
        setDigits('');
        setError(true);
        buzz();
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen pin-screen">
      {onBack && <BackButton onClick={first !== null ? () => (setFirst(null), setDigits('')) : onBack} />}
      {step !== undefined && <Progress step={step} />}
      <div className="pin-head">
        <span className="pin-title">{first === null ? 'Set an app PIN' : 'Confirm your PIN'}</span>
        <span className={`pin-sub${error ? ' error' : ''}`}>
          {error ? "PINs didn't match. Try again." : '4 digits to open Spendr quickly on this phone.'}
        </span>
      </div>
      <PinDots filled={digits.length} error={error} />
      <PinPad onKey={press} />
    </div>
  );
}

export function UnlockScreen({
  onUnlock,
  onReset,
  onSignOut,
}: {
  onUnlock: (pin: string) => Promise<boolean>;
  onReset: () => Promise<void>;
  onSignOut: () => void;
}) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);
  const [resetting, setResetting] = useState(false);

  const press = (k: string) => {
    setError(false);
    setDigits((d) => (k === 'del' ? d.slice(0, -1) : d.length < 4 ? d + k : d));
  };

  useEffect(() => {
    if (digits.length !== 4) return;
    let live = true;
    onUnlock(digits).then((ok) => {
      if (!ok && live) {
        setDigits('');
        setError(true);
        buzz();
      }
    });
    return () => {
      live = false;
    };
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps

  if (resetting) return <ResetPin onBack={() => setResetting(false)} onReset={onReset} onSignOut={onSignOut} />;

  return (
    <div className="screen pin-screen">
      <div className="unlock-logo">
        <Logo />
      </div>
      <div className="pin-head">
        <span className="pin-title">Enter your PIN</span>
        <span className={`pin-sub${error ? ' error' : ''}`}>{error ? 'Wrong PIN. Try again.' : 'Your 4-digit app PIN for this phone.'}</span>
      </div>
      <PinDots filled={digits.length} error={error} />
      <PinPad onKey={press} />
      <button className="pin-forgot press" onClick={() => setResetting(true)}>
        Forgot PIN?
      </button>
    </div>
  );
}

/**
 * Forgot PIN: the PIN only lives on this phone, so resetting it means proving it's you again, the
 * same way you signed in (Google, or your password). Then you choose a new PIN; you stay signed in.
 */
function ResetPin({ onBack, onReset, onSignOut }: { onBack: () => void; onReset: () => Promise<void>; onSignOut: () => void }) {
  const { user } = useSession();
  const providers = user?.providerData.map((p) => p.providerId) ?? [];
  const google = providers.includes('google.com');
  const hasPassword = providers.includes('password');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const withGoogle = async () => {
    if (!user) return;
    setError('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: user.email ?? '' });
    try {
      await reauthenticateWithPopup(user, provider);
      await onReset();
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        try {
          sessionStorage.setItem(PIN_RESET_KEY, user.uid);
        } catch {
          /* storage unavailable */
        }
        await reauthenticateWithRedirect(user, provider);
      } else if (code === 'auth/user-mismatch') {
        setError(`Choose the Google account you use for Spendr (${user.email}).`);
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(authMessage(err));
      }
    }
  };

  const withPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password || busy) return;
    setBusy(true);
    setError('');
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      await onReset();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? "That password isn't right." : authMessage(err));
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!user?.email) return;
    setError('');
    try {
      await sendPasswordResetEmail(auth, user.email);
      setInfo(`We've emailed a link to ${user.email}. Set a new password there, then enter it here.`);
    } catch (err) {
      setError(authMessage(err));
    }
  };

  return (
    <form className="screen flow" onSubmit={withPassword} noValidate>
      <BackButton onClick={onBack} />
      <div className="flow-body">
        <div className="flow-head" style={{ minHeight: 120 }}>
          <span className="flow-title">Reset your PIN</span>
          <span className="flow-sub">
            Confirm it's you{user?.email ? ` (${user.email})` : ''}, then choose a new PIN. You stay signed in.
          </span>
        </div>
        <div className="auth-stack">
          {google && (
            <button type="button" className="glass-btn glass press" onClick={withGoogle}>
              <Icon name="google-logo" weight="bold" size={19} />
              Continue with Google
            </button>
          )}
          {google && hasPassword && (
            <div className="or-row">
              <div className="or-line" />
              or
              <div className="or-line" />
            </div>
          )}
          {hasPassword && (
            <>
              <label className="field">
                <Icon name="lock-simple" size={19} color="var(--text2)" />
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your Spendr password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label="Password"
                />
              </label>
              <button type="button" className="forgot press" onClick={forgotPassword}>
                Forgot password?
              </button>
            </>
          )}
          {error && <span className="helper error">{error}</span>}
          {info && <span className="helper">{info}</span>}
        </div>
      </div>
      <div className="flow-foot">
        {hasPassword && (
          <button type="submit" className="primary-btn bottom-primary press" disabled={busy || !password}>
            Confirm and set a new PIN
          </button>
        )}
        <button type="button" className="bottom-link press" onClick={onSignOut}>
          Not you?&nbsp;<b>Log out</b>
        </button>
      </div>
    </form>
  );
}
