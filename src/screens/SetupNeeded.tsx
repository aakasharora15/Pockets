import { Logo } from './auth/Logo';

/** Shown when the app has no Firebase config, or can't reach the account. */
export function SetupNeeded({ offline }: { offline?: boolean }) {
  return (
    <div className="app">
      <div className="screen">
        <div className="unlock-logo">
          <Logo />
        </div>
        <div className="flow-head">
          <span className="flow-title">{offline ? "Can't load your account" : 'Almost there'}</span>
          <span className="flow-sub">
            {offline
              ? 'Check your connection and open Pockets again.'
              : "This copy of Pockets has no Firebase project yet. Copy src/firebase.config.example.ts to src/firebase.config.ts and add your project's web config. See Run your own Pockets in the README."}
          </span>
        </div>
        {offline && (
          <button className="primary-btn bottom-primary press" onClick={() => window.location.reload()}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
