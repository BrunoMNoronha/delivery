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

  private readonly endpointBuilder: EndpointBuilder;

  private readonly requestInitFactory: RequestInitFactory;

  public constructor(options: OrderCommandServiceOptions) {
    const baseEndpoint = this.resolveBaseEndpoint(options);
    this.requestInitFactory =
      options.requestInitFactory ?? OrderCommandService.createDefaultRequestFactory();
    this.endpointBuilder = (orderId: string): string => `${baseEndpoint}/${encodeURIComponent(orderId)}`;

    this.acceptCommand = this.createUpdateStatusCommand('queued');
    this.confirmCommand = this.createUpdateStatusCommand('confirmed');
    this.discardCommand = this.createUpdateStatusCommand('failed');
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

  public async restoreOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const command = this.resolveCommandForStatus(status);
    await command.execute(orderId);
  }

  private resolveBaseEndpoint(options: OrderCommandServiceOptions): string {
    const rawEndpoint =
      options.commandEndpoint ??
      options.repository.getQueueEndpoint() ??
      options.repository.getEndpoint();

    return rawEndpoint.replace(/\/$/, '');
  }

  private createUpdateStatusCommand(status: OrderStatus): OrderCommand {
    return new UpdateOrderStatusCommand({
      buildEndpoint: this.endpointBuilder,
      status,
      requestInitFactory: this.requestInitFactory,
    });
  }

  private resolveCommandForStatus(status: OrderStatus): OrderCommand {
    switch (status) {
      case 'queued':
        return this.acceptCommand;
      case 'confirmed':
        return this.confirmCommand;
      case 'failed':
        return this.discardCommand;
      default:
        return this.createUpdateStatusCommand(status);
    }
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
