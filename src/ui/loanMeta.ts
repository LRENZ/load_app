import { router } from 'expo-router';
import type { LoanType } from '../core/loan.ts';
import type { IconName } from './components.tsx';
import { withFullScreenAd } from './ads.tsx';
import { C } from './theme.ts';

export const LOAN_META: Record<
  LoanType,
  { key: 'loan_personal' | 'loan_business' | 'loan_mortgage' | 'loan_auto'; icon: IconName; tint: { bg: string; fg: string } }
> = {
  personal: { key: 'loan_personal', icon: 'account-cash-outline', tint: C.tiles.personal },
  business: { key: 'loan_business', icon: 'briefcase-outline', tint: C.tiles.business },
  mortgage: { key: 'loan_mortgage', icon: 'home-city-outline', tint: C.tiles.mortgage },
  auto: { key: 'loan_auto', icon: 'car-outline', tint: C.tiles.auto },
};

export function calculatorPath(type: LoanType): string {
  return type === 'mortgage' ? '/mortgage' : `/loan/${type}`;
}

/** Home → calculator (secondary page entry opportunity, gated off in the reference config). */
export function openCalculator(type: LoanType) {
  withFullScreenAd('IV_ENTER_SECONDARY', 'home', () => router.push(calculatorPath(type) as never));
}
