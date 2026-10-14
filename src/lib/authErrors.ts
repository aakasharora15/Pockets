/** Short, plain messages for Firebase Auth errors. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return "That email address doesn't look right.";
    case 'auth/missing-password':
      return 'Enter your password.';
    case 'auth/weak-password':
      return 'Use at least 8 characters.';
    case 'auth/email-already-in-use':
      return "There's already an account with that email. Log in instead.";
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'Email or password is wrong.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return "You're offline. Connect to the internet and try again.";
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '';
    case 'auth/requires-recent-login':
      return 'Log in again to do this.';
    default:
      return 'Something went wrong. Try again.';
  }
}
