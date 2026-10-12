import { describe, expect, it } from 'vitest';
import { dueDates, dueIn, firstDue, occurrenceId, ordinal, repeatLabel } from '../recurring';

describe('recurring', () => {
  it('uses the last day in shorter months, then goes back', () => {
    expect(dueIn('2026-02', 31)).toBe('2026-02-28');
    expect(dueIn('2028-02', 30)).toBe('2028-02-29');
    expect(dueIn('2026-04', 31)).toBe('2026-04-30');
    expect(dueIn('2026-05', 31)).toBe('2026-05-31');
  });

  it('first automatic date is next month for a new expense', () => {
    expect(firstDue('2026-10-01', 1, '2026-10-01')).toBe('2026-11-01');
    expect(firstDue('2026-01-31', 31, '2026-01-31')).toBe('2026-02-28');
    expect(firstDue('2026-12-15', 15, '2026-12-15')).toBe('2027-01-15');
  });

  it('marking an old expense as repeating does not back-fill', () => {
    // Rent from 1 July marked as repeating on 11 Oct: next one is 1 Nov, not Aug, Sept and Oct.
    expect(firstDue('2026-07-01', 1, '2026-10-11')).toBe('2026-11-01');
    // Due later this month: logged this month.
    expect(firstDue('2026-09-20', 20, '2026-10-11')).toBe('2026-10-20');
  });

  it('a future-dated expense repeats the month after it', () => {
    expect(firstDue('2026-11-01', 1, '2026-10-11')).toBe('2026-12-01');
  });

  it('catches up every missed month, in order', () => {
    expect(dueDates('2026-08-31', 31, '2026-10-11')).toEqual({ dates: ['2026-08-31', '2026-09-30'], next: '2026-10-31' });
    expect(dueDates('2026-10-11', 11, '2026-10-11')).toEqual({ dates: ['2026-10-11'], next: '2026-11-11' });
    expect(dueDates('2026-11-01', 1, '2026-10-11')).toEqual({ dates: [], next: '2026-11-01' });
  });

  it('caps a long catch-up', () => {
    expect(dueDates('2020-01-01', 1, '2026-10-11', 36).dates).toHaveLength(36);
  });

  it('labels and ids', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st']);
    expect(repeatLabel(1)).toBe('Monthly on the 1st');
    expect(repeatLabel(31)).toBe('Monthly on the 31st or last day');
    expect(occurrenceId('abc', '2026-11-01')).toBe('rec_abc_2026-11-01');
  });
});
