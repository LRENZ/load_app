import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import type { LoanRecord } from '../core/loan.ts';

/**
 * Local loan history (SQLite). Money and rates are TEXT, ids and timestamps
 * INTEGER. operation_id is UNIQUE so a repeated callback cannot insert twice.
 */
const SCHEMA_VERSION = 1;

let db: SQLiteDatabase | null = null;
const listeners = new Set<() => void>();

function open(): SQLiteDatabase {
  if (db) return db;
  db = openDatabaseSync('loan_history.db');
  migrate(db);
  return db;
}

function migrate(d: SQLiteDatabase) {
  const row = d.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const v = row?.user_version ?? 0;
  if (v < 1) {
    d.withTransactionSync(() => {
      d.execSync(`
        CREATE TABLE IF NOT EXISTS loan_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation_id TEXT NOT NULL UNIQUE,
          loan_type TEXT NOT NULL,
          currency TEXT NOT NULL,
          principal TEXT NOT NULL,
          annual_rate TEXT NOT NULL,
          term_value INTEGER NOT NULL,
          term_unit TEXT NOT NULL,
          term_months INTEGER NOT NULL,
          start_date TEXT NOT NULL,
          monthly_payment TEXT NOT NULL,
          total_payment TEXT NOT NULL,
          total_interest TEXT NOT NULL,
          payoff_date TEXT NOT NULL,
          home_price TEXT,
          down_payment TEXT,
          down_payment_percent TEXT,
          property_tax TEXT,
          pmi TEXT,
          hoa TEXT,
          insurance TEXT,
          principal_interest TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_loan_history_order ON loan_history (created_at DESC, id DESC);
      `);
      d.execSync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
  }
}

interface Row {
  id: number;
  operation_id: string;
  loan_type: string;
  currency: string;
  principal: string;
  annual_rate: string;
  term_value: number;
  term_unit: string;
  term_months: number;
  start_date: string;
  monthly_payment: string;
  total_payment: string;
  total_interest: string;
  payoff_date: string;
  home_price: string | null;
  down_payment: string | null;
  down_payment_percent: string | null;
  property_tax: string | null;
  pmi: string | null;
  hoa: string | null;
  insurance: string | null;
  principal_interest: string | null;
  created_at: number;
}

function toRecord(r: Row): LoanRecord {
  return {
    id: r.id,
    operationId: r.operation_id,
    type: r.loan_type as LoanRecord['type'],
    currency: r.currency as LoanRecord['currency'],
    principal: r.principal,
    annualRate: r.annual_rate,
    termValue: r.term_value,
    termUnit: r.term_unit as LoanRecord['termUnit'],
    termMonths: r.term_months,
    startDate: r.start_date,
    monthlyPayment: r.monthly_payment,
    totalPayment: r.total_payment,
    totalInterest: r.total_interest,
    payoffDate: r.payoff_date,
    homePrice: r.home_price,
    downPayment: r.down_payment,
    downPaymentPercent: r.down_payment_percent,
    propertyTax: r.property_tax,
    pmi: r.pmi,
    hoa: r.hoa,
    insurance: r.insurance,
    principalInterest: r.principal_interest,
    createdAt: r.created_at,
  };
}

export const history = {
  /** Inserts once per operation id; returns the stored row id. */
  save(rec: LoanRecord): number {
    const d = open();
    let id = 0;
    d.withTransactionSync(() => {
      d.runSync(
        `INSERT OR IGNORE INTO loan_history (operation_id, loan_type, currency, principal, annual_rate, term_value, term_unit,
          term_months, start_date, monthly_payment, total_payment, total_interest, payoff_date, home_price, down_payment,
          down_payment_percent, property_tax, pmi, hoa, insurance, principal_interest, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          rec.operationId, rec.type, rec.currency, rec.principal, rec.annualRate, rec.termValue, rec.termUnit,
          rec.termMonths, rec.startDate, rec.monthlyPayment, rec.totalPayment, rec.totalInterest, rec.payoffDate,
          rec.homePrice, rec.downPayment, rec.downPaymentPercent, rec.propertyTax, rec.pmi, rec.hoa, rec.insurance,
          rec.principalInterest, rec.createdAt,
        ],
      );
      id = d.getFirstSync<{ id: number }>('SELECT id FROM loan_history WHERE operation_id = ?', [rec.operationId])?.id ?? 0;
    });
    listeners.forEach((f) => f());
    return id;
  },
  list(limit = 200): LoanRecord[] {
    return open()
      .getAllSync<Row>('SELECT * FROM loan_history ORDER BY created_at DESC, id DESC LIMIT ?', [limit])
      .map(toRecord);
  },
  get(id: number): LoanRecord | null {
    const r = open().getFirstSync<Row>('SELECT * FROM loan_history WHERE id = ?', [id]);
    return r ? toRecord(r) : null;
  },
  remove(id: number) {
    open().runSync('DELETE FROM loan_history WHERE id = ?', [id]);
    listeners.forEach((f) => f());
  },
  count(): number {
    return open().getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM loan_history')?.n ?? 0;
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
