import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

/** Set VITE_EMULATORS=1 to run against the local Auth and Firestore emulators. */
export const USE_EMULATORS = import.meta.env.VITE_EMULATORS === '1';

// src/firebase.config.ts is git-ignored. Missing → only the emulators can be used.
const found = import.meta.glob<{ default: FirebaseOptions }>('./firebase.config.ts', { eager: true });
const userConfig = Object.values(found)[0]?.default;

const DEMO_CONFIG: FirebaseOptions = { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-spendr', appId: 'demo-app' };

export const configMissing = !userConfig && !USE_EMULATORS;

const app = initializeApp(USE_EMULATORS || !userConfig ? DEMO_CONFIG : userConfig);

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (USE_EMULATORS) {
  const host = import.meta.env.VITE_EMULATOR_HOST || window.location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
}
