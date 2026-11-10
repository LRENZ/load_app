import type { LoanRecord, LoanType } from '../core/loan.ts';

/**
 * One-shot instructions for a calculator form when the user comes back to it:
 * "reset" (Start new calculation) or "load" (edit a saved history record).
 */
type Pending = { action: 'reset' } | { action: 'load'; record: LoanRecord };
const pending: Partial<Record<LoanType, Pending>> = {};

export const formBus = {
  post(type: LoanType, p: Pending) {
    pending[type] = p;
  },
  take(type: LoanType): Pending | undefined {
    const p = pending[type];
    delete pending[type];
    return p;
  },
};

export function newOperationId(): string {
  return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
