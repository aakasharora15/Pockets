import { describe, expect, it } from 'vitest';
import { parseReceipt } from '../receiptText';

describe('receipt text', () => {
  it('UK supermarket: total, not subtotal or savings', () => {
    const text = `TESCO
Express
Camden Road
VAT No. GB 220 4302 31
BANANAS LOOSE          £0.94
SEMI SKIMMED MILK      £1.65
SOURDOUGH LOAF         £2.50
SUBTOTAL               £5.09
Clubcard savings      -£0.40
TOTAL                  £4.69
CARD                   £4.69
11/10/2026 14:32`;
    expect(parseReceipt(text)).toEqual({ amount: 4.69, merchant: 'Tesco', currency: 'GBP' });
  });

  it('restaurant bill with service: grand total wins over total', () => {
    const text = `DISHOOM
King's Cross
Table 12   Covers 2
Total            64.00
Service 12.5%     8.00
Grand Total      72.00
Thank you`;
    expect(parseReceipt(text)).toMatchObject({ amount: 72, merchant: 'Dishoom' });
  });

  it('Indian bill: rupees with Indian grouping and GST', () => {
    const text = `Fabindia
Khan Market, New Delhi
GSTIN 07AAACF1234A1Z5
Kurta            1,899.00
Dupatta          2,450.00
CGST 2.5%           108.73
SGST 2.5%           108.73
Net Amount       ₹4,566.46`;
    expect(parseReceipt(text)).toEqual({ amount: 4566.46, merchant: 'Fabindia', currency: 'INR' });
  });

  it('amount on the line after the label', () => {
    const text = `Pret A Manger
Amount due
£7.85`;
    expect(parseReceipt(text).amount).toBe(7.85);
  });

  it('no total line: the largest price', () => {
    const text = `Corner Shop
Milk 1.20
Bread 1.10
Paid by card 2.30`;
    expect(parseReceipt(text).amount).toBe(2.3);
  });

  it('ignores dates, times, percentages and card numbers', () => {
    const text = `CAFE NERO
12/10/2026 09:15
Card ************1234
Flat white 3.45
TOTAL 3.45`;
    expect(parseReceipt(text)).toMatchObject({ amount: 3.45, merchant: 'Cafe Nero' });
  });

  it('comma decimals', () => {
    expect(parseReceipt('Lidl\nSumme\nTOTAL 12,50 €').amount).toBe(12.5);
  });

  it('OCR reading 1 for l in total', () => {
    expect(parseReceipt('Boots\nTOTA1 9.99').amount).toBe(9.99);
  });

  it('returns nothing when it cannot tell', () => {
    expect(parseReceipt('')).toEqual({ amount: undefined, merchant: undefined, currency: undefined });
  });
});
