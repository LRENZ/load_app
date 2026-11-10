import { test } from 'node:test';
import assert from 'node:assert/strict';
import { D } from '../src/core/decimal.ts';
import { calculateLoan, validateLoanForm } from '../src/core/loan.ts';
import { calculateMortgage, downPaymentAmountOf, downPaymentPercentOf, validateMortgageForm } from '../src/core/mortgage.ts';
import { parseIso, plusMonths, formatIso, parseMdy, formatMdy } from '../src/core/localDate.ts';
import { parseDecimalField } from '../src/core/numberInput.ts';
import { formatMoney } from '../src/core/currency.ts';

const date = (s: string) => parseIso(s)!;
const calc = (p: string, r: string, n: number, start = '2026-11-10') => calculateLoan(new D(p), new D(r), n, date(start));

test('C01 10000 @ 6% for 12 months', () => {
  const r = calc('10000', '6', 12, '2026-11-10');
  assert.ok(r.ok);
  assert.deepEqual(
    { m: r.result.monthly, t: r.result.total, i: r.result.interest, p: formatIso(r.result.payoff) },
    { m: '860.66', t: '10327.92', i: '327.92', p: '2027-11-10' },
  );
});

test('C02 zero rate rounding with month-end clamp', () => {
  const r = calc('100', '0', 3, '2026-01-31');
  assert.ok(r.ok);
  assert.equal(r.result.monthly, '33.33');
  assert.equal(r.result.total, '100.00');
  assert.equal(r.result.interest, '0.00');
  assert.equal(formatIso(r.result.payoff), '2026-04-30');
});

test('C03 monthly payment too small', () => {
  const r = calc('1', '0', 1200);
  assert.deepEqual(r, { ok: false, failure: 'payment_too_small' });
});

test('C04 rounded total below principal', () => {
  const r = calc('0.17', '0.0001', 12);
  assert.deepEqual(r, { ok: false, failure: 'total_below_principal' });
});

test('C05 one month 12% with Feb clamp', () => {
  const r = calc('1000', '12', 1, '2026-01-31');
  assert.ok(r.ok);
  assert.equal(r.result.monthly, '1010.00');
  assert.equal(r.result.total, '1010.00');
  assert.equal(r.result.interest, '10.00');
  assert.equal(formatIso(r.result.payoff), '2026-02-28');
});

test('C06 auto 25000 @ 5% for 60 months', () => {
  const r = calc('25000', '5', 60);
  assert.ok(r.ok);
  assert.equal(r.result.monthly, '471.78');
  assert.equal(r.result.total, '28306.80');
  assert.equal(r.result.interest, '3306.80');
});

test('C07 12347.89 @ 7.125% for 17 months', () => {
  const r = calc('12347.89', '7.125', 17);
  assert.ok(r.ok);
  assert.equal(r.result.monthly, '765.77');
  assert.equal(r.result.total, '13018.09');
  assert.equal(r.result.interest, '670.20');
});

test('C08 mortgage with ownership costs', () => {
  const r = calculateMortgage({
    homePrice: new D('500000'),
    downPayment: new D('100000'),
    downPaymentPercent: new D('20'),
    rate: new D('6'),
    termYears: 30,
    propertyTax: new D('6000'),
    pmi: new D('1200'),
    hoa: new D('2400'),
    insurance: new D('1200'),
  });
  assert.ok(r.ok);
  assert.equal(r.result.principal, '400000.00');
  assert.equal(r.result.principalInterest, '2398.20');
  assert.equal(r.result.propertyTax, '500.00');
  assert.equal(r.result.pmi, '100.00');
  assert.equal(r.result.hoa, '200.00');
  assert.equal(r.result.insurance, '100.00');
  assert.equal(r.result.monthlyTotal, '3298.20');
  assert.equal(r.result.totalPayment, '1187352.00');
  assert.equal(r.result.totalInterest, '787352.00');
});

