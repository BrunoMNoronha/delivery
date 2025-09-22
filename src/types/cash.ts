export type PaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'pix'
  | 'voucher'
  | 'bank_transfer'
  | 'digital_wallet'
  | 'other';

export interface CashEntry {
  id: string;
  orderId: string;
  operation: 'inflow' | 'outflow';
  amount: number;
  paymentMethod: PaymentMethod;
  recordedAt: string;
  effectiveAt: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CashFlowSnapshot {
  date: string;
  totalInflow: number;
  totalOutflow: number;
  netChange: number;
  balance: number;
  lastEntryId?: string;
  lastEntryAt?: string;
  breakdownByMethod?: Partial<Record<PaymentMethod, number>>;
}

export interface CashFlowSummaryQuery {
  date?: string;
  startDate?: string;
  endDate?: string;
}
