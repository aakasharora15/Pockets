# Questions and decisions

The app was called Pockets during design; it is now **Spendr**. Inside the app, a shared space is still called a Pocket.

Everything below is either something I couldn't match exactly, a place where the design and the spec disagree, or behaviour neither of them covers. For each one I've said what I built so the app works today. Each is a small change if you want it the other way.

Where the design (`design/Pockets.dc.html`) and the spec (`docs/SPEC.md`) disagreed, I followed the design for anything you can see (layout, colours, copy, rows, order) and the spec for behaviour the static design can't show. The exceptions are listed under "Conflicts" below.

## Needs your decision

1. **No Cloud Function for joining.** The spec says to redeem invites with a Cloud Function `joinPocket`. Cloud Functions need Firebase's paid Blaze plan, and the README promises "a free Firebase project". I did it with security rules instead: one batch marks the invite used and adds the member, and the rules check it's the right Pocket, unused, and under 48 hours old by the server's clock. Moving Personal expenses runs as a second step after joining. Deleting a category with more than 500 expenses runs in chunks of 400 from the app. Rules tests cover all of it. If you'd rather have the Function anyway, say so.
2. **Sign in with Apple is hidden.** It's in the design (01a, 01b) but listed under "Later". The button sits behind `FEATURES.appleSignIn` in `src/lib/features.ts`, so the Google button moves up into its place.
3. **Terms and Privacy Policy** (01a) are plain text, not links, because there are no pages to link to. Do you want pages written, or links to your own?
4. **How the New expense sheet moves between its two states.** The design shows a medium sheet with the keypad (11) and a large sheet with details and no keypad (12–15), but not how you get from one to the other. What I built: a new expense opens at medium with the keypad. Tapping **Save** with no category chosen expands to large and opens the category menu (13). Dragging the grabber up also expands it. Tapping the amount on the large sheet brings the keypad back. Editing opens at large. The spec's "Then keypad" and 58 px keys don't fit under the details list at 844 px, so I used the design's 76 px keypad.
5. **Default currency on New expense.** Design 11 shows no currency picked ("Choose £ or ₹ to start"). It stays that way the first time; after that, each Pocket remembers the last currency used on this device.
6. **"Edited by" on Edit expense** sets who edited it (`editedByUid`). "Added by" can't be changed after saving. Is that right?
7. **Transactions sliders button** (top right on 17). The design doesn't say what it does. It shows and hides the filter chips. Should it do something else, such as pick a month?
8. **Screens with no design.** I reused existing patterns (action sheet from 19e, sheet from 19d) and wrote short copy for:
   - Remove member: "Remove {name}?" / "They'll lose access to {Pocket}. Their expenses stay here with their initials." / Remove from Pocket
   - Delete Pocket: "Delete {Pocket}?" / "All its expenses will be deleted for everyone. This can't be undone."
   - Leave Pocket (a member sees this instead of Delete Pocket): "Leave {Pocket}?" / "Your expenses stay here with your initials. You'll need a new invite to come back."
   - Delete expense confirmation (from Edit): "Delete {name}?" / "This can't be undone." / Delete expense
   - Delete account: what's deleted, and "Log in again first" if the last sign-in was more than 5 minutes ago (Firebase requires it)
   - Account › Name: a sheet with Name and Initials fields
   - Add to Home Screen: an action sheet with Safari instructions (Android shows the browser's own install prompt instead)
   - About Spendr: version, MIT licence, link to GitHub
   - Error messages for sign-in, invites ("That code doesn't match an invite…", "This invite has expired…", "already been used…") and failed saves
   - Forgot password: sends the reset email and shows "We've sent a reset link to {email}." under the fields
   - "Lock app now" in Settings › Account (in the spec, not the design)
   - Confirm PIN: title "Confirm your PIN", same subtitle
9. **People row for Personal.** Settings › People is hidden for the Personal Pocket, since it can't be shared.
10. **Copy that assumes two people.** Currencies ("you both spend in", "Applies to both phones") and Categories ("Changes apply to both phones") read "you spend in" / no sentence for Personal, and "you all" / "everyone in this Pocket" for three or more.
11. **Non-owners on Currencies** see the list read-only with "Only the owner can change these." added to the footnote.
12. **Main currency.** The first currency is Main. Settings › Currencies adds new ones at the end and has no way to change which is Main. Should it?
13. **Offline toast** shows only while there are unsynced expenses. With nothing pending it would say "0 expenses saved on this phone", so it stays hidden.
14. **New device after login.** If you log in on a phone with no PIN, you go straight to "Set an app PIN" (01e without the progress bar).
15. **Setup back button on step 1** logs out, since the account already exists at that point.
16. **"Share with someone?" default.** Design 01f shows "Share with someone" selected. I default to "Just me for now" so nobody creates a shared Pocket by accident.

## Version 1.1: repeats, offline, combined total, receipts, export and backup

17. **Receipt photos live in Firestore, not Cloud Storage.** New Cloud Storage buckets need Firebase's paid Blaze plan, so each photo is shrunk on the phone (at most 1600 px, under 850 KB) and stored as its own Firestore document next to the expense. Firestore's free tier has 1 GB of storage, which is over a thousand photos even at the largest size. If you move to Blaze, Cloud Storage is the better home and it's a contained change in `src/data/receipts.ts`.
18. **Reading a receipt happens on the phone.** "Fill in from receipt" uses Tesseract.js, so no photo is sent anywhere to be read. It downloads about 7 MB the first time, reads English, and works best on printed receipts. It fills the amount and the shop name and changes the currency only when the receipt makes it obvious (£, ₹, GST) and you haven't typed an amount. A cloud reader (Google Cloud Vision) would be more accurate but needs Blaze and a Cloud Function.
19. **Where repeating expenses are logged.** With no server code, a repeat is logged by whichever phone opens Spendr first on or after its day, in a transaction, so it can't be logged twice. If nobody opens the app for a while, it catches up every missed month next time. Logging needs a connection. The first automatic one is the month after the expense; marking an older expense as repeating doesn't fill in past months. A repeat on the 29th to 31st uses the last day in shorter months. Editing an expense with Repeat monthly on changes what future months log. Switching it off stops the repeat; the expenses it already logged stay.
20. **Repeating expenses in Settings.** Settings › Repeating expenses lists them with the next date; tapping one offers "Stop repeating". It sits next to Tags, under Manage categories, since the design has no screen for it.
21. **What "Waiting to sync" means.** It shows on a row that has been on the phone for more than a second and a half without the server confirming it, or straight away when offline. If an offline expense is refused when it reaches the server (for example, you were removed from that Pocket in the meantime), it's saved to your Personal Pocket and a message says so, rather than being dropped.
22. **Combined total.** Off by default and set per phone, in Settings › Combined total (only for Pockets with more than one currency). It adds a last card to the Home carousel ("All in pounds · October") and a line on a tag's page; nothing else changes. Rates are central bank reference rates from Frankfurter, so they won't match what your bank charged. Weekends and holidays use the last working day's rate. Offline, it uses rates already saved on the phone, or says it needs a connection.
23. **One tag per expense.** The design's "Add tag" row holds one value, so an expense has at most one tag. Tags belong to the Pocket, and rows show the tag as a small label. Settings › Tags lists them; each opens the trip view (22) with Export and Remove tag. Removing a tag takes it off its expenses and keeps the expenses.
24. **Export.** "Export data (CSV)" now asks: everything in the Pocket (what it did before), one month (with a month picker) or one tag. The CSV has two new columns at the end, "tag" and "repeats monthly".
25. **Restoring a backup adds, never replaces.** Missing expenses, categories, repeats, tags and (if included) receipt photos are added back; anything already in Spendr is left alone, so restoring twice is harmless. Shared Pockets you're no longer in come back as new shared Pockets owned by you. Personal expenses from a different account go into your Personal Pocket as yours. Restored repeats don't fill in months that passed while they were missing. Backups and restores need a connection.

## Conflicts between design and spec

| Where | Design | Spec | Built |
| --- | --- | --- | --- |
| Home cards | Weekly spend card and a "12% vs Aug" badge | Not mentioned | Design. Badge hidden when last month is empty. |
| Where it went | 5 rows, bars in category colours, title "Where it went" | Top 4, bars `rgba(255,255,255,0.7)`, title "Where it went · £" | Design. Follows the currency card you've swiped to. |
| By person | One currency, follows the card | Totals per currency joined with " · ", bar = share of main currency | Design (follows the card). Added "(you)" after your name from the spec. |
| Insight | Example copy about trends | "{Category} is your biggest spend this month at {amount}." | Spec copy (no trend data needed). Empty state uses the design's "Add your first expense to get started" (no full stop; the spec has one). |
| Expense rows | Subtitle is the date ("18 Sept 2026") | "{Category} · {initials} · {day}" | Design. Shared Pockets lose who added each row at a glance; the person filter still works. |
| Transactions title | "Transactions" + "September 2026" | Title + count | Design. |
| Calendar cells | 44 px circles; days after today look normal | 46 px, radius 12; future days at 35% | Design. |
| Currency pill text | `#2B2420` on white | `#05080F` | Design. |
| Sheet values | Backdrop 0.28, background alpha 0.94 | Backdrop 0.4, alpha 0.96 | Design. |
| Delete in Edit | "Delete" | "Delete expense" | Design for the button; the confirmation says "Delete expense". |
| PIN backspace | ⌫ glyph | `ph-backspace` | Phosphor icon from the spec (the design's glyph is a font fallback). |

## Couldn't match exactly

- **Status bar and home indicator.** The design draws a fake 9:41 status bar and home indicator. The app leaves both to iOS. Layout keeps the design's 54 px top inset.
- **Icons are SVG.** The design uses Phosphor's icon font; the stack asks for `@phosphor-icons/react`, which draws SVGs. Same glyphs and sizes; anti-aliasing differs very slightly.
- **Text caret.** The design's 3 × 50 px blinking caret is drawn on the amount (11). Text fields use the system caret, coloured white.
- **Home trend and budget numbers** are calculated, so they won't match the sample figures. "£2,486 of £3,200 · £714 left" rounds spent down and what's left to the nearest pound, which is what the sample shows.
- **Smaller phones.** Below 844 px tall the medium expense sheet starts higher and the sheet scrolls if needed.

## For later (not built)

Monthly recap (07, 23), light theme (06, 16), Sign in with Apple, desktop layout (05). Flags for each are in `src/lib/features.ts`. Tags and the trip view, repeating expenses, receipt photos and the combined total are built (see Version 1.1 above).