test('mortgage zero costs and zero rate', () => {
  const r = calculateMortgage({
    homePrice: new D('120000'),
    downPayment: new D('0'),
    downPaymentPercent: new D('0'),
    rate: new D('0'),
    termYears: 10,
    propertyTax: new D('0'),
    pmi: new D('0'),
    hoa: new D('0'),
    insurance: new D('0'),
  });
  assert.ok(r.ok);
  assert.equal(r.result.principalInterest, '1000.00');
  assert.equal(r.result.monthlyTotal, '1000.00');
});

test('mortgage per-cost rounding happens before the sum', () => {
  // 100/12 = 8.333.. → 8.33 each; four costs → 33.32 (not round(400/12)=33.33)
  const r = calculateMortgage({
    homePrice: new D('1200'),
    downPayment: new D('0'),
    downPaymentPercent: new D('0'),
    rate: new D('0'),
    termYears: 1,
    propertyTax: new D('100'),
    pmi: new D('100'),
    hoa: new D('100'),
    insurance: new D('100'),
  });
  assert.ok(r.ok);
  assert.equal(r.result.monthlyTotal, '133.32');
});

test('mortgage amount/percent coupling', () => {
  assert.equal(downPaymentPercentOf(new D('500000'), new D('100000')).toFixed(2), '20.00');
  assert.equal(downPaymentAmountOf(new D('500000'), new D('20')).toFixed(2), '100000.00');
  assert.equal(downPaymentPercentOf(new D('333333'), new D('100000')).toFixed(2), '30.00');
});

test('mortgage form validation precedence', () => {
  const base = { homePrice: '500000', downPayment: '100000', downPaymentPercent: '20', rate: '6', term: '30', propertyTax: '6000', pmi: '1200', hoa: '2400', insurance: '1200' };
  assert.ok(validateMortgageForm(base).ok);
  assert.equal((validateMortgageForm({ ...base, homePrice: '' }) as { error: string }).error, 'home_price_required');
  assert.equal((validateMortgageForm({ ...base, downPayment: '500000' }) as { error: string }).error, 'down_payment_constraints');
  assert.equal((validateMortgageForm({ ...base, downPaymentPercent: '25' }) as { error: string }).error, 'down_payment_relation');
  assert.equal((validateMortgageForm({ ...base, term: '31' }) as { error: string }).error, 'term_constraints');
  assert.equal((validateMortgageForm({ ...base, hoa: '' }) as { error: string }).error, 'cost_required');
  assert.equal((validateMortgageForm({ ...base, rate: 'abc' }) as { error: string }).error, 'rate_invalid');
});

test('loan form validation and messages order', () => {
  const ok = { amount: '10000', rate: '6', term: '12', termUnit: 'months' as const, startDate: date('2026-11-10') };
  assert.ok(validateLoanForm(ok).ok);
  const e = (f: Partial<typeof ok>) => {
    const r = validateLoanForm({ ...ok, ...f });
    return r.ok ? 'ok' : r.error;
  };
  assert.equal(e({ amount: '' }), 'amount_required');
  assert.equal(e({ amount: '  ' }), 'amount_required');
  assert.equal(e({ amount: '1e5' }), 'amount_invalid');
  assert.equal(e({ amount: '10.123' }), 'amount_constraints');
  assert.equal(e({ amount: '0' }), 'amount_constraints');
  assert.equal(e({ amount: '1000000000' }), 'amount_constraints');
  assert.equal(e({ amount: '999999999.99' }), 'ok');
  assert.equal(e({ amount: '0.01' }), 'ok');
  assert.equal(e({ amount: ' 0010000. ' }), 'ok');
  assert.equal(e({ rate: '' }), 'rate_required');
  assert.equal(e({ rate: '100.0001' }), 'rate_constraints');
  assert.equal(e({ rate: '6.12345' }), 'rate_constraints');
  assert.equal(e({ rate: '0' }), 'ok');
  assert.equal(e({ term: '' }), 'term_required');
  assert.equal(e({ term: '0' }), 'term_constraints_months');
  assert.equal(e({ term: '361' }), 'term_constraints_months');
  assert.equal(e({ term: '1.5' }), 'term_constraints_months');
  assert.equal(e({ term: '31', termUnit: 'years' }), 'term_constraints_years');
  assert.equal(e({ startDate: null as unknown as undefined }), 'date_required');
  assert.equal(e({ startDate: { year: 1899, month: 12, day: 31 } }), 'date_out_of_range');
  const y = validateLoanForm({ ...ok, term: '2', termUnit: 'years' });
  assert.ok(y.ok && y.value.termMonths === 24);
});

