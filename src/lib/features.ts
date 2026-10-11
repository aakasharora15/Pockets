/**
 * Extension points for "Later" items in the spec. They are off in Version 1; the design for each
 * exists, so turning one on means building its screen, not reworking the layout.
 */
export const FEATURES = {
  /** Sign in with Apple (needs a paid Apple developer account). Screens 01a, 01b. */
  appleSignIn: false,
  /** Tags and trip view (screen 22): "Add tag" row, tag chips on rows, Settings › Tags. */
  tags: false,
  /** Monthly recap sheet and Home recap card (screens 07, 23). */
  monthlyRecap: false,
  /** "≈ incl. other currencies" line on Home (needs exchange rates). */
  currencyConversion: false,
  /** Light theme (screens 06, 16). Version 1 is dark only. */
  lightTheme: false,
  /** Recurring expenses and receipt photos. */
  recurring: false,
  receipts: false,
} as const;
