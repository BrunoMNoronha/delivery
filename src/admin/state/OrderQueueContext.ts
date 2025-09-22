import { createContext } from 'react';
import type { OrderResponse } from '../../types/order';

export interface OrderQueueContextValue {
  orders: OrderResponse[];
  selectedOrder: OrderResponse | null;
  selectedOrderId: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  processingOrderId: string | null;
  error: string | null;
  refresh(): Promise<void>;
  selectOrder(orderId: string | null): void;
  accept(orderId: string): Promise<void>;
  discard(orderId: string): Promise<void>;
}

export const OrderQueueContext = createContext<OrderQueueContextValue | null>(null);
