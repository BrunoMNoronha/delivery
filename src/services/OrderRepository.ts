import type { OrderRequest, OrderResponse } from '../types/order';

export interface OrderRepositoryOptions {
  endpoint?: string;
  queueEndpoint?: string | null;
}

const DEFAULT_ENDPOINT: string =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ORDERS_ENDPOINT
    ? import.meta.env.VITE_ORDERS_ENDPOINT
    : '/api/orders';

const DEFAULT_QUEUE_ENDPOINT: string | undefined =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ORDERS_QUEUE_ENDPOINT
    ? import.meta.env.VITE_ORDERS_QUEUE_ENDPOINT
    : undefined;

export class OrderRepository {
  private readonly endpoint: string;

  private readonly queueEndpoint?: string;

  public constructor(options: OrderRepositoryOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.queueEndpoint = options.queueEndpoint ?? DEFAULT_QUEUE_ENDPOINT ?? undefined;
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public getQueueEndpoint(): string | undefined {
    return this.queueEndpoint;
  }

  public async create(order: OrderRequest): Promise<OrderResponse> {
    if (this.queueEndpoint) {
      return this.enqueue(order);
    }

    return this.persist(order);
  }

  public async listPending(): Promise<OrderResponse[]> {
    const targetUrl = this.queueEndpoint ?? `${this.endpoint}?status=pending`;
    const response = await fetch(targetUrl, { method: 'GET' });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Falha ao carregar fila de pedidos: ${response.status} ${errorText || response.statusText}`.trim(),
      );
    }

    const parsed = await this.tryParseJson<OrderResponse[]>(response);
    const orders = Array.isArray(parsed) ? parsed : [];

    return orders
      .filter((order) => order.status === 'pending' || order.status === 'queued')
      .sort((first, second) => this.compareByDate(first.createdAt, second.createdAt));
  }

  private async persist(order: OrderRequest): Promise<OrderResponse> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Falha ao registrar pedido: ${response.status} ${errorText || response.statusText}`.trim(),
      );
    }

    const parsed = await this.tryParseJson<OrderResponse>(response);
    return parsed ?? this.createFallbackResponse(order);
  }

  private async enqueue(order: OrderRequest): Promise<OrderResponse> {
    if (!this.queueEndpoint) {
      return this.persist(order);
    }

    const response = await fetch(this.queueEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Falha ao enfileirar pedido: ${response.status} ${errorText || response.statusText}`.trim(),
      );
    }

    const parsed = await this.tryParseJson<OrderResponse>(response);
    return parsed ?? this.createFallbackResponse(order, { status: 'queued' });
  }

  private async tryParseJson<T>(response: Response): Promise<T | null> {
    try {
      return (await response.clone().json()) as T;
    } catch (error) {
      console.warn('Resposta sem JSON estruturado para pedido.', error);
      return null;
    }
  }

  private createFallbackResponse(
    order: OrderRequest,
    overrides: Partial<OrderResponse> = {},
  ): OrderResponse {
    const generatedId = `temp-${Date.now()}`;

    return {
      id: overrides.id ?? generatedId,
      status: overrides.status ?? order.status,
      customer: overrides.customer ?? order.customer,
      items: overrides.items ?? order.items,
      totals: overrides.totals ?? order.totals,
      address: overrides.address ?? order.address,
      createdAt: overrides.createdAt ?? new Date().toISOString(),
      metadata: overrides.metadata ?? order.metadata,
    };
  }

  private compareByDate(first: string, second: string): number {
    return this.parseDate(first) - this.parseDate(second);
  }

  private parseDate(value: string): number {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
