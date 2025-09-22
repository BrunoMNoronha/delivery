import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse, type HttpHandler } from 'msw';
import { useEffect, type FC } from 'react';
import { OrderRepository } from '../services/OrderRepository';
import { OrderCommandService } from '../services/OrderCommandService';
import { OrderQueueProvider } from '../admin/state/OrderQueueProvider';
import { useOrderQueue } from '../admin/state/useOrderQueue';
import OrderDetails from '../admin/components/OrderDetails';
import type { OrderResponse, OrderStatus } from '../types/order';
import type {
  CashFlowUnitOfWork,
  CashFlowUnitOfWorkFactory,
  CashEntryRepository,
  CashFlowReadRepository,
} from '../services/CashFlowService';
import { CashFlowService } from '../services/CashFlowService';
import type { CashEntry, CashFlowSnapshot, PaymentMethod } from '../types/cash';

type PatchCall = {
  orderId: string;
  status: OrderStatus;
};

type UpdateStatusPayload = {
  status: OrderStatus;
};

const server = setupServer();

let currentOrder: OrderResponse;
let pendingOrders: OrderResponse[];
let patchCalls: PatchCall[];
let patchResponses: OrderResponse[];

const createMockOrder = (overrides: Partial<OrderResponse> = {}): OrderResponse => ({
  id: 'order-123',
  status: 'pending',
  customer: {
    name: 'Maria Oliveira',
    phone: '+55 11 91234-5678',
    notes: 'Sem cebola',
  },
  items: [
    {
      lineId: 'line-1',
      productId: 'pz1',
      name: 'Pizza Margherita',
      quantity: 1,
      unitPrice: 39.9,
      totalPrice: 39.9,
      selection: {
        size: 'M',
        crust: 'classic',
      },
    },
  ],
  totals: {
    total: 39.9,
    count: 1,
  },
  address: {
    label: 'Rua das Flores, 123',
    complement: 'Apto 45',
  },
  createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
  metadata: {
    channel: 'admin',
  },
  ...overrides,
});

const createHandlers = (): HttpHandler[] => {
  const listOrdersHandler: HttpHandler = http.get('/api/orders', (): Response => {
    return HttpResponse.json(pendingOrders, { status: 200 });
  });

  const updateStatusHandler: HttpHandler = http.patch(
    '/api/orders/:orderId',
    async ({ params, request }): Promise<Response> => {
      const { orderId } = params as { orderId: string };
      const body = (await request.json()) as UpdateStatusPayload;
      const existing = pendingOrders.find((order) => order.id === orderId) ?? currentOrder;
      const updated: OrderResponse = { ...existing, status: body.status };

      patchCalls.push({ orderId, status: body.status });
      patchResponses.push(updated);
      pendingOrders = pendingOrders.filter((order) => order.id !== orderId);

      return HttpResponse.json(updated, { status: 200 });
    },
  );

  return [listOrdersHandler, updateStatusHandler];
};

const createSnapshotFromEntries = (entries: CashEntry[]): CashFlowSnapshot | null => {
  if (entries.length === 0) {
    return null;
  }

  const totals = entries.reduce(
    (accumulator: { inflow: number; outflow: number }, entry: CashEntry) => {
      if (entry.operation === 'inflow') {
        return { inflow: accumulator.inflow + entry.amount, outflow: accumulator.outflow };
      }
      return { inflow: accumulator.inflow, outflow: accumulator.outflow + entry.amount };
    },
    { inflow: 0, outflow: 0 },
  );

  const breakdown = entries.reduce<Partial<Record<PaymentMethod, number>>>(
    (accumulator, entry) => {
      const currentValue = accumulator[entry.paymentMethod] ?? 0;
      const delta = entry.operation === 'inflow' ? entry.amount : -entry.amount;
      return {
        ...accumulator,
        [entry.paymentMethod]: currentValue + delta,
      };
    },
    {},
  );

  const lastEntry = entries.at(-1);
  if (!lastEntry) {
    return null;
  }

  const balance = totals.inflow - totals.outflow;

  return {
    date: lastEntry.effectiveAt.slice(0, 10),
    totalInflow: totals.inflow,
    totalOutflow: totals.outflow,
    netChange: balance,
    balance,
    lastEntryId: lastEntry.id,
    lastEntryAt: lastEntry.recordedAt,
    breakdownByMethod: breakdown,
  };
};

