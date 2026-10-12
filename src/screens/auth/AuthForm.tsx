import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/Chrome';
import { auth } from '../../firebase';
import { authMessage } from '../../lib/authErrors';
import { FEATURES } from '../../lib/features';
import { Icon } from '../../lib/icons';

type Mode = 'signup' | 'login';

const COPY = {
  signup: {
    title: 'Create your account',
    sub: 'One account for your Personal Pocket and any Pockets you share.',
    cta: 'Create account',
    switchText: 'Already have an account?',
    switchCta: 'Log in',
    switchTo: '/login',
  },
  login: {
    title: 'Welcome back',
    sub: 'Log in to see your Pockets.',
    cta: 'Log in',
    switchText: 'New to Spendr?',
    switchCta: 'Create account',
    switchTo: '/signup',
  },
};

/** Create account and log in. */
export function AuthForm({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const copy = COPY[mode];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setError('');
    setInfo('');
    if (mode === 'signup' && password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
      } else {
        setError(authMessage(err));
      }
    }
  };

  const forgot = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo(`We've sent a reset link to ${email.trim()}.`);
    } catch (err) {
      setError(authMessage(err));
    }
  };

  return (
    <form className="screen flow" onSubmit={submit} noValidate>
      <BackButton to="/welcome" />
      <div className="flow-body">
        <div className="flow-head" style={{ minHeight: mode === 'signup' ? 120 : 100 }}>
          <span className="flow-title">{copy.title}</span>
          <span className="flow-sub">{copy.sub}</span>
        </div>
        <div className="auth-stack">
          {FEATURES.appleSignIn && (
            <button type="button" className="white-btn press">
              <Icon name="apple-logo" weight="fill" size={20} />
              Continue with Apple
            </button>
          )}
          <button type="button" className="glass-btn glass press" onClick={google}>
            <Icon name="google-logo" weight="bold" size={19} />
            Continue with Google
          </button>
          <div className="or-row">
            <div className="or-line" />
            or
            <div className="or-line" />
          </div>
          <label className="field">
            <Icon name="envelope-simple" size={19} color="var(--text2)" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
            />
          </label>
          <label className="field">
            <Icon name="lock-simple" size={19} color="var(--text2)" />
            <input
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
            />
          </label>
          {mode === 'signup' && !error && <span className="helper">At least 8 characters.</span>}
          {mode === 'login' && (
            <button type="button" className="forgot press" onClick={forgot}>
              Forgot password?
            </button>
          )}
          {error && <span className="helper error">{error}</span>}
          {info && <span className="helper">{info}</span>}
        </div>
      </div>
      <div className="flow-foot">
        {mode === 'signup' && <div className="terms">By continuing you agree to the Terms and Privacy Policy.</div>}
        <button type="submit" className="primary-btn bottom-primary press" disabled={busy}>
          {copy.cta}
        </button>
        <button type="button" className="bottom-link press" onClick={() => navigate(copy.switchTo, { replace: true })}>
          {copy.switchText}&nbsp;<b>{copy.switchCta}</b>
        </button>
      </div>
    </form>
  );
}
