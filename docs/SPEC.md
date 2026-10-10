# Pockets: full build plan and spec

## 1. Product

**Pockets** is an open-source expense tracker for individuals and the people they share costs with.

- Every user gets a private **Personal Pocket** at sign-up.
- A user can create or join any number of **shared Pockets** (e.g. "Home" with a partner, "Flat 4B" with flatmates). Everyone in a shared Pocket sees all its expenses and who added each one.
- Each Pocket has its own currencies, categories and budgets.
- Each expense keeps its own currency. Totals are always per currency, never converted.
- The goal is visibility ("who spent what, where did it go"), **not** splitting or settling up.

Sample people in the design: **Prernaa Singh (PS)** and **Aakash (AA)**, spending in **£** and **₹**. Trina (TR) is used to show inviting/joining.

## 2. Files in this bundle

| Path | What it is |
| --- | --- |
| `PROMPT.md` | Handover prompt for the developer. |
| `README.md` | This spec. |
| `Pockets-standalone.html` | Offline copy of every screen of the design (01–29). |
| `design/Pockets.dc.html` | Design source. Inline styles are the exact values. Serve the folder (`npx serve design`) to open it. |
| `design/support.js` | Viewer runtime for the design file only. Not part of the app. |
| `assets/fonts/Involve-VF.ttf` | App font (variable 100–900). From github.com/StefanPeev/Involve; confirm its licence before shipping. |

## 3. Scope

### Version 1 (build this)
1. Accounts: sign up / log in with Google or email + password; forgot password.
2. Setup: name → currencies → app PIN → "Just me" or "Share with someone".
3. Personal Pocket created automatically; shared Pockets created from setup, the Pocket switcher or People.
4. Invites by **link**, **6-character code** and **QR code**; join flow; owner can remove members; members can leave.
5. Add / edit / delete expenses: Pocket, currency, amount, name, category, Added by / Edited by, date, note.
6. Home: month switcher, per-currency totals with budget bar, By person (shared only), Where it went, one dismissible insight, Recent.
7. Transactions: grouped by day, **search**, filter by person (shared only) and currency, swipe for Edit / Delete.
8. Calendar: month grid with category dots, tap a day to list its expenses.
9. Settings: People, Currencies, Monthly budgets (editable), Manage categories, Export CSV, Account, Lock app, Glass appearance (Tinted / Classic / Clear), Add to Home Screen, About.
10. Month navigation (previous months), a real date picker in the expense sheet.
11. Offline saving with sync, real-time updates between members.
12. App PIN lock on each device (4 digits).

### Later (do not build; keep extension points)
- Monthly recap sheet (screen 23), tags and trip view (22), recurring expenses, receipt photos.
- Currency conversion and the "≈ incl. other currencies" line.
- Light theme (screens 06, 16 exist for later). V1 is **dark only**.
- Sign in with Apple and a native iOS app (needs a paid Apple developer account).
- Desktop layout (screen 05).

### Never
Push notifications, daily reminders, biometrics prompts inside the app, bill splitting / balances.

### App PIN
- Required. Every user creates a 4-digit PIN during sign-up (Setup 3 of 4). There is no option to turn it off.

## 4. Screen map

Labels match the design file.

