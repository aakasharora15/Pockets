// Seeds the local emulators with sample data so every screen has something to show.
// Usage: start the emulators (npm run emulators), then `npm run seed`.
// Log in as prernaa@example.com / password123 (or aakash@example.com). App PIN: set any on first open.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

const PROJECT = 'demo-spendr';
const AUTH = 'http://127.0.0.1:9099';
const month = process.env.SEED_MONTH ?? new Date().toISOString().slice(0, 7);
const prev = (() => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
})();

async function user(email, name) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', displayName: name, returnSecureToken: true }),
  });
  const body = await res.json();
  if (body.localId) return body.localId;
  // Already exists: sign in instead.
  const r2 = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123', returnSecureToken: true }),
  });
  return (await r2.json()).localId;
}

const CATS = [
  ['restaurants', 'Restaurants', 'fork-knife', '#4FC48A'],
  ['groceries', 'Groceries', 'basket', '#5AA0F0'],
  ['shopping', 'Shopping', 'bag-simple', '#A884F0'],
  ['bills', 'Bills & Utilities', 'receipt', '#8FA0B8'],
  ['transport', 'Transport', 'train-simple', '#F09A55'],
  ['gifts', 'Gifts', 'gift', '#EE86B4'],
  ['self', 'Self improvement', 'book-open', '#E2725E'],
  ['entertainment', 'Entertainment', 'ticket', '#EE6F7C'],
  ['subscriptions', 'Subscriptions', 'repeat', '#E8B83E'],
  ['other', 'Other', 'dots-three', '#9AA0AA'],
];

