import { useEffect, useRef, useState } from 'react';
import { BackButton } from '../../components/Chrome';
import { PinDots, PinPad } from '../../components/Keypads';
import { Logo } from '../auth/Logo';
import { Progress } from './Progress';

interface SetProps {
  /** Shows the setup progress bar (step 3 of 4). */
  step?: number;
  onBack?: () => void;
  onDone: (pin: string) => Promise<void> | void;
}

/** 01e · Set an app PIN. Entered twice; mismatch shows "PINs didn't match. Try again." */
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

/** 02 · Unlock with PIN */
export function UnlockScreen({ onUnlock, onForgot }: { onUnlock: (pin: string) => Promise<boolean>; onForgot: () => void }) {
  const [digits, setDigits] = useState('');
  const [error, setError] = useState(false);

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
      }
    });
    return () => {
      live = false;
    };
  }, [digits]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <button className="pin-forgot press" onClick={onForgot}>
        Forgot PIN? Log in again
      </button>
    </div>
  );
}
