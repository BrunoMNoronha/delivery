import type { CartLine, CartSelection, CartTotals } from './menu';

export type OrderStatus = 'pending' | 'queued' | 'confirmed' | 'failed';

export interface OrderCustomer {
  name: string;
  phone: string;
  notes?: string;
}

export interface OrderAddress {
  label: string;
  latitude?: number;
  longitude?: number;
  complement?: string;
}

export interface OrderItem {
  lineId: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selection: CartSelection;
}

export interface OrderRequest {
  customer: OrderCustomer;
  items: OrderItem[];
  totals: CartTotals;
  address: OrderAddress;
  status: OrderStatus;
  metadata?: Record<string, unknown>;
}

export interface OrderResponse {
  id: string;
  status: OrderStatus;
  customer: OrderCustomer;
  items: OrderItem[];
  totals: CartTotals;
  address: OrderAddress;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export const mapCartLineToOrderItem = (line: CartLine): OrderItem => ({
  lineId: line.key,
  productId: line.product.id,
  name: line.product.name,
  quantity: line.quantity,
  unitPrice: line.unitPrice,
  totalPrice: line.unitPrice * line.quantity,
  selection: line.selection,
});
