import { http, HttpResponse, type HttpHandler } from 'msw';
import type { OrderRequest, OrderResponse } from '../../types/order';

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

    return HttpResponse.json(responseBody, { status: 201 });
  }),
];