| # | Screen | Notes |
| --- | --- | --- |
| 01 | Welcome | Logo, "Spend / together. / See clearly.", Create account, Log in. |
| 01a | Create account | Continue with Apple (later) / Google, email, password (min 8), terms line. |
| 01b | Log in | Same, plus Forgot password. |
| 01c | Setup 1/4 · You | Name; initials shown (PS). |
| 01d | Setup 2/4 · Currencies | Multi-select; first picked = Main. At least one. |
| 01e | Setup 3/4 · App PIN | 4 digits, entered twice ("Confirm your PIN"). Mismatch error: "PINs didn't match. Try again." |
| 01f | Setup 4/4 · Share? | "Just me for now" / "Share with someone" (creates shared Pocket "Home" and opens Invite). |
| 02 | Unlock with PIN | 4 dots, glass keypad, "Forgot PIN? Log in again", error "Wrong PIN. Try again." |
| 04 | Home | See section 6. |
| 07 | Home · recap card | Later. |
| 08 | Empty home | Zero totals, "No spending yet this month", insight "Add your first expense to get started." |
| 09 | Offline | Toast with unsynced count. |
| 11–15 | New / Edit expense | Large sheet. 14 = Personal Pocket (no Added by row). 15 = Edit with "Edited by" and Delete. |
| 17 | Transactions | Filters, swipe actions. |
| 18 | Calendar | |
| 19 | Settings | Grouped: This Pocket · {name}, Account, Appearance. |
| 19b | Currencies | GBP, INR, USD, EUR, AUD, CAD, SGD, NZD. No AED. |
| 19c–e | Categories | Manage, New category sheet, Delete confirm. |
| 20 | Monthly budgets | One card per currency. |
| 24 | Pocket switcher | Popover from the Home pill. |
| 25 | New shared Pocket | Name, currencies, "Create and invite". |
| 26 | Invite | QR, code (copy), Share invite link, "Expires in 48 hours · works for one person". |
| 27 | Join a Pocket | Code boxes, Pocket preview, your name, keep or move existing expenses, Join / Not now. |
| 28 | People | Invite someone, members, pending invite (Cancel), Delete Pocket (owner) / Leave Pocket (member). |
| 29 | Account | Avatar, name, email, sign-in method, App PIN, Your Pockets, Log out, Delete account. |

## 5. Global UI

- Viewport 390 × 844. Status bar 54 px. Home indicator 139 × 5, radius 3, white, 8 px from bottom.
- Background: `radial-gradient(120% 45% at 50% 0%, rgba(14,74,160,0.95) 0%, rgba(14,74,160,0) 70%), linear-gradient(180deg, #0A2A55 0%, #07111F 45%, #05080F 100%)`.
- Scroll padding 114 px top, 20 px sides, 140 px bottom. Top fade 110–120 px `linear-gradient(180deg, rgba(10,42,85,0.92) 35%, transparent)`. Bottom fade 130 px `linear-gradient(0deg, rgba(5,8,15,0.92) 30%, transparent)`.
- **Tab bar**: glass pill `left 16, right 90, bottom 28`, height 64, radius 32. Tabs: `ph-house`, `ph-currency-gbp`, `ph-calendar-blank`, `ph-gear-six` (regular, 26 px). Selected `#FFFFFF`, unselected `rgba(235,240,250,0.62)`, no background on selected.
- **Plus button**: 64 × 64 glass circle `right 16, bottom 28`, white plus of two 26 × 4 bars.
- **Pocket pill** (Home): glass, 44 px tall, member initials (28 px circles, `#2E3646`, 10 px / 600, overlap −6 px, 2 px ring), Pocket name 17 / 600, `ph-bold ph-caret-down`.
- **Back button**: 44 × 44 glass circle at `top 58, left 16`, `ph-bold ph-caret-left` 18 px.
- Press feedback everywhere: `transform: scale(0.96)`, `transition: transform .35s cubic-bezier(.34,1.56,.64,1)`.

### Glass (Classic, default)
```
background: linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04)) padding-box,
            linear-gradient(135deg,rgba(255,255,255,0.5),rgba(255,255,255,0.08) 35%,rgba(255,255,255,0.04) 65%,rgba(255,255,255,0.32)) border-box;
border: 1px solid transparent;
backdrop-filter: blur(10px) saturate(190%) brightness(1.06);
box-shadow: inset 0 1px 1px rgba(255,255,255,0.7), inset 0 -1px 1px rgba(255,255,255,0.18),
            inset 0 0 14px rgba(255,255,255,0.18), 0 10px 30px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
```
- **Tinted**: padding-box `rgba(79,139,255,0.34) → rgba(79,139,255,0.16)`; border-box `0.55 / 0.1 / 0.05 / 0.35`.
- **Clear**: padding-box `rgba(255,255,255,0.04) → 0.01`; border-box `0.4 / 0.06 / 0.03 / 0.25`.
The setting applies to the tab bar, plus button and Pocket pill. Stored per device.

