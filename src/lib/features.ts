/**
 * Extension points for "Later" items in the spec that are still off. The design for each exists,
 * so turning one on means building its screen, not reworking the layout.
 *
 * Tags and the trip view, the combined total (currency conversion), repeating expenses and receipt
 * photos used to be listed here; they're built and always on now.
 */
export const FEATURES = {
  /** Sign in with Apple (needs a paid Apple developer account). Screens 01a, 01b. */
  appleSignIn: false,
  /** Monthly recap sheet and Home recap card (screens 07, 23). */
  monthlyRecap: false,
  /** Light theme (screens 06, 16). Version 1 is dark only; the light icon is in public/icons. */
  lightTheme: false,
} as const;
