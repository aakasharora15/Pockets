import { describe, expect, it } from 'vitest';
import type { Category, Expense, Member } from '../../data/types';
import { expensesToCsv } from '../csv';
import { addMonths, daysInMonth, groupLabel, longDate, monthShort, sheetDateLabel, toDayKey, weekdayDate } from '../dates';
import { initialsFor, uniqueInitials } from '../initials';
import { CODE_ALPHABET, formatCode, generateCode, normaliseCode } from '../inviteCode';
import { displayTyped, formatMoney, formatShort, formatWhole, formatWholeDown, pressKey, typedToMinor } from '../money';
import { byCategory, totalIn, trend, weeklyBars } from '../stats';

const ex = (o: Partial<Expense>): Expense => ({
  id: 'x',
  currency: 'GBP',
  amountMinor: 100,
  name: 'n',
  categoryId: 'other',
  byUid: 'u',
  byInitials: 'U',
  date: '2026-09-01',
  createdAt: null,
  updatedAt: null,
  ...o,
});

describe('money', () => {
  it('formats pounds with pence and rupees in Indian grouping with no decimals', () => {
    expect(formatMoney(248650, 'GBP')).toBe('£2,486.50');
    expect(formatMoney(1829900, 'INR')).toBe('₹18,299');
    expect(formatMoney(28060000, 'INR')).toBe('₹2,80,600');
    expect(formatMoney(1199, 'NZD')).toBe('NZ$11.99');
  });
  it('whole and short formats', () => {
    expect(formatWhole(71350, 'GBP')).toBe('£714');
    expect(formatWholeDown(248650, 'GBP')).toBe('£2,486');
    expect(formatShort(65300, 'GBP')).toBe('£653');
    expect(formatShort(450000, 'INR')).toBe('₹4.5k');
    expect(formatShort(80000, 'INR')).toBe('₹800');
  });
  it('keypad: max 7 integer digits, 2 decimals for £, none for ₹', () => {
    let t = '';
    for (const k of '12345678') t = pressKey(t, k, 'GBP');
    expect(t).toBe('1234567');
    expect(pressKey('64', '.', 'GBP')).toBe('64.');
    expect(pressKey('64.99', '1', 'GBP')).toBe('64.99');
    expect(pressKey('', '.', 'GBP')).toBe('0.');
    expect(pressKey('2999', '.', 'INR')).toBe('2999.');
    expect(pressKey('1.0', '3', 'INR')).toBe('1.03');
    expect(typedToMinor('1.03', 'INR')).toBe(103);
    expect(formatMoney(103, 'INR')).toBe('₹1.03');
    expect(pressKey('0', '5', 'GBP')).toBe('5');
    expect(pressKey('64.0', 'del', 'GBP')).toBe('64.');
  });
  it('stores integer minor units (paise for ₹)', () => {
    expect(typedToMinor('64.', 'GBP')).toBe(6400);
    expect(typedToMinor('8.45', 'GBP')).toBe(845);
    expect(typedToMinor('2999', 'INR')).toBe(299900);
    expect(typedToMinor('', 'GBP')).toBe(0);
  });
  it('shows typed amounts with grouping', () => {
    expect(displayTyped('2999', 'INR')).toBe('2,999');
    expect(displayTyped('1234567.5', 'GBP')).toBe('1,234,567.5');
    expect(displayTyped('', 'GBP')).toBe('0');
  });
});

describe('dates', () => {
  it('uses British short months', () => {
    expect(longDate('2026-09-18')).toBe('18 Sept 2026');
    expect(monthShort('2026-06')).toBe('June');
    expect(weekdayDate('2026-09-17')).toBe('Thu 17 Sept');
  });
  it('labels today and yesterday', () => {
    const today = new Date();
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    expect(groupLabel(toDayKey(today))).toBe('Today');
    expect(sheetDateLabel(toDayKey(y)).startsWith('Yesterday, ')).toBe(true);
  });
  it('month arithmetic', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(daysInMonth('2028-02')).toBe(29);
  });
});

describe('initials', () => {
  it('first letters of first and last name', () => {
    expect(initialsFor('Prernaa Singh')).toBe('PS');
    expect(initialsFor('Trina')).toBe('TR');
    expect(initialsFor('  aakash  kumar arora ')).toBe('AA');
  });
  it('are unique within a Pocket', () => {
    expect(uniqueInitials('AA', ['PS', 'AA'])).toBe('AA2');
    expect(uniqueInitials('TR', ['PS', 'AA'])).toBe('TR');
  });
});

describe('invite codes', () => {
  it('six characters without 0, O, 1 or I', () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
    }
  });
  it('formats and normalises', () => {
    expect(formatCode('K7PQ2M')).toBe('K7P-Q2M');
    expect(normaliseCode('k7p-q2m')).toBe('K7PQ2M');
    expect(normaliseCode('K7P-Q2O')).toBeNull();
    expect(normaliseCode('K7P')).toBeNull();
  });
});

describe('stats', () => {
  const list = [
    ex({ amountMinor: 1000, date: '2026-09-02', categoryId: 'groceries' }),
    ex({ amountMinor: 3000, date: '2026-09-09', categoryId: 'restaurants' }),
    ex({ amountMinor: 500000, currency: 'INR', date: '2026-09-09', categoryId: 'gifts' }),
  ];
  it('never mixes currencies', () => {
    expect(totalIn(list, 'GBP')).toBe(4000);
    expect(totalIn(list, 'INR')).toBe(500000);
    expect(byCategory(list, 'GBP').map((r) => r.categoryId)).toEqual(['restaurants', 'groceries']);
  });
  it('weekly bars cover the whole month', () => {
    const { weeks } = weeklyBars(list, 'GBP', '2026-09');
    expect(weeks.map((w) => w.label)).toEqual(['1–7', '8–14', '15–21', '22–28', '29–30']);
    expect(weeks[0].total).toBe(1000);
    expect(weeks[1].total).toBe(3000);
    expect(weeklyBars([], 'GBP', '2027-02').weeks).toHaveLength(4);
  });
  it('trend', () => {
    expect(trend(88, 100)).toBe(-12);
    expect(trend(100, 0)).toBeNull();
  });
});

describe('csv', () => {
  it('exports major units and escapes', () => {
    const cats: Category[] = [{ id: 'groceries', name: 'Groceries', icon: 'basket', colour: '#fff', order: 1, system: false }];
    const members: Member[] = [{ uid: 'u', name: 'Prernaa Singh', initials: 'PS', role: 'owner', joinedAt: null }];
    const csv = expensesToCsv(
      [
        ex({ name: 'Tesco, weekly', categoryId: 'groceries', amountMinor: 8640, date: '2026-09-18', note: 'Big "shop"', tag: 'Goa trip', recurringId: 'r1' }),
        ex({ name: '=SUM(A1)', currency: 'INR', amountMinor: 450000, byUid: 'gone', byInitials: 'TR' }),
      ],
      cats,
      members,
    );
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe('date,name,category,currency,amount,paid by,note,tag,repeats monthly');
    expect(lines[1]).toBe("2026-09-01,'=SUM(A1),Other,INR,4500,TR,,,");
    expect(lines[2]).toBe('2026-09-18,"Tesco, weekly",Groceries,GBP,86.40,Prernaa Singh,"Big ""shop""",Goa trip,yes');
  });
});