### Glass keypad keys
76 px (PIN) or 58 px (expense sheet) circles, column gap 24, row gap 16 / 6. Background `linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))` with gradient border, shadow `inset 0 1px 1px rgba(255,255,255,0.45), inset 0 0 12px rgba(255,255,255,0.08), 0 6px 18px rgba(0,0,0,0.18)`. Digits 30–32 px / 400. PIN keys show letters (ABC…) 10 px / 600. ⌫ = `ph ph-backspace`, no background. "." hidden for ₹. *The owner may send a new keypad reference; build as shown until then.*

### Sheets
Top 58 px, radius `38 38 0 0`, background `linear-gradient(180deg, rgba(38,46,62,0.96) 0, #141A26 140px)`, `inset 0 1px 0 rgba(255,255,255,0.2)`, padding `0 20 34`. Grabber 36 × 5. Header 44 px grid: Cancel · Title (17/600) · Action (17/600, `#4F8BFF`, disabled `rgba(235,240,250,0.3)`). Backdrop `rgba(0,0,0,0.4)`, tap to close.

### Popovers / action sheets
`rgba(44,48,58,0.94)`, `blur(40px) saturate(180%)`, border `1px rgba(255,255,255,0.14)`, radius 24–28, shadow `0 20px 50px rgba(0,0,0,0.35)`. Rows 44–60 px.

### Toast
Top 60 px, centred, 40 px tall, radius 20, `rgba(44,48,58,0.94)`, `ph-bold ph-check` + 15 / 600 text, auto-hide 1.8 s. Messages: "Expense saved", "Expense updated", "Expense deleted", "Saved to {Pocket}", "Code copied", "Invite link copied", "{Name} joined {Pocket}", "You joined {Pocket}", "{Name} removed", "{Category} added", "{Category} deleted", "Welcome, {first name}".

## 6. Screen behaviour

### Home
1. Month title (34 / 700), previous/next months peek at 30% opacity; swipe to change month.
2. Currency cards (one per Pocket currency, horizontal snap; 326 px wide when 2+, full width when 1), radius 28, `#1C2230`: "{Pounds} · {Month}", amount 48 px / 600 tabular, budget bar 8 px `#4F8BFF` on `rgba(255,255,255,0.14)`, "£x of £y · £z left".
3. **By person** (shared Pockets with expenses): each member's initials (42 px), name ("(you)" for self), totals per currency joined with " · ", bar = share of main-currency total.
4. **Where it went · {main symbol}**: top 4 categories, neutral icon tile, amount, bar `rgba(255,255,255,0.7)`.
5. **Insight card** (Home only, never a notification): `rgba(79,139,255,0.16)`, radius 32, `ph ph-sparkle` in a 48 px circle, × dismiss (per Pocket per month). Copy: "{Category} is your biggest spend this month at {amount}." / empty: "Add your first expense to get started."
6. **Recent**: last 5, "See all" → Transactions. Tap a row → Edit.

