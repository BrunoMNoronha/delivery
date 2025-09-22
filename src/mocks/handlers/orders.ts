import { http, HttpResponse, type HttpHandler } from 'msw';
import type { OrderRequest, OrderResponse } from '../../types/order';

type PendingOrderStatus = Extract<OrderResponse['status'], 'pending' | 'queued'>;

const pendingStatusFilter: readonly PendingOrderStatus[] = ['pending', 'queued'];

const filterByStatuses = (
  orders: OrderResponse[],
  statuses: readonly PendingOrderStatus[],
): OrderResponse[] => {
  const statusSet = new Set<OrderResponse['status']>(statuses);
  return orders.filter((order) => statusSet.has(order.status));
};

const cloneOrder = (order: OrderResponse): OrderResponse =>
  typeof structuredClone === 'function'
    ? structuredClone(order)
    : (JSON.parse(JSON.stringify(order)) as OrderResponse);

const orderRepository = (() => {
  const orders: OrderResponse[] = [];

  return {
    add(order: OrderResponse): void {
      orders.push(cloneOrder(order));
    },
    list(request: Request): OrderResponse[] {
      const url = new URL(request.url);
      const statusParam = url.searchParams.get('status');
      const snapshot = orders.map((order) => cloneOrder(order));

      if (!statusParam) {
        return snapshot;
      }

      return filterByStatuses(snapshot, pendingStatusFilter);
    },
  };
})();

const generateOrderId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const randomSuffix = Math.random().toString(36).slice(2);
  return `mock-order-${randomSuffix}-${Date.now()}`;
};

const cloneMetadata = (
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!metadata) {
    return undefined;
  }

  return { ...metadata };
};

const buildOrderResponse = (orderRequest: OrderRequest): OrderResponse => {
  const createdAt = new Date().toISOString();

  return {
    id: generateOrderId(),
    status: orderRequest.status ?? 'pending',
    customer: { ...orderRequest.customer },
    items: orderRequest.items.map((item) => ({ ...item })),
    totals: { ...orderRequest.totals },
    address: { ...orderRequest.address },
    createdAt,
    metadata: cloneMetadata(orderRequest.metadata),
  };
};

export const orderHandlers: HttpHandler[] = [
  http.post('/api/orders', async ({ request }) => {
    const orderRequest = (await request.json()) as OrderRequest;
    const responseBody = buildOrderResponse(orderRequest);

    orderRepository.add(responseBody);

    return HttpResponse.json(responseBody, { status: 201 });
  }),
  http.get('/api/orders', ({ request }) => {
    const responseBody = orderRepository.list(request);

    return HttpResponse.json(responseBody, { status: 200 });
  }),
];
