import type { PaidRevenue } from './types.ts';

/** Exact micros → decimal string conversion (no floating point): "1234567" → "1.234567". */
export function microsToDecimal(micros: string): string {
  if (!/^-?\d+$/.test(micros)) throw new Error(`invalid micros ${micros}`);
  const neg = micros.startsWith('-');
  const digits = (neg ? micros.slice(1) : micros).padStart(7, '0');
  const int = digits.slice(0, -6).replace(/^0+(?=\d)/, '');
  const frac = digits.slice(-6);
  return `${neg ? '-' : ''}${int}.${frac}`;
}

/** Decimal string → integer micros string, half-up at the 6th decimal. */
export function decimalToMicros(value: string): string {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!m) throw new Error(`invalid decimal ${value}`);
  const frac = (m[3] ?? '').padEnd(7, '0');
  let n = BigInt(m[2] + frac.slice(0, 6));
  if (Number(frac[6]) >= 5) n += 1n;
  return (m[1] === '-' && n !== 0n ? '-' : '') + n.toString();
}

export interface LedgerEntry {
  revenue: PaidRevenue;
  recordedAt: number;
  transport: { attempts: number; sent: boolean; lastError?: string };
}

/**
 * Local revenue ledger. One record per impression (duplicate provider
 * callbacks are ignored); transport retries update the same entry and never
 * count as new revenue.
 */
export class RevenueLedger {
  private entries = new Map<string, LedgerEntry>();
  private duplicates = 0;

  record(r: PaidRevenue, now: number): 'recorded' | 'duplicate' {
    if (!/^-?\d+$/.test(r.valueMicros)) throw new Error('valueMicros must be an integer string');
    const key = `${r.provider}:${r.impressionId}`;
    if (this.entries.has(key)) {
      this.duplicates += 1;
      return 'duplicate';
    }
    this.entries.set(key, { revenue: { ...r }, recordedAt: now, transport: { attempts: 0, sent: false } });
    return 'recorded';
  }

  /** Simulated transport: send pending entries through `send`; failures stay pending. */
  async flush(send: (r: PaidRevenue) => Promise<void>): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    for (const e of this.entries.values()) {
      if (e.transport.sent) continue;
      e.transport.attempts += 1;
      try {
        await send(e.revenue);
        e.transport.sent = true;
        sent += 1;
      } catch (err) {
        e.transport.lastError = String(err);
        failed += 1;
      }
    }
    return { sent, failed };
  }

  list(): LedgerEntry[] {
    return [...this.entries.values()];
  }

  duplicateCount(): number {
    return this.duplicates;
  }

  /** Sum per currency in micros; test records only when includeTest. */
  totals(includeTest: boolean): Record<string, string> {
    const out: Record<string, bigint> = {};
    for (const { revenue } of this.entries.values()) {
      if (revenue.isTest && !includeTest) continue;
      out[revenue.currency] = (out[revenue.currency] ?? 0n) + BigInt(revenue.valueMicros);
    }
    return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, microsToDecimal(v.toString())]));
  }

  clear() {
    this.entries.clear();
    this.duplicates = 0;
  }
}
