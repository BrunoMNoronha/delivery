import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MessagingConfig } from '../config/messaging';
import App from '../App';
import { OrderRepository } from '../services/OrderRepository';
import { MemoryRouter } from 'react-router-dom';
import type { OrderRequest, OrderResponse } from '../types/order';

const { whatsappNumberMock } = vi.hoisted((): { whatsappNumberMock: string } => ({
  whatsappNumberMock: '5599988877766',
}));

vi.mock('../config/messaging', (): typeof import('../config/messaging') => {
  const messagingConfig: MessagingConfig = { whatsappNumber: whatsappNumberMock };
  return {
    getMessagingConfig: (): MessagingConfig => messagingConfig,
    resolveWhatsappNumber: (): string => messagingConfig.whatsappNumber,
  };
});

describe('Checkout flow', (): void => {
  beforeAll((): void => {
    if (!HTMLElement.prototype.animate) {
      Object.defineProperty(HTMLElement.prototype, 'animate', {
        value: vi.fn(),
        writable: true,
        configurable: true,
      });
    }
  });

  afterEach((): void => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('should create an order and open WhatsApp with the summary', async (): Promise<void> => {
    const createSpy = vi
      .spyOn(OrderRepository.prototype, 'create')
      .mockImplementation(async (order: OrderRequest): Promise<OrderResponse> => {
        return {
          id: 'order-123',
          status: 'pending',
          customer: order.customer,
          items: order.items,
          totals: order.totals,
          address: order.address,
          createdAt: new Date().toISOString(),
          metadata: order.metadata,
        };
      });

    const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    const addButtons = await screen.findAllByRole('button', { name: '+ Adicionar' });
    fireEvent.click(addButtons[0]);

    const confirmButton = await screen.findByRole('button', { name: '+ Adicionar ao carrinho' });
    fireEvent.click(confirmButton);

    const viewBagButton = await screen.findByRole('button', { name: /ver sacola/i });
    fireEvent.click(viewBagButton);

    const finalizeButton = await screen.findByRole('button', { name: /finalizar/i });
    fireEvent.click(finalizeButton);

    await waitFor((): void => {
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    await waitFor((): void => {
      expect(windowOpenSpy).toHaveBeenCalledTimes(1);
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        totals: expect.objectContaining({
          total: expect.any(Number),
          count: expect.any(Number),
        }),
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'pz1',
            quantity: 1,
            selection: expect.objectContaining({
              size: 'M',
              crust: 'classic',
            }),
          }),
        ]),
        metadata: expect.objectContaining({
          channel: 'web',
        }),
      }),
    );

    const [orderRequest] = createSpy.mock.calls[0] as [OrderRequest];
    expect(orderRequest.totals.total).toBeCloseTo(34.9, 2);
    expect(orderRequest.totals.count).toBe(1);

    const metadata: Record<string, unknown> = (orderRequest.metadata ?? {}) as Record<string, unknown>;
    expect(metadata).toEqual(
      expect.objectContaining({
        channel: 'web',
        addressText: expect.any(String),
      }),
    );

    const [checkoutUrl] = windowOpenSpy.mock.calls[0] ?? [];
    expect(typeof checkoutUrl).toBe('string');
    expect(checkoutUrl).toContain(`https://wa.me/${whatsappNumberMock}`);
    expect(checkoutUrl).toContain('order-123');
    expect(checkoutUrl).toContain('Margherita x1');
    expect(checkoutUrl).toContain('Total:');
    expect(windowOpenSpy).toHaveBeenCalledWith(checkoutUrl, '_blank');
  });
});
