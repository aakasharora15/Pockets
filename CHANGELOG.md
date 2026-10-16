# Changelog

## Unreleased

### Changed

- **One card per currency, with the month as dots.** Pounds and Rupees each get a full-width card: the total, how it compares with last month and the budget on the left, and that currency's month as dots on the right (dark where you spent, blue for today, this week on a soft band). Tap a card to show that currency below; tap its dots to open the calendar in that currency.
- **Cleaner Calendar.** The month's total sits at the top; days are plain numbers, past days greyed and today in a blue circle, with up to two category icons under each day instead of coloured dots.
- **Updates no longer reload the app while you use it.** A new version downloads quietly and takes over the next time Spendr goes to the background (never while a sheet is open), instead of reloading the screen a few seconds after you open the app.
- **PIN only when it should be.** The 5-minute rule now holds even when iPhone closes Spendr in the background: reopen within 5 minutes and you go straight in. When the PIN is needed it shows straight away, instead of Home appearing first and the PIN taking over a few seconds later.
- **Easier to read in Light.** Secondary text now meets the WCAG AA contrast level, and faint text (pence, placeholders) meets the large-text level in both themes.
- **Faster updates.** Screens past Home load when first opened, and Firebase, React and the icons sit in their own files, so an update downloads about 37 KB of Spendr's code instead of the whole app.
- **Something went wrong screen.** If a screen ever crashes, you get Reload instead of a blank page, and the problem is reported.
- **One accent colour.** The Accent setting is gone; Spendr uses its blue everywhere again.
- **Totals always fit their card.** Pence and paise are smaller as well as dimmed, and long amounts step down in size, so £ and ₹ side by side never spill out of the box.
- **Tab bar without labels.** Home, Transactions, Calendar and Settings are icons only; the open tab sits on a soft capsule.
- **Liquid Glass tab bar.** Press the tab bar and the capsule lifts into a glass lens that magnifies the icon under it. Drag along the bar and it follows your finger, stretching as it moves; let go and it glides to the nearest tab, as on iOS 26. The lens runs on the phone's graphics compositor, so it stays smooth while the next screen loads.
- **Smooth tab changes.** Tapping a tab crossfades to the new screen, which drifts in a little from the side of the tab you tapped, instead of swapping in one frame.
- **Tab bar shrinks while you scroll.** Scroll down a screen and the bar tucks into a small round button for the open tab; scroll up or tap it to bring the rest back.
- **Glass toggles.** Press a switch and its knob lifts into a glass capsule before settling on its new side; choices like Keep in Personal / Move slide a glass thumb across.
- **Floating half sheets.** Export a month and the Add expense sheet (at half height) float inset from the screen edges with every corner rounded; at full height they fill the screen as before.
- **Section headers in title case**, larger, as on iOS 26 ("This Pocket · Home" rather than all capitals). The deck's Switch label too.
- **Reduce Transparency and Increase Contrast.** With either turned on in iPhone Settings › Accessibility, glass becomes solid; Increase Contrast also strengthens secondary text and edges.
- **Settings icons are filled again:** a solid colour tile with a white icon, as in iPhone Settings.
- **Fainter dot grid** behind every screen, in both themes.
- **No rainbow rim.** The total cards, the open Pocket and the tab bar lose the rainbow edge.

## 1.4.0 (2026-10-14)

### Added

- **Pocket deck on Home.** Your Pockets sit at the top as a deck of cards: the open one in front, lit in the accent colour, the others waiting behind as silver cards marked Switch. Tap one to open it and the cards swap places; tap the front card for the full list, New and Join.
- **Quick actions on Home:** Add expense, Export and Tags.
- **Accent colour.** Settings › Appearance › Accent: Blue (as before) or Mint, a vivid green with dark text on it. The open Pocket, Add expense, charts and links follow it.
- **The Spendr icon follows the theme.** In Light, the logo on Welcome and the PIN screen, the browser tab icon and the icon iPhone uses when you add Spendr to the Home Screen are the light version; in Dark, the dark one.
- **New categories:** Health and Personal care. Existing Pockets get them once, just above Other.
- **Reset a forgotten PIN.** Forgot PIN? now asks you to confirm it's you with Google or your password (with Forgot password? if you need a new one), then lets you choose a new PIN. You stay signed in. Log out is still there if you'd rather.

### Changed

- **Calmer look.** A neutral charcoal background with a faint dot grid replaces the navy glow, with blue kept for what matters. Month totals are frosted glass with the accent glowing through and a thin rainbow rim (as are the open Pocket and the tab bar), the Pockets behind it are silver mirror cards, icons are thin outlines, totals are bold with pence dimmed, and Settings icons sit on neutral tiles.
- **Totals always show pence and paise.** £3,936.50 and ₹18,299.00 follow the same rule, with the decimals dimmed.

### Fixed

- **Menus and the tab bar are readable on Android.** Chrome on Android often leaves out the blur behind glass, so text showed straight through the Pocket menu and the tab bar. Glass now has a near-solid backing outside Safari, and menus are more solid everywhere.
- **Pockets load even when the lookup across Pockets fails.** A phone opening Spendr for the first time found your Pockets with one query; if the server refused it, the app waited forever. It now falls back to the list of Pockets saved on your account, and the Still loading screen shows the error.
- **No more endless loading.** If Spendr is still on the placeholder cards after 10 seconds, it says what it's waiting for and offers Try again or Repair this phone's copy, which downloads your data afresh. The PIN and anything waiting to upload are kept.
- **No more stuck old versions.** An installed copy now checks which version is live, and if it's behind and the normal update doesn't happen, it clears its cached copy and reloads. Your expenses, unsynced items and settings aren't touched. Settings › About shows the build.
- **Rupees take paise.** Amounts in rupees can have up to two decimal places (₹1.03). Whole amounts still show without decimals (₹8,830).
- **Full width on wider iPhones.** No more empty strips down the sides.
- **Full screen in the installed iPhone app on iOS 26.** iOS 26 gives home-screen web apps a window shorter than the screen, which left a band below the tab bar. The app now sizes itself to the full screen. It asks once whether it looks right and puts the old layout back if not.

## 1.3.0 (2026-10-14)

### Added

- **Choose how you start.** The last setup step offers Just me, Create a shared Pocket (and name it) or Join a shared Pocket, with an option to also keep a Personal Pocket.
- **Paid by.** In a shared Pocket every expense records who paid (replacing Added by and Edited by), and it can be changed when editing. Home's person card and CSV exports say Paid by. Paid by sits on one card for every currency: each person gets a line and bar per currency they paid in, never converted.
- **Hide the Personal Pocket.** People who only use shared Pockets can hide Personal (Settings › Account › Personal Pocket). It comes back on its own if you leave every shared Pocket or an expense has to be saved there.

### Changed

- **Pounds and rupees side by side on Home.** The currency cards sit next to each other instead of swiping, each with its total, change on last month and budget. Tap a card to choose the currency Weekly spend and Where it went show.
- **Transport is now Travel.** Existing Pockets are renamed once, unless you've already renamed the category yourself.

### Fixed

- **Keypad vibration on iPhone.** Recent iOS versions reportedly ignore vibration a web app triggers from code. Each PIN and amount key now holds an invisible switch that your tap flips, which plays iPhone's own tick. Android taps are slightly stronger.
- The installed app now checks for a new version each time it comes back to the front, so phones that keep Spendr open in the background no longer stay on an old version.
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
