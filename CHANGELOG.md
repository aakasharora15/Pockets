# Changelog

## Unreleased

### Added

- **Choose how you start.** The last setup step offers Just me, Create a shared Pocket (and name it) or Join a shared Pocket, with an option to also keep a Personal Pocket.
- **Hide the Personal Pocket.** People who only use shared Pockets can hide Personal (Settings › Account › Personal Pocket). It comes back on its own if you leave every shared Pocket or an expense has to be saved there.

### Fixed

- The selected tab's icon is no longer filled in; the selected tab is shown by its brighter icon and label, as designed.

## 1.2.0 (2026-10-12)

### Changed

- **Looks and feels like an iPhone app.** Apple's system font, screens that slide in and out, swipe back from the left edge in the installed app, a blurred bar behind the top buttons when you scroll, smaller top buttons, consistent corners, one 16 pt margin that buttons, cards and the tab bar share, separators that stop short of the card edge, softer glass outlines, Settings rows balanced at 16 pt with solid icons, and Theme and Glass chosen from a menu as in iOS Settings, Settings icons coloured from Spendr's own palette, and labels on the tabs. No gap at the top in Safari.

### Added

- **Swipe to delete** on Home, Calendar, Transactions and tag pages. Swipe left for Edit and Delete, or swipe across to delete straight away.
- **New categories:** Amazon, Rent, Council tax, Water bill and Household. Existing Pockets get them once.
- **Light theme.** Settings › Appearance › Theme: Dark, Light or Automatic (follows the phone).
- **Invite by email.** Type an address in the invite sheet and Mail opens with the link and code. The invite only works for an account with that email.
- **Sync status** in Settings: the account you're signed in to, when this phone last synced and anything waiting to upload, with Sync now.
- **Keypad feedback.** Keys light up while pressed and give a light tap (Android, and iPhone on iOS 18 or later). A wrong PIN gives a double tap.

### Fixed

- The category and Pocket menus no longer show the rows behind them.
- Digits typed quickly while setting a PIN are no longer lost.
- Settings showed version 1.0 whatever the version.
- **Every phone signed in to an account opens on the same Pocket.** The open Pocket was remembered per phone, so a second phone started on Personal and expenses logged in a shared Pocket looked missing.
- An expense the server refused is no longer moved to Personal unless you were really removed from its Pocket; it stays put and Settings › Sync status shows the error.
- Lists that lost their live connection now reconnect when the phone is back online or the app returns to the front.

## 1.1.0 (2026-10-12)

### Added

- **Repeating expenses.** Turn on Repeat monthly when adding an expense (rent, Netflix, Octopus Energy) and Spendr logs it on the same day every month, or the last day in shorter months. Whoever opens the app first logs it, once. Settings › Repeating expenses lists them and stops them.
- **Offline saving you can rely on.** Every expense is saved on the phone first and kept until the server confirms it, even if the app is closed. Rows not yet uploaded show "Waiting to sync". If an expense can't go to its Pocket (for example you were removed while offline), it's saved to Personal instead of being lost.
- **Combined total.** Settings › Combined total adds a card on Home with every currency converted into one, each expense at the exchange rate for its own date. The separate £ and ₹ totals don't change.
- **Receipt photos.** Attach a photo from the expense sheet. "Fill in from receipt" reads the total and shop name on the phone and fills them in for you to check.
- **Tags and trip view.** Add a tag such as a trip to any expense; Settings › Tags shows each tag's totals per currency, by category and every expense.
- **Export and backup.** Export a CSV of the whole Pocket, one month or one tag. Settings › Back up and restore creates a backup file of every Pocket you're in (optionally with receipt photos) and restores missing items from one.
- **New app icon** (the glass pocket) for the home screen and inside the app. On iPhone, remove an existing Spendr shortcut and add it again to see it.

### Fixed

- **iPhone:** the screen no longer bounces or shifts when you scroll to the top or bottom of a list, double-tap the keypad or tap into a text field.
- **Smaller screens:** Create account, the PIN keypad and Save expense are no longer covered or pushed off screen.

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
