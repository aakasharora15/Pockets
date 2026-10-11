# Changelog

## Unreleased

- **Repeating expenses.** Turn on Repeat monthly when adding an expense (rent, Netflix, Octopus Energy) and Spendr logs it on the same day every month, or the last day in shorter months. Whoever opens the app first logs it, once. Settings › Repeating expenses lists them and stops them.
- **Offline saving you can rely on.** Every expense is saved on the phone first and kept until the server confirms it, even if the app is closed. Rows not yet uploaded show "Waiting to sync". If an expense can't go to its Pocket (for example you were removed while offline), it's saved to Personal instead of being lost.
- **Combined total.** Settings › Combined total adds a card on Home with every currency converted into one, each expense at the exchange rate for its own date. The separate £ and ₹ totals don't change.
- **Receipt photos.** Attach a photo from the expense sheet. "Fill in from receipt" reads the total and shop name on the phone and fills them in for you to check.
- **Tags and trip view (22).** Add a tag such as a trip to any expense; Settings › Tags shows each tag's totals per currency, by category and every expense.
- **Export and backup.** Export a CSV of the whole Pocket, one month or one tag. Settings › Back up and restore creates a backup file of every Pocket you're in (optionally with receipt photos) and restores missing items from one.
- New app icon (the glass pocket). Home-screen and install icons at 1024, 512, 192, 180, 167, 152 and 120 px, plus a maskable 512 px icon for Android. The same icon now sits next to the wordmark on Welcome and PIN unlock. Theme colour is now #05080F. On iPhone, remove an existing Spendr shortcut and add it again to see the new icon.

## 1.0.0 (2026-10-10)

First release of Spendr.

- Accounts with Google or email and password, and password reset.
- Setup: name, currencies, app PIN, then just you or a shared Pocket.
- Personal Pocket for every account; shared Pockets from setup, the Pocket switcher or People.
- Invites by link, 6-character code and QR code; single use, 48 hours. Join with the option to move your Personal expenses. Owners remove people; members leave.
- New and edit expense sheet with currency, amount, name, Pocket, category, added or edited by, date and note.
- Home: month switcher, per-currency totals and budget bars, weekly spend, where it went, by person, one dismissible insight, recent expenses.
- Transactions with search, person and currency filters, and swipe to edit or delete.
- Calendar with category dots and a breakdown of the selected day.
- Settings: People, Currencies, Monthly budgets, Manage categories (add, reorder, delete with confirmation), Export CSV, Account, Lock app now, Glass appearance (Tinted, Classic, Clear), Add to Home Screen, About.
- 4-digit app PIN on each device, asked on open and after 5 minutes away.
- Works offline with a toast for unsynced expenses; real-time sync between members.
- Installable PWA; Firestore security rules with emulator tests; GitHub Actions for checks and deploys.
