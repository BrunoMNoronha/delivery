import type { OrderStatus } from '../types/order';
import { OrderRepository } from './OrderRepository';

type EndpointBuilder = (orderId: string) => string;

type RequestInitFactory = (status: OrderStatus) => RequestInit;

interface OrderCommand {
  execute(orderId: string): Promise<void>;
}

interface UpdateOrderStatusCommandOptions {
  buildEndpoint: EndpointBuilder;
  status: OrderStatus;
  requestInitFactory: RequestInitFactory;
}

class UpdateOrderStatusCommand implements OrderCommand {
  private readonly buildEndpoint: EndpointBuilder;

  private readonly status: OrderStatus;

  private readonly requestInitFactory: RequestInitFactory;

  public constructor(options: UpdateOrderStatusCommandOptions) {
    this.buildEndpoint = options.buildEndpoint;
    this.status = options.status;
    this.requestInitFactory = options.requestInitFactory;
  }

  public async execute(orderId: string): Promise<void> {
    const endpoint = this.buildEndpoint(orderId);
    const response = await fetch(endpoint, this.requestInitFactory(this.status));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Falha ao atualizar pedido ${orderId}: ${response.status} ${
          errorText || response.statusText
        }`.trim(),
      );
    }
  }
}

export interface OrderCommandServiceOptions {
  repository: OrderRepository;
  commandEndpoint?: string;
  requestInitFactory?: RequestInitFactory;
}

export class OrderCommandService {
  private readonly acceptCommand: OrderCommand;

  private readonly confirmCommand: OrderCommand;

  private readonly discardCommand: OrderCommand;

  public constructor(options: OrderCommandServiceOptions) {
    const baseEndpoint = this.resolveBaseEndpoint(options);
    const requestInitFactory =
      options.requestInitFactory ?? OrderCommandService.createDefaultRequestFactory();
    const endpointBuilder: EndpointBuilder = (orderId: string): string =>
      `${baseEndpoint}/${encodeURIComponent(orderId)}`;

    this.acceptCommand = new UpdateOrderStatusCommand({
      buildEndpoint: endpointBuilder,
      status: 'queued',
      requestInitFactory,
    });

    this.confirmCommand = new UpdateOrderStatusCommand({
      buildEndpoint: endpointBuilder,
      status: 'confirmed',
      requestInitFactory,
    });

    this.discardCommand = new UpdateOrderStatusCommand({
      buildEndpoint: endpointBuilder,
      status: 'failed',
      requestInitFactory,
    });
  }

  public async acceptOrder(orderId: string): Promise<void> {
    await this.acceptCommand.execute(orderId);
  }

  public async confirmOrder(orderId: string): Promise<void> {
    await this.confirmCommand.execute(orderId);
  }

  public async discardOrder(orderId: string): Promise<void> {
    await this.discardCommand.execute(orderId);
  }

  private resolveBaseEndpoint(options: OrderCommandServiceOptions): string {
    const rawEndpoint =
      options.commandEndpoint ??
      options.repository.getQueueEndpoint() ??
      options.repository.getEndpoint();

    return rawEndpoint.replace(/\/$/, '');
  }

  private static createDefaultRequestFactory(): RequestInitFactory {
    return (status: OrderStatus): RequestInit => ({
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
      cache: 'no-store',
    });
  }
}
