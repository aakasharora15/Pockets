import { afterEach, describe, expect, it, vi } from 'vitest';
import { combine, combinedTotalsBy, rateOn, type DailyRates } from '../rates';

// Base GBP: units of each currency per £1.
const rates: DailyRates = {
  '2026-10-02': { INR: 112.5, USD: 1.34 },
  '2026-10-05': { INR: 113.0, USD: 1.35 },
  '2026-10-06': { INR: 112.0 },
};

describe('exchange rates', () => {
  it("uses the expense's own date, or the last working day before it", () => {
    expect(rateOn(rates, 'INR', '2026-10-05')).toBe(113);
    // Saturday and Sunday use Friday's rate.
    expect(rateOn(rates, 'INR', '2026-10-03')).toBe(112.5);
    expect(rateOn(rates, 'INR', '2026-10-04')).toBe(112.5);
    // A currency missing on the day falls back to its last rate.
    expect(rateOn(rates, 'USD', '2026-10-06')).toBe(1.35);
    // Nothing earlier: no rate.
    expect(rateOn(rates, 'INR', '2026-10-01')).toBeUndefined();
  });

  it('converts each expense at its own rate and keeps the target currency as is', () => {
    const lookup = (code: 'INR' | 'USD' | 'GBP', date: string) => rateOn(rates, code as 'INR', date);
    const { total, missing } = combine(
      [
        { currency: 'GBP', amountMinor: 248650, date: '2026-10-05' }, // £2,486.50
        { currency: 'INR', amountMinor: 1130000, date: '2026-10-05' }, // ₹11,300 at 113 = £100
        { currency: 'INR', amountMinor: 1125000, date: '2026-10-04' }, // ₹11,250 at 112.5 = £100
        { currency: 'USD', amountMinor: 13500, date: '2026-10-06' }, // $135 at 1.35 = £100
      ],
      'GBP',
      lookup as never,
    );
    expect(total).toBe(248650 + 30000);
    expect(missing).toBe(0);
  });

  it('counts expenses it has no rate for', () => {
    const r = combine([{ currency: 'INR', amountMinor: 100000, date: '2026-09-01' }], 'GBP', (c, d) => rateOn(rates, c, d));
    expect(r).toEqual({ total: 0, missing: 1 });
  });

  it('rounds to the nearest minor unit', () => {
    // ₹1,000 at 112.5 = £8.888… → £8.89
    expect(combine([{ currency: 'INR', amountMinor: 100000, date: '2026-10-02' }], 'GBP', (c, d) => rateOn(rates, c, d)).total).toBe(889);
  });

  describe('per payer', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('converts each payer\'s expenses into one currency', async () => {
      // A flat ₹112.50 to the pound on every working day of September 2026.
      vi.stubGlobal('fetch', async (url: string) => {
        const u = new URL(url);
        const rows = [];
        for (let d = new Date(`${u.searchParams.get('from')}T12:00:00Z`); d.toISOString().slice(0, 10) <= u.searchParams.get('to')!; d.setUTCDate(d.getUTCDate() + 1)) {
          rows.push({ date: d.toISOString().slice(0, 10), base: 'GBP', quote: 'INR', rate: 112.5 });
        }
        return new Response(JSON.stringify(rows), { status: 200 });
      });
      const expenses = [
        { currency: 'GBP' as const, amountMinor: 5000, date: '2026-09-10', by: 'PS' }, // £50
        { currency: 'INR' as const, amountMinor: 1125000, date: '2026-09-11', by: 'PS' }, // ₹11,250 = £100
        { currency: 'INR' as const, amountMinor: 225000, date: '2026-09-12', by: 'AA' }, // ₹2,250 = £20
      ];
      const by = await combinedTotalsBy(expenses, 'GBP', (i) => expenses[i].by);
      expect(by.get('PS')).toEqual({ total: 15000, missing: 0 });
      expect(by.get('AA')).toEqual({ total: 2000, missing: 0 });
    });
  });
});
