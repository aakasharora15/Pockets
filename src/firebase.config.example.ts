/**
 * Copy this file to `src/firebase.config.ts` and paste your Firebase web app config.
 * Firebase console → Project settings → Your apps → Web app → SDK setup and configuration.
 *
 * The web config identifies your project; it is not a secret. Access is controlled by
 * `firestore.rules`. `src/firebase.config.ts` is git-ignored so forks don't ship someone
 * else's project by accident.
 */
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000000000',
};

export default firebaseConfig;
