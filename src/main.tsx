import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { checkFreshness, whenAway } from './lib/freshness';
import { installErrorReporting } from './lib/report';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

// New versions download in the background and take over the next time the app goes to the background
// (or is next opened), never mid-use. An installed app on iPhone can stay open in the background for
// days, so also look for one whenever it comes back to the front.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    whenAway(() => void updateSW(true));
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) registration.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', check);
    window.setInterval(check, 60 * 60 * 1000);
  },
});

// And if the update itself gets stuck, start clean (see lib/freshness.ts).
installErrorReporting();
void checkFreshness();
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void checkFreshness());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
