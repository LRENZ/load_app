import { D } from './decimal.ts';

export interface RepaymentSplit {
  /** Principal share of the total repayment, one decimal ("96.8"). */
  principalPct: string;
  /** Interest share; always 100.0 − principalPct, so the two add up exactly. */
  interestPct: string;
  /** 0–1 fraction for drawing the bar. */
  principalFraction: number;
}

/**
 * Principal vs interest share of what is repaid in total. Uses the stored decimal strings
 * (no floating point in the percentages). A zero / missing total gives 100 / 0.
 */
export function repaymentSplit(principal: string | null | undefined, total: string | null | undefined): RepaymentSplit {
  try {
    const p = new D(principal ?? '0');
    const tot = new D(total ?? '0');
    if (!tot.isFinite() || tot.lte(0) || p.lt(0)) return { principalPct: '100.0', interestPct: '0.0', principalFraction: 1 };
    let pct = p.div(tot).mul(100).toDecimalPlaces(1);
    if (pct.gt(100)) pct = new D(100);
    return {
      principalPct: pct.toFixed(1),
      interestPct: new D(100).minus(pct).toFixed(1),
      principalFraction: Math.min(1, Math.max(0, pct.div(100).toNumber())),
    };
  } catch {
    return { principalPct: '100.0', interestPct: '0.0', principalFraction: 1 };
  }
}
