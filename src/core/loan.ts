import { D, money, round2, type Dec } from './decimal.ts';
import {
  formatIso,
  inSupportedRange,
  plusMonths,
  type LocalDate,
} from './localDate.ts';
import { parseDecimalField, parseIntegerField } from './numberInput.ts';
import type { CurrencyCode } from './currency.ts';

export type LoanType = 'personal' | 'business' | 'auto' | 'mortgage';
export type OrdinaryLoanType = Exclude<LoanType, 'mortgage'>;
export type TermUnit = 'months' | 'years';

export const PRINCIPAL_MIN = '0.01';
export const PRINCIPAL_MAX = '999999999.99';
export const RATE_MAX = '100';
export const DOMAIN_TERM_MAX_MONTHS = 1200;
/** Form-level term limits (calculator_error_term_constraints_months / _years). */
export const FORM_TERM_MAX_MONTHS = 360;
export const FORM_TERM_MAX_YEARS = 30;

export type LoanFailure = 'payment_too_small' | 'total_below_principal';

export interface LoanResult {
  monthly: string;
  total: string;
  interest: string;
  payoff: LocalDate;
}

const RATE_DIVISOR = new D('1200');
const MIN_PAYMENT = new D('0.01');

/**
 * Ordinary loan engine (personal, business, auto). Operation order and rounding
 * follow the reference: monthly rounded first, total = rounded monthly × n.
 */
export function calculateLoan(
  principal: Dec,
  annualRatePercent: Dec,
  termMonths: number,
  start: LocalDate,
): { ok: true; result: LoanResult } | { ok: false; failure: LoanFailure } {
  if (principal.lt(PRINCIPAL_MIN) || principal.gt(PRINCIPAL_MAX)) {
    throw new RangeError('principal out of domain');
  }
  if (annualRatePercent.lt(0) || annualRatePercent.gt(RATE_MAX)) {
    throw new RangeError('rate out of domain');
  }
  if (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > DOMAIN_TERM_MAX_MONTHS) {
    throw new RangeError('term out of domain');
  }
  const zero = annualRatePercent.isZero();
  let monthly: Dec;
  if (zero) {
    monthly = round2(principal.div(termMonths));
  } else {
    const r = annualRatePercent.div(RATE_DIVISOR);
    const pow = new D(1).plus(r).pow(termMonths);
    monthly = round2(principal.times(r).times(pow).div(pow.minus(1)));
  }
  if (monthly.lt(MIN_PAYMENT)) return { ok: false, failure: 'payment_too_small' };
  const total = zero ? round2(principal) : round2(monthly.times(termMonths));
  if (!zero && total.lt(principal)) return { ok: false, failure: 'total_below_principal' };
  const interest = zero ? new D('0.00') : round2(total.minus(principal));
  return {
    ok: true,
    result: {
      monthly: money(monthly),
      total: money(total),
      interest: money(interest),
      payoff: plusMonths(start, termMonths),
    },
  };
}

export interface LoanFormInput {
  amount: string;
  rate: string;
  term: string;
  termUnit: TermUnit;
  startDate: LocalDate | null;
}

export type LoanFormError =
  | 'amount_required'
  | 'amount_invalid'
  | 'amount_constraints'
  | 'rate_required'
  | 'rate_constraints'
  | 'term_required'
  | 'term_constraints_months'
  | 'term_constraints_years'
  | 'date_required'
  | 'date_out_of_range';

export interface ValidLoanInput {
  principal: Dec;
  principalText: string;
  rate: Dec;
  rateText: string;
  termValue: number;
  termUnit: TermUnit;
  termMonths: number;
  startDate: LocalDate;
}

/** Validates in field order; the first error is shown to the user. */
export function validateLoanForm(
  f: LoanFormInput,
): { ok: true; value: ValidLoanInput } | { ok: false; error: LoanFormError; field: keyof LoanFormInput } {
  const amount = parseDecimalField(f.amount, 2, PRINCIPAL_MIN, PRINCIPAL_MAX);
  if (!amount.ok) {
    const error =
      amount.error === 'empty' ? 'amount_required' : amount.error === 'invalid' ? 'amount_invalid' : 'amount_constraints';
    return { ok: false, error, field: 'amount' };
  }
  const rate = parseDecimalField(f.rate, 4, '0', RATE_MAX);
  if (!rate.ok) {
    return { ok: false, error: rate.error === 'empty' ? 'rate_required' : 'rate_constraints', field: 'rate' };
  }
  const max = f.termUnit === 'years' ? FORM_TERM_MAX_YEARS : FORM_TERM_MAX_MONTHS;
  const term = parseIntegerField(f.term, 1, max);
  if (!term.ok) {
    const error =
      term.error === 'empty'
        ? 'term_required'
        : f.termUnit === 'years'
          ? 'term_constraints_years'
          : 'term_constraints_months';
    return { ok: false, error, field: 'term' };
  }
  if (!f.startDate) return { ok: false, error: 'date_required', field: 'startDate' };
  if (!inSupportedRange(f.startDate)) return { ok: false, error: 'date_out_of_range', field: 'startDate' };
  return {
    ok: true,
    value: {
      principal: amount.value,
      principalText: amount.text,
      rate: rate.value,
      rateText: rate.text,
      termValue: term.value,
      termUnit: f.termUnit,
      termMonths: f.termUnit === 'years' ? term.value * 12 : term.value,
      startDate: f.startDate,
    },
  };
}

/** Record persisted to history for every successful calculation. */
export interface LoanRecord {
  id?: number;
  operationId: string;
  type: LoanType;
  currency: CurrencyCode;
  principal: string;
  annualRate: string;
  termValue: number;
  termUnit: TermUnit;
  termMonths: number;
  startDate: string;
  monthlyPayment: string;
  totalPayment: string;
  totalInterest: string;
  payoffDate: string;
  // Mortgage-only components (null for ordinary loans).
  homePrice: string | null;
  downPayment: string | null;
  downPaymentPercent: string | null;
  propertyTax: string | null;
  pmi: string | null;
  hoa: string | null;
  insurance: string | null;
  principalInterest: string | null;
  createdAt: number;
}

export function ordinaryRecord(
  type: OrdinaryLoanType,
  currency: CurrencyCode,
  v: ValidLoanInput,
  r: LoanResult,
  operationId: string,
  createdAt: number,
): LoanRecord {
  return {
    operationId,
    type,
    currency,
    principal: v.principal.toFixed(2),
    annualRate: v.rateText,
    termValue: v.termValue,
    termUnit: v.termUnit,
    termMonths: v.termMonths,
    startDate: formatIso(v.startDate),
    monthlyPayment: r.monthly,
    totalPayment: r.total,
    totalInterest: r.interest,
    payoffDate: formatIso(r.payoff),
    homePrice: null,
    downPayment: null,
    downPaymentPercent: null,
    propertyTax: null,
    pmi: null,
    hoa: null,
    insurance: null,
    principalInterest: null,
    createdAt,
  };
}
