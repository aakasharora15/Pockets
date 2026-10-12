/**
 * Feature flags for work that isn't shipped yet. Each one gates its entry points, so turning it on
 * means finishing its screens rather than reworking existing layouts.
 */
export const FEATURES = {
  /** Sign in with Apple (needs a paid Apple developer account). */
  appleSignIn: false,
  /** Monthly recap sheet and Home recap card. */
  monthlyRecap: false,
} as const;