const createInMemoryCashFlowService = (): CashFlowService => {
  const recordedEntries: CashEntry[] = [];

  const unitOfWorkFactory: CashFlowUnitOfWorkFactory = async (): Promise<CashFlowUnitOfWork> => {
    const entryRepository: CashEntryRepository = {
      append: async (entry: Omit<CashEntry, 'id'>): Promise<CashEntry> => {
        const appended: CashEntry = {
          ...entry,
          id: `cash-entry-${recordedEntries.length + 1}`,
        };
        recordedEntries.push(appended);
        return appended;
      },
    };

    const readRepository: CashFlowReadRepository = {
      getDailySnapshot: async (_date: string): Promise<CashFlowSnapshot | null> => {
        return createSnapshotFromEntries(recordedEntries);
      },
      getSummary: async (): Promise<CashFlowSnapshot[]> => {
        const snapshot = createSnapshotFromEntries(recordedEntries);
        return snapshot ? [snapshot] : [];
      },
    };

    return {
      async begin(): Promise<void> {},
      async commit(): Promise<void> {},
      async rollback(): Promise<void> {},
      cashEntryRepository: entryRepository,
      cashFlowReadRepository: readRepository,
    };
  };

  return new CashFlowService({
    unitOfWorkFactory,
    now: (): Date => new Date('2024-01-01T12:00:00Z'),
  });
};

const TestDashboard: FC = () => {
  const {
    orders,
    selectedOrder,
    selectedOrderId,
    isLoading,
    isProcessing,
    processingOrderId,
    selectOrder,
    accept,
    confirmPayment,
    discard,
  } = useOrderQueue();

  useEffect((): void => {
    if (!selectedOrderId && orders.length > 0) {
      selectOrder(orders[0].id);
    }
  }, [orders, selectOrder, selectedOrderId]);

  if (!selectedOrder) {
    return <div role="status">{isLoading ? 'Carregando…' : 'Nenhum pedido selecionado'}</div>;
  }

  return (
    <OrderDetails
      order={selectedOrder}
      isProcessing={isProcessing}
      processingOrderId={processingOrderId}
      onAccept={accept}
      onConfirmPayment={confirmPayment}
      onDiscard={discard}
    />
  );
};

const renderDashboard = async (): Promise<void> => {
  const repository = new OrderRepository({ endpoint: '/api/orders', queueEndpoint: '/api/orders' });
  const commandService = new OrderCommandService({ repository });
  const cashFlowService = createInMemoryCashFlowService();

  render(
    <OrderQueueProvider
      repository={repository}
      commandService={commandService}
      cashFlowService={cashFlowService}
    >
      <TestDashboard />
    </OrderQueueProvider>,
  );

  await screen.findByRole('button', { name: /aceitar/i });
};

describe('Admin dashboard command integration', (): void => {
  beforeAll((): void => {
    server.listen();
  });

  beforeEach((): void => {
    currentOrder = createMockOrder();
    pendingOrders = [currentOrder];
    patchCalls = [];
    patchResponses = [];
    server.use(...createHandlers());
  });

  afterEach((): void => {
    cleanup();
    server.resetHandlers();
  });

  afterAll((): void => {
    server.close();
  });

  it('envia o status queued ao aceitar um pedido', async (): Promise<void> => {
    await renderDashboard();

    const acceptButton = await screen.findByRole('button', { name: /aceitar/i });
    fireEvent.click(acceptButton);

    await waitFor((): void => {
      expect(patchCalls).toHaveLength(1);
    });

    expect(patchCalls[0]).toEqual({ orderId: currentOrder.id, status: 'queued' });
    expect(patchResponses[0]?.status).toBe('queued');
  });

  it('envia o status confirmed ao confirmar o pagamento', async (): Promise<void> => {
    await renderDashboard();

    const confirmButton = await screen.findByRole('button', { name: /confirmar pagamento/i });
    fireEvent.click(confirmButton);

    await waitFor((): void => {
      expect(patchCalls).toHaveLength(1);
    });

    expect(patchCalls[0]).toEqual({ orderId: currentOrder.id, status: 'confirmed' });
    expect(patchResponses[0]?.status).toBe('confirmed');
  });

  it('envia o status failed ao descartar um pedido', async (): Promise<void> => {
    await renderDashboard();

    const discardButton = await screen.findByRole('button', { name: /descartar/i });
    fireEvent.click(discardButton);

    await waitFor((): void => {
      expect(patchCalls).toHaveLength(1);
    });

    expect(patchCalls[0]).toEqual({ orderId: currentOrder.id, status: 'failed' });
    expect(patchResponses[0]?.status).toBe('failed');
  });
});
