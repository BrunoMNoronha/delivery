import type { FC } from 'react';
import { useMemo } from 'react';
import OrderDetails from './components/OrderDetails';
import OrderList from './components/OrderList';
import CashSummaryWidget from './components/CashSummaryWidget';
import { OrderQueueProvider } from './state/OrderQueueProvider';
import { useOrderQueue } from './state/useOrderQueue';
import { CashFlowService } from '../services/CashFlowService';
import { OrderCommandService } from '../services/OrderCommandService';
import { OrderRepository } from '../services/OrderRepository';
import styles from '../styles/admin/Dashboard.module.css';

const DashboardContent: FC = () => {
  const {
    orders,
    selectedOrder,
    selectedOrderId,
    isLoading,
    isProcessing,
    processingOrderId,
    error,
    cashSummary,
    cashSummaryError,
    isCashSummaryLoading,
    refresh,
    selectOrder,
    accept,
    confirmPayment,
    discard,
  } = useOrderQueue();

  const handleRefresh = async (): Promise<void> => {
    await refresh();
  };

  const handleSelect = (orderId: string): void => {
    selectOrder(orderId);
  };

  const handleAccept = async (orderId: string): Promise<void> => {
    await accept(orderId);
  };

  const handleConfirmPayment = async (orderId: string): Promise<void> => {
    await confirmPayment(orderId);
  };

  const handleDiscard = async (orderId: string): Promise<void> => {
    await discard(orderId);
  };

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headingGroup}>
          <h1 className={styles.title}>Painel administrativo</h1>
          <p className={styles.subtitle}>Gerencie a fila de pedidos com rapidez.</p>
        </div>
        <div className={styles.kpis}>
          <CashSummaryWidget
            summary={cashSummary}
            isLoading={isCashSummaryLoading}
            error={cashSummaryError}
            onRefresh={handleRefresh}
          />
        </div>
      </header>
      {error ? <p className={styles.error}>{error}</p> : null}
      <div className={styles.columns}>
        <OrderList
          orders={orders}
          selectedOrderId={selectedOrderId}
          isLoading={isLoading}
          processingOrderId={processingOrderId}
          onSelect={handleSelect}
          onRefresh={handleRefresh}
        />
        <OrderDetails
          order={selectedOrder}
          isProcessing={isProcessing}
          processingOrderId={processingOrderId}
          onAccept={handleAccept}
          onConfirmPayment={handleConfirmPayment}
          onDiscard={handleDiscard}
        />
      </div>
    </div>
  );
};

const Dashboard: FC = () => {
  const repository = useMemo<OrderRepository>(() => new OrderRepository(), []);
  const cashFlowService = useMemo<CashFlowService>(() => new CashFlowService(), []);
  const commandService = useMemo<OrderCommandService>(
    () => new OrderCommandService({ repository }),
    [repository],
  );

  return (
    <OrderQueueProvider
      repository={repository}
      commandService={commandService}
      cashFlowService={cashFlowService}
    >
      <DashboardContent />
    </OrderQueueProvider>
  );
};

export default Dashboard;
