import { D, money, round2, type Dec } from './decimal.ts';
import { formatIso, plusMonths, type LocalDate } from './localDate.ts';
import { parseDecimalField, parseIntegerField } from './numberInput.ts';
import { PRINCIPAL_MAX, PRINCIPAL_MIN, RATE_MAX, type LoanRecord } from './loan.ts';
import type { CurrencyCode } from './currency.ts';

export const MORTGAGE_TERM_MAX_YEARS = 30;

export interface MortgageInput {
  homePrice: Dec;
  downPayment: Dec;
  downPaymentPercent: Dec;
  rate: Dec;
  termYears: number;
  propertyTax: Dec;
  pmi: Dec;
  hoa: Dec;
  insurance: Dec;
}

export type MortgageFailure =
  | 'down_payment'
  | 'principal'
  | 'payment_too_small'
  | 'total_below_principal'
  | 'non_finite';

export interface MortgageResult {
  principal: string;
  principalInterest: string;
  propertyTax: string;
  pmi: string;
  hoa: string;
  insurance: string;
  monthlyTotal: string;
  /** Compatibility totals stored in history: monthlyTotal × months (includes ownership costs). */
  totalPayment: string;
  totalInterest: string;
}

/** round2(down × 100 / home) — the value the percentage field must equal. */
export function downPaymentPercentOf(home: Dec, down: Dec): Dec {
  return down.times(100).div(home).toDecimalPlaces(2, D.ROUND_HALF_UP);
}

export function downPaymentAmountOf(home: Dec, percent: Dec): Dec {
  return round2(home.times(percent).div(100));
}

/** Annual cost → monthly, rounded per cost before summing. */
export function monthlyCost(annual: Dec): Dec {
  return round2(annual.div(12));
}

export function calculateMortgage(
  m: MortgageInput,
): { ok: true; result: MortgageResult } | { ok: false; failure: MortgageFailure } {
  try {
    const pct = downPaymentPercentOf(m.homePrice, m.downPayment);
    if (!(m.downPayment.lt(m.homePrice) && m.downPaymentPercent.eq(pct))) {
      return { ok: false, failure: 'down_payment' };
    }
    const principal = round2(m.homePrice.minus(m.downPayment));
    if (principal.lt(PRINCIPAL_MIN) || principal.gt(PRINCIPAL_MAX)) {
      return { ok: false, failure: 'principal' };
    }
    const n = m.termYears * 12;
    const r = m.rate.div(1200);
    let pi: Dec;
    if (r.isZero()) {
      pi = round2(principal.div(n));
    } else {
      const pow = new D(1).plus(r).pow(n);
      pi = round2(principal.times(r).times(pow).div(pow.minus(1)));
    }
    if (pi.lt('0.01')) return { ok: false, failure: 'payment_too_small' };
    if (!r.isZero() && round2(pi.times(n)).lt(principal)) {
      return { ok: false, failure: 'total_below_principal' };
    }
    const tax = monthlyCost(m.propertyTax);
    const pmi = monthlyCost(m.pmi);
    const hoa = monthlyCost(m.hoa);
    const ins = monthlyCost(m.insurance);
    const monthlyTotal = round2(pi.plus(tax).plus(pmi).plus(hoa).plus(ins));
    if (!monthlyTotal.isFinite()) return { ok: false, failure: 'non_finite' };
    const totalPayment = round2(monthlyTotal.times(n));
    return {
      ok: true,
      result: {
        principal: money(principal),
        principalInterest: money(pi),
        propertyTax: money(tax),
        pmi: money(pmi),
        hoa: money(hoa),
        insurance: money(ins),
        monthlyTotal: money(monthlyTotal),
        totalPayment: money(totalPayment),
        totalInterest: money(round2(totalPayment.minus(principal))),
      },
    };
  } catch {
    return { ok: false, failure: 'non_finite' };
  }
}

export interface MortgageFormInput {
  homePrice: string;
  downPayment: string;
  downPaymentPercent: string;
  rate: string;
  term: string;
  propertyTax: string;
  pmi: string;
  hoa: string;
  insurance: string;
}

