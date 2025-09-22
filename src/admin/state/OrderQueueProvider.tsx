import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { FC, ReactNode } from 'react';
import type { CashFlowSnapshot } from '../../types/cash';
import type { OrderResponse } from '../../types/order';
import { CashFlowService } from '../../services/CashFlowService';
import { OrderCommandService } from '../../services/OrderCommandService';
import { OrderRepository } from '../../services/OrderRepository';
import { OrderQueueContext, type OrderQueueContextValue } from './OrderQueueContext';

interface OrderQueueProviderProps {
  repository: OrderRepository;
  commandService: OrderCommandService;
  cashFlowService: CashFlowService;
  children: ReactNode;
}

interface OrderQueueState {
  orders: OrderResponse[];
  selectedOrderId: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  processingOrderId: string | null;
  error: string | null;
  cashSummary: CashFlowSnapshot | null;
  cashSummaryError: string | null;
  isCashSummaryLoading: boolean;
}

type OrderQueueAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; orders: OrderResponse[] }
  | { type: 'FETCH_FAILURE'; message: string }
  | { type: 'SELECT_ORDER'; orderId: string | null }
  | { type: 'PROCESS_START'; orderId: string }
  | { type: 'PROCESS_FAILURE'; message: string }
  | { type: 'PROCESS_END' }
  | { type: 'REMOVE_ORDER'; orderId: string }
  | { type: 'CASH_SUMMARY_LOADING' }
  | { type: 'CASH_SUMMARY_SUCCESS'; snapshot: CashFlowSnapshot | null }
  | { type: 'CASH_SUMMARY_FAILURE'; message: string };

const initialState: OrderQueueState = {
  orders: [],
  selectedOrderId: null,
  isLoading: false,
  isProcessing: false,
  processingOrderId: null,
  error: null,
  cashSummary: null,
  cashSummaryError: null,
  isCashSummaryLoading: false,
};

const orderQueueReducer = (state: OrderQueueState, action: OrderQueueAction): OrderQueueState => {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'FETCH_SUCCESS': {
      const nextOrders = action.orders;
      const nextSelectedId =
        state.selectedOrderId && nextOrders.some((order) => order.id === state.selectedOrderId)
          ? state.selectedOrderId
          : nextOrders[0]?.id ?? null;
      return {
        ...state,
        orders: nextOrders,
        selectedOrderId: nextSelectedId,
        isLoading: false,
        error: null,
      };
    }
    case 'FETCH_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.message,
      };
    case 'SELECT_ORDER':
      return {
        ...state,
        selectedOrderId: action.orderId,
      };
    case 'PROCESS_START':
      return {
        ...state,
        isProcessing: true,
        processingOrderId: action.orderId,
        error: null,
      };
    case 'PROCESS_FAILURE':
      return {
        ...state,
        error: action.message,
      };
    case 'PROCESS_END':
      return {
        ...state,
        isProcessing: false,
        processingOrderId: null,
      };
    case 'REMOVE_ORDER': {
      const remaining = state.orders.filter((order) => order.id !== action.orderId);
      const nextSelectedId =
        state.selectedOrderId && remaining.some((order) => order.id === state.selectedOrderId)
          ? state.selectedOrderId
          : remaining[0]?.id ?? null;
      return {
        ...state,
        orders: remaining,
        selectedOrderId: nextSelectedId,
      };
    }
    case 'CASH_SUMMARY_LOADING':
      return {
        ...state,
        isCashSummaryLoading: true,
        cashSummaryError: null,
      };
    case 'CASH_SUMMARY_SUCCESS':
      return {
        ...state,
        isCashSummaryLoading: false,
        cashSummary: action.snapshot,
        cashSummaryError: null,
      };
    case 'CASH_SUMMARY_FAILURE':
      return {
        ...state,
        isCashSummaryLoading: false,
        cashSummaryError: action.message,
      };
    default:
      return state;
  }
};

