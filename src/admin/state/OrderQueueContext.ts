import { createContext } from 'react';
import type { CashFlowSnapshot } from '../../types/cash';
import type { OrderResponse } from '../../types/order';

export interface OrderQueueContextValue {
  orders: OrderResponse[];
  selectedOrder: OrderResponse | null;
  selectedOrderId: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  processingOrderId: string | null;
  error: string | null;
  cashSummary: CashFlowSnapshot | null;
  cashSummaryError: string | null;
  isCashSummaryLoading: boolean;
  refresh(): Promise<void>;
  selectOrder(orderId: string | null): void;
  accept(orderId: string): Promise<void>;
  confirmPayment(orderId: string): Promise<void>;
  discard(orderId: string): Promise<void>;
}

export const OrderQueueContext = createContext<OrderQueueContextValue | null>(null);