export type MortgageFormError =
  | 'home_price_required'
  | 'home_price_invalid'
  | 'home_price_constraints'
  | 'down_payment_required'
  | 'down_payment_invalid'
  | 'down_payment_constraints'
  | 'down_payment_percent_required'
  | 'down_payment_percent_invalid'
  | 'down_payment_percent_constraints'
  | 'down_payment_relation'
  | 'rate_required'
  | 'rate_invalid'
  | 'rate_constraints'
  | 'term_required'
  | 'term_constraints'
  | 'cost_required'
  | 'cost_invalid'
  | 'cost_constraints';

type FormResult =
  | { ok: true; value: MortgageInput }
  | { ok: false; error: MortgageFormError; field: keyof MortgageFormInput };

function err(error: MortgageFormError, field: keyof MortgageFormInput): FormResult {
  return { ok: false, error, field };
}

export function validateMortgageForm(f: MortgageFormInput): FormResult {
  const home = parseDecimalField(f.homePrice, 2, PRINCIPAL_MIN, PRINCIPAL_MAX);
  if (!home.ok) {
    return err(
      home.error === 'empty' ? 'home_price_required' : home.error === 'invalid' ? 'home_price_invalid' : 'home_price_constraints',
      'homePrice',
    );
  }
  const down = parseDecimalField(f.downPayment, 2, '0', PRINCIPAL_MAX);
  if (!down.ok) {
    return err(
      down.error === 'empty' ? 'down_payment_required' : down.error === 'invalid' ? 'down_payment_invalid' : 'down_payment_constraints',
      'downPayment',
    );
  }
  if (!down.value.lt(home.value)) return err('down_payment_constraints', 'downPayment');
  const pct = parseDecimalField(f.downPaymentPercent, 2, '0', '100');
  if (!pct.ok) {
    return err(
      pct.error === 'empty'
        ? 'down_payment_percent_required'
        : pct.error === 'invalid'
          ? 'down_payment_percent_invalid'
          : 'down_payment_percent_constraints',
      'downPaymentPercent',
    );
  }
  if (!downPaymentPercentOf(home.value, down.value).eq(pct.value)) {
    return err('down_payment_relation', 'downPaymentPercent');
  }
  const rate = parseDecimalField(f.rate, 4, '0', RATE_MAX);
  if (!rate.ok) {
    return err(rate.error === 'empty' ? 'rate_required' : rate.error === 'invalid' ? 'rate_invalid' : 'rate_constraints', 'rate');
  }
  const term = parseIntegerField(f.term, 1, MORTGAGE_TERM_MAX_YEARS);
  if (!term.ok) return err(term.error === 'empty' ? 'term_required' : 'term_constraints', 'term');
  const costs = {} as Record<'propertyTax' | 'pmi' | 'hoa' | 'insurance', Dec>;
  for (const key of ['propertyTax', 'pmi', 'hoa', 'insurance'] as const) {
    const c = parseDecimalField(f[key], 2, '0', PRINCIPAL_MAX);
    if (!c.ok) {
      return err(c.error === 'empty' ? 'cost_required' : c.error === 'invalid' ? 'cost_invalid' : 'cost_constraints', key);
    }
    costs[key] = c.value;
  }
  return {
    ok: true,
    value: {
      homePrice: home.value,
      downPayment: down.value,
      downPaymentPercent: pct.value,
      rate: rate.value,
      termYears: term.value,
      ...costs,
    },
  };
}

export function mortgageRecord(
  currency: CurrencyCode,
  m: MortgageInput,
  r: MortgageResult,
  start: LocalDate,
  operationId: string,
  createdAt: number,
): LoanRecord {
  return {
    operationId,
    type: 'mortgage',
    currency,
    principal: r.principal,
    annualRate: m.rate.toString(),
    termValue: m.termYears,
    termUnit: 'years',
    termMonths: m.termYears * 12,
    startDate: formatIso(start),
    monthlyPayment: r.monthlyTotal,
    totalPayment: r.totalPayment,
    totalInterest: r.totalInterest,
    payoffDate: formatIso(plusMonths(start, m.termYears * 12)),
    homePrice: m.homePrice.toFixed(2),
    downPayment: m.downPayment.toFixed(2),
    downPaymentPercent: m.downPaymentPercent.toFixed(2),
    propertyTax: m.propertyTax.toFixed(2),
    pmi: m.pmi.toFixed(2),
    hoa: m.hoa.toFixed(2),
    insurance: m.insurance.toFixed(2),
    principalInterest: r.principalInterest,
    createdAt,
  };
}