### New / Edit expense sheet
Order: header → currency pills (Pocket's currencies; selected white with `#05080F` text) → amount (symbol 28 px, number 54–58 px, grey "0" placeholder) → name field ("What was it for?"; empty saves as the category name) → details list (`rgba(118,118,128,0.24)`, radius 20, 48 px rows):
1. **Pocket** (`ph-users-three`): choose any of the user's Pockets. Switching keeps the currency if allowed, else picks that Pocket's main currency.
2. **Category**: neutral tile + name, `ph-bold ph-caret-up-down`, opens the glass dropdown (check, name, icon).
3. **Added by / Edited by** (shared Pockets only): segmented control of member initials; defaults to the current user.
4. **Date**: native date picker; label "Today, 19 Sept" / "Yesterday, 18 Sept" / "Thu 17 Sept".
5. **Note** (optional).
Then keypad. Edit adds "Delete expense" (`#FF8A84`). Save disabled until amount > 0. Amount rules: max 7 integer digits, 2 decimals (0 for ₹).

### Transactions
Title + count, search field, chips: person (Everyone / initials; shared only), divider, currency (All / symbols). Groups by day, newest first. Row 60–64 px: 38–42 px neutral icon tile, name, "{Category} · {initials} · {day}", amount 17 / 600 tabular. **Swipe left**: Edit `#2A3242` + white `ph-pencil-simple`; Delete `#4A2230` + `#FF8A84` `ph-trash`. Empty: "No expenses match these filters."

### Calendar
Mon-first grid, 46 px cells radius 12, `rgba(255,255,255,0.06)`. Today: `inset 0 0 0 1.5px #FFFFFF`. Selected: `#FFFFFF` bg, `#05080F` text. Future days 35% text. Up to 3 dots (5 px) in category chart colours. Below: day label and its expenses, or "Nothing spent on this day."

### Settings
Grouped cards `#1C2230`, radius 12, rows 44 px, **neutral 29 px tiles `rgba(255,255,255,0.08)` with white outline icons** (no coloured squares).
- *This Pocket · {name}*: People ({count}), Currencies ({symbols}), Monthly budgets, Manage categories, Tags (later), Export data (CSV).
- *Account*: {name} → Account screen; Lock app now.
- *Appearance*: Glass — Tinted / Classic / Clear.
- Add to Home Screen, About Pockets. Footer "Pockets · Version 1.0".

### Categories
Defaults (Phosphor regular, white on neutral tile; chart colour used only for Calendar dots):
groceries `ph-basket` #5AA0F0 · restaurants `ph-fork-knife` #4FC48A · shopping `ph-bag-simple` #A884F0 · bills "Bills & Utilities" `ph-receipt` #8FA0B8 · subscriptions `ph-repeat` #E8B83E · entertainment `ph-ticket` #EE6F7C · transport `ph-train-simple` #F09A55 · gifts `ph-gift` #EE86B4 · self "Self improvement" `ph-book-open` #E2725E · other `ph-dots-three` #9AA0AA.
- Add: name + icon from an 18–24 icon grid; new categories go above Other; colour assigned from the palette in turn.
- Delete: coral `ph-fill ph-minus-circle`. If it has expenses → action sheet "Delete {name}?" / "{n} expenses will move to Other. This can't be undone." / Delete category / Cancel. If empty → delete immediately. **Other** shows a lock and can't be deleted.
- Reorder by drag (`ph-list` handle). Categories belong to a Pocket.

### Currencies
GBP £, INR ₹, USD $, EUR €, AUD A$, CAD C$, SGD S$, NZD NZ$. Per Pocket. At least one stays on. Turning one off hides it but keeps its history. First = Main (used for Where it went and By person bars).

### Budgets
One monthly budget per currency per Pocket, editable (34 px amount field with pencil). Defaults: £3,200 and ₹25,000 in demo; new Pockets start with no budget (bar hidden until set).

### People & invites
- Owner creates an invite: random 6-char code shown as `XXX-XXX` (no 0/O/1/I), deep link `https://<host>/join/<code>`, QR of that link. Expires in 48 h, single use. Owner can cancel pending invites.
- Joiner opens the link or enters the code (after signing up/logging in), sees "{Owner} invited you to {Pocket}", members and currencies, sets their display name, chooses **Keep in Personal** or **Move to {Pocket}** for existing expenses, then **Join** / Not now.
- Owner can remove members; members can leave. Removed/left members' expenses stay, showing their initials.
- Only the owner can rename/delete the Pocket, remove members, and change currencies. Everyone can add/edit/delete expenses and manage categories.
- Initials: first letter of first and last name, editable in Account. Must be unique within a Pocket (append a digit if not).

### PIN lock
4 digits, stored on the device only (hashed, e.g. PBKDF2 in IndexedDB), never in Firestore. Asked on cold start and after 5 minutes in background. "Forgot PIN? Log in again" signs out, clears the local PIN and asks for a new one after logging in. Always on.

### Offline
Firestore offline persistence. When offline, show the offline toast "{n} expenses saved on this phone. They'll sync when you're back online." Count = pending writes.

### Export
CSV per Pocket: date, name, category, currency, amount (major units), added by, note.

## 7. Data model (Firestore)

```
users/{uid}
  name, initials, email, createdAt, pocketIds: [..]
pockets/{pocketId}
  name, type: 'personal'|'shared', ownerUid, currencies: ['GBP','INR'],
  budgets: { GBP: 320000, INR: 2500000 }, createdAt
pockets/{pocketId}/members/{uid}
  name, initials, role: 'owner'|'member', joinedAt
pockets/{pocketId}/categories/{catId}
  name, icon, colour, order, system: bool   // 'other' is system
pockets/{pocketId}/expenses/{expenseId}
  currency, amountMinor: int, name, categoryId, byUid, byInitials,
  editedByUid?, date: 'YYYY-MM-DD', note?, createdAt, updatedAt
invites/{code}
  pocketId, pocketName, createdByUid, createdAt, expiresAt, usedByUid?
```

### Security rules (summary)
- `users/{uid}`: read/write only by that uid.
- `pockets/{id}` and subcollections: read/write only if `request.auth.uid` is in `members`. Personal Pockets have exactly one member.
- Only `role == 'owner'` may update `name`, `currencies`, delete the Pocket, or delete other members.
- `invites/{code}`: create by a member of `pocketId`; read by any signed-in user; redeem via a **Cloud Function** `joinPocket(code, name, moveExpenses)` that checks expiry/single use, adds the member, and optionally moves the caller's Personal expenses.
- Deleting a category: batched write that sets `categoryId = 'other'` on its expenses, then deletes the category (use a Cloud Function for >500 expenses).

## 8. Tokens

- Card `#1C2230` · raised slate `#2A3242` · avatar `#2E3646`
- Text `#FFFFFF` · secondary `rgba(235,240,250,0.62)` · tertiary `rgba(235,240,250,0.35)` · hairline `0.5px solid rgba(255,255,255,0.12)`
- Accent / links / budget `#4F8BFF` · soft link `#8AB4FF` · insight `rgba(79,139,255,0.16)`
- Destructive text `#FF8A84` on `#4A2230` · good `#6EDC96` · bad `#FF8F85`
- Fills: input / segmented track `rgba(118,118,128,0.24)`, selected segment `#636366`, neutral tile `rgba(255,255,255,0.08)`
- Primary button: 52 px, radius 26, `#FFFFFF`, text `#05080F` 17 / 600
- Type (Involve only, no other fonts): 54–58 amount, 48 headline/hero amount, 34 page title, 28 sheet/setup title, 20–22 section, 17 body, 15 secondary, 13 caption, 12 badge. Weights 400 / 500 / 600 / 700. Amounts `tabular-nums`.
- Radii: 38 sheet, 32 tab bar / insight, 28 hero cards / popovers, 26 buttons, 24 choice cards, 22 inputs & glass buttons, 20 lists, 12 settings groups & calendar cells, 8–11 icon tiles.

## 9. Acceptance checklist

- [ ] Every V1 screen matches the design at 390 × 844 (side-by-side check).
- [ ] New user: sign up → setup → lands in Personal (or Home + Invite).
- [ ] Two accounts on two devices: invite by link, code and QR; expenses appear on both within 2 s.
- [ ] Added by shows correct initials; person filter works; By person totals are correct per currency.
- [ ] Totals never mix currencies.
- [ ] Deleting a category with expenses moves them to Other after confirmation.
- [ ] Offline add → toast → syncs on reconnect.
- [ ] Security rules tests pass (non-member can't read a Pocket; member can't delete the Pocket).
- [ ] PWA installs from Safari "Add to Home Screen" and opens full screen.
- [ ] Anyone can self-host by following the repo README.