test('decimal parser keeps reference check order', () => {
  assert.deepEqual(parseDecimalField('-5', 2, '0.01', '999999999.99'), { ok: false, error: 'out_of_range' });
  assert.deepEqual(parseDecimalField('-5.123', 2, '0.01', '999999999.99'), { ok: false, error: 'too_many_decimals' });
  assert.deepEqual(parseDecimalField('.', 2, '0.01', '999999999.99'), { ok: false, error: 'invalid' });
  const r = parseDecimalField('+.5', 2, '0.01', '999999999.99');
  assert.ok(r.ok && r.text === '0.5');
});

test('date arithmetic: leap day and month end', () => {
  assert.equal(formatIso(plusMonths(date('2024-02-29'), 12)), '2025-02-28');
  assert.equal(formatIso(plusMonths(date('2024-01-31'), 1)), '2024-02-29');
  assert.equal(formatIso(plusMonths(date('2026-12-15'), 1)), '2027-01-15');
  assert.equal(parseIso('2026-02-29'), null);
  assert.equal(parseIso('2026-13-01'), null);
  assert.deepEqual(parseMdy('11/10/2026'), { year: 2026, month: 11, day: 10 });
  assert.equal(parseMdy('02/30/2026'), null);
  assert.equal(formatMdy(date('2026-11-10')), '11/10/2026');
});

test('money formatting', () => {
  assert.equal(formatMoney('GBP', '10000.00'), '£10,000.00');
  assert.equal(formatMoney('AUD', '1234567.5'), 'A$1,234,567.5');
  assert.equal(formatMoney('INR', '999.00'), '₹999.00');
});

test('engine matches an independent BigInt reference on many inputs', () => {
  // Cross-check monthly payment using exact rational arithmetic (BigInt), then HALF_UP.
  const cases: [string, string, number][] = [];
  const principals = ['0.01', '1', '99.99', '1000', '12345.67', '250000', '999999999.99'];
  const rates = ['0.0001', '0.5', '3.75', '6', '12.9999', '24', '100'];
  const terms = [1, 2, 7, 12, 36, 60, 120, 360];
  for (const p of principals) for (const r of rates) for (const n of terms) cases.push([p, r, n]);
  const toFrac = (s: string): [bigint, bigint] => {
    const [i, f = ''] = s.split('.');
    return [BigInt(i + f), 10n ** BigInt(f.length)];
  };
  let checked = 0;
  for (const [p, r, n] of cases) {
    const [pn, pd] = toFrac(p);
    const [rn, rd] = toFrac(r);
    // monthly rate = rn / (rd*1200)
    const mn = rn;
    const md = rd * 1200n;
    const powN = (md + mn) ** BigInt(n); // (1+r)^n numerator over md^n
    const powD = md ** BigInt(n);
    // M = P * r * pow / (pow - 1)
    const num = pn * mn * powN;
    const den = pd * md * (powN - powD);
    // HALF_UP to cents: floor((num*100*2 + den) / (2*den))
    const cents = (num * 200n + den) / (2n * den);
    const exact = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
    const got = calculateLoan(new D(p), new D(r), n, date('2026-01-01'));
    if (got.ok) {
      assert.equal(got.result.monthly, exact, `${p} ${r} ${n}`);
      checked++;
    }
  }
  assert.ok(checked > 300, `checked ${checked}`);
});