const env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { host: '127.0.0.1', port: 8080 } });
const ps = await user('prernaa@example.com', 'Prernaa Singh');
const aa = await user('aakash@example.com', 'Aakash');
const who = { PS: ps, AA: aa };

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const now = Timestamp.now();
  const pocket = async (id, name, type, owner, members, currencies, budgets) => {
    await setDoc(doc(db, 'pockets', id), { name, type, ownerUid: owner, currencies, budgets, createdAt: now });
    for (const [uid, mname, initials, role] of members) {
      await setDoc(doc(db, 'pockets', id, 'members', uid), { uid, name: mname, initials, role, joinedAt: Timestamp.fromDate(new Date('2026-08-02')) });
    }
    for (const [i, [cid, cname, icon, colour]] of CATS.entries()) {
      await setDoc(doc(db, 'pockets', id, 'categories', cid), { name: cname, icon, colour, order: (i + 1) * 1000, system: cid === 'other' });
    }
  };

  await setDoc(doc(db, 'users', ps), { name: 'Prernaa Singh', initials: 'PS', email: 'prernaa@example.com', createdAt: now, pocketIds: [`personal_${ps}`, 'home'] });
  await setDoc(doc(db, 'users', aa), { name: 'Aakash', initials: 'AA', email: 'aakash@example.com', createdAt: now, pocketIds: [`personal_${aa}`, 'home'] });
  await pocket(`personal_${ps}`, 'Personal', 'personal', ps, [[ps, 'Prernaa Singh', 'PS', 'owner']], ['GBP'], {});
  await pocket(`personal_${aa}`, 'Personal', 'personal', aa, [[aa, 'Aakash', 'AA', 'owner']], ['GBP', 'INR'], {});
  await pocket('home', 'Home', 'shared', ps, [[ps, 'Prernaa Singh', 'PS', 'owner'], [aa, 'Aakash', 'AA', 'member']], ['GBP', 'INR'], { GBP: 320000, INR: 2500000 });
  await setDoc(doc(db, 'pockets', 'home'), { tags: ['India Dec 2026'] }, { merge: true });

  // [day, name, category, currency, amount (major), by]
  const sept = [
    [18, 'Tesco weekly shop', 'groceries', 'GBP', 86.4, 'PS'], [2, "Sainsbury's", 'groceries', 'GBP', 120, 'AA'],
    [5, 'Tesco', 'groceries', 'GBP', 150, 'PS'], [8, 'Waitrose', 'groceries', 'GBP', 160, 'AA'], [12, 'Tesco', 'groceries', 'GBP', 179.6, 'PS'],
    [16, 'Dishoom', 'restaurants', 'GBP', 64, 'PS'], [19, 'Pret A Manger', 'restaurants', 'GBP', 8.45, 'PS'], [2, "Nando's", 'restaurants', 'GBP', 45.55, 'AA'],
    [4, 'Hawksmoor', 'restaurants', 'GBP', 180, 'PS'], [10, 'Wagamama', 'restaurants', 'GBP', 60, 'AA'], [13, 'Padella', 'restaurants', 'GBP', 139, 'PS'],
    [15, 'Octopus Energy', 'bills', 'GBP', 112, 'PS'], [1, 'Council tax', 'bills', 'GBP', 220, 'AA'], [15, 'Thames Water', 'bills', 'GBP', 116, 'AA'],
    [17, 'Zara', 'shopping', 'GBP', 49.99, 'PS'], [5, 'John Lewis', 'shopping', 'GBP', 150.01, 'AA'], [13, 'Uniqlo', 'shopping', 'GBP', 148, 'PS'],
    [17, 'Spotify', 'subscriptions', 'GBP', 11.99, 'AA'], [10, 'Netflix', 'subscriptions', 'GBP', 17.99, 'PS'], [12, 'Gym', 'subscriptions', 'GBP', 169.02, 'PS'],
    [19, 'Uber', 'transport', 'GBP', 14.2, 'AA'], [18, 'Trainline', 'transport', 'GBP', 35, 'PS'], [1, 'Oyster top-up', 'transport', 'GBP', 100, 'PS'],
    [9, 'Car hire', 'transport', 'GBP', 127.3, 'AA'], [18, 'Boots', 'other', 'GBP', 22, 'AA'],
    [18, 'Gift for Mum', 'gifts', 'INR', 4500, 'PS'], [12, 'Wedding gift', 'gifts', 'INR', 4000, 'AA'], [16, 'Online course', 'self', 'INR', 2999, 'AA'],
    [3, 'Books', 'self', 'INR', 3000, 'PS'], [9, 'Sarees', 'shopping', 'INR', 3800, 'PS'],
  ];
  const aug = [
    [3, 'Tesco', 'groceries', 'GBP', 800, 'PS'], [9, 'Dinner out', 'restaurants', 'GBP', 700, 'AA'], [15, 'Octopus Energy', 'bills', 'GBP', 448, 'PS'],
    [20, 'Shopping', 'shopping', 'GBP', 500, 'AA'], [22, 'Trains', 'transport', 'GBP', 377.57, 'PS'],
    [12, 'Wedding gift', 'gifts', 'INR', 10000, 'PS'], [30, 'Sarees', 'shopping', 'INR', 6943, 'AA'],
  ];
  let n = 0;
  const today = Number(process.env.SEED_TODAY ?? 31);
  for (const [list, m] of [[sept, month], [aug, prev]]) {
    for (const [day, name, cat, cur, amt, by] of list) {
      if (m === month && day > today) continue;
      const d = `${m}-${String(day).padStart(2, '0')}`;
      await setDoc(doc(db, 'pockets', 'home', 'expenses', `e${++n}`), {
        currency: cur, amountMinor: Math.round(amt * 100), name, categoryId: cat,
        byUid: who[by], byInitials: by, date: d, createdAt: Timestamp.fromMillis(Date.now() - n * 1000), updatedAt: now,
      });
    }
  }
  // A trip tag and a monthly repeat that's due, so the app logs it on first open.
  const trip = [
    [`${prev}-02`, 'Flights to Delhi', 'transport', 'GBP', 640, 'PS'], [`${prev}-14`, 'Hotel deposit, Jaipur', 'other', 'INR', 24000, 'PS'],
    [`${prev}-14`, 'Train tickets', 'transport', 'INR', 6100, 'AA'], [`${prev}-20`, 'e-Visa', 'other', 'GBP', 116, 'PS'],
  ];
  for (const [i, [d, name, cat, cur, amt, by]] of trip.entries()) {
    await setDoc(doc(db, 'pockets', 'home', 'expenses', `t${i + 1}`), {
      currency: cur, amountMinor: Math.round(amt * 100), name, categoryId: cat, byUid: who[by], byInitials: by, date: d,
      tag: 'India Dec 2026', createdAt: now, updatedAt: now,
    });
  }
  await setDoc(doc(db, 'pockets', 'home', 'recurring', 'rent'), {
    currency: 'GBP', amountMinor: 145000, name: 'Rent', categoryId: 'bills', byUid: ps, byInitials: 'PS',
    day: 1, nextDate: `${month}-01`, createdByUid: ps, createdAt: now, updatedAt: now,
  });
  await setDoc(doc(db, 'pockets', `personal_${ps}`, 'expenses', 'p1'), {
    currency: 'GBP', amountMinor: 1250, name: 'Coffee beans', categoryId: 'groceries', byUid: ps, byInitials: 'PS',
    date: `${month}-05`, createdAt: now, updatedAt: now,
  });
});
await env.cleanup();
console.log(`Seeded ${month} and ${prev}. Log in as prernaa@example.com / password123`);