export const OrderQueueProvider: FC<OrderQueueProviderProps> = ({
  repository,
  commandService,
  cashFlowService,
  children,
}) => {
  const [state, dispatch] = useReducer(orderQueueReducer, initialState);

  const refresh = useCallback(async (): Promise<void> => {
    dispatch({ type: 'FETCH_START' });
    dispatch({ type: 'CASH_SUMMARY_LOADING' });

    const [ordersResult, cashResult] = await Promise.allSettled([
      repository.listPending(),
      cashFlowService.getDailySummary(new Date()),
    ]);

    if (ordersResult.status === 'fulfilled') {
      dispatch({ type: 'FETCH_SUCCESS', orders: ordersResult.value });
    } else {
      const message =
        ordersResult.reason instanceof Error
          ? ordersResult.reason.message
          : 'Falha ao carregar pedidos.';
      dispatch({ type: 'FETCH_FAILURE', message });
    }

    if (cashResult.status === 'fulfilled') {
      dispatch({ type: 'CASH_SUMMARY_SUCCESS', snapshot: cashResult.value });
    } else {
      const message =
        cashResult.reason instanceof Error
          ? cashResult.reason.message
          : 'Falha ao carregar fluxo de caixa.';
      dispatch({ type: 'CASH_SUMMARY_FAILURE', message });
    }
  }, [repository, cashFlowService]);

  useEffect((): void => {
    void refresh();
  }, [refresh]);

  const selectOrder = useCallback((orderId: string | null): void => {
    dispatch({ type: 'SELECT_ORDER', orderId });
  }, []);

  const confirmPayment = useCallback(
    async (orderId: string): Promise<void> => {
      dispatch({ type: 'PROCESS_START', orderId });
      dispatch({ type: 'CASH_SUMMARY_LOADING' });
      let summaryHandled = false;
      try {
        const order = state.orders.find((item) => item.id === orderId);
        if (!order) {
          throw new Error('Pedido não encontrado na fila.');
        }

        try {
          const snapshot = await cashFlowService.recordPayment(order, order.totals.total);
          dispatch({ type: 'CASH_SUMMARY_SUCCESS', snapshot });
          summaryHandled = true;
        } catch (cashFlowError) {
          const message =
            cashFlowError instanceof Error
              ? cashFlowError.message
              : 'Falha ao registrar pagamento no fluxo de caixa.';
          dispatch({ type: 'CASH_SUMMARY_FAILURE', message });
          summaryHandled = true;
          throw cashFlowError;
        }

        await commandService.confirmOrder(orderId);
        dispatch({ type: 'REMOVE_ORDER', orderId });
        void refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Falha ao confirmar pagamento.';
        dispatch({ type: 'PROCESS_FAILURE', message });
        if (!summaryHandled) {
          dispatch({ type: 'CASH_SUMMARY_SUCCESS', snapshot: state.cashSummary });
        }
      } finally {
        dispatch({ type: 'PROCESS_END' });
      }
    },
    [cashFlowService, commandService, refresh, state.cashSummary, state.orders],
  );

  const accept = useCallback(
    async (orderId: string): Promise<void> => {
      dispatch({ type: 'PROCESS_START', orderId });
      try {
        await commandService.acceptOrder(orderId);
        dispatch({ type: 'REMOVE_ORDER', orderId });
        void refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao aceitar pedido.';
        dispatch({ type: 'PROCESS_FAILURE', message });
      } finally {
        dispatch({ type: 'PROCESS_END' });
      }
    },
    [commandService, refresh],
  );

  const discard = useCallback(
    async (orderId: string): Promise<void> => {
      dispatch({ type: 'PROCESS_START', orderId });
      try {
        await commandService.discardOrder(orderId);
        dispatch({ type: 'REMOVE_ORDER', orderId });
        void refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao descartar pedido.';
        dispatch({ type: 'PROCESS_FAILURE', message });
      } finally {
        dispatch({ type: 'PROCESS_END' });
      }
    },
    [commandService, refresh],
  );

  const selectedOrder = useMemo<OrderResponse | null>(() => {
    if (!state.selectedOrderId) {
      return null;
    }
    return state.orders.find((order) => order.id === state.selectedOrderId) ?? null;
  }, [state.orders, state.selectedOrderId]);

  const value = useMemo<OrderQueueContextValue>(
    () => ({
      orders: state.orders,
      selectedOrder,
      selectedOrderId: state.selectedOrderId,
      isLoading: state.isLoading,
      isProcessing: state.isProcessing,
      processingOrderId: state.processingOrderId,
      error: state.error,
      refresh,
      selectOrder,
      accept,
      confirmPayment,
      discard,
      cashSummary: state.cashSummary,
      cashSummaryError: state.cashSummaryError,
      isCashSummaryLoading: state.isCashSummaryLoading,
    }),
    [
      state.orders,
      selectedOrder,
      state.selectedOrderId,
      state.isLoading,
      state.isProcessing,
      state.processingOrderId,
      state.error,
      state.cashSummary,
      state.cashSummaryError,
      state.isCashSummaryLoading,
      refresh,
      selectOrder,
      accept,
      confirmPayment,
      discard,
    ],
  );

  return <OrderQueueContext.Provider value={value}>{children}</OrderQueueContext.Provider>;
};
