import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { checkFreshness } from './lib/freshness';
import { installErrorReporting } from './lib/report';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';

// New versions install in the background and the app reloads into them. An installed app on iPhone
// can stay open in the background for days, so also look for one whenever it comes back to the front.
registerSW({
  immediate: true,
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
