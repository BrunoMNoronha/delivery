import type { FC } from 'react';
import type { OrderResponse } from '../../types/order';
import { formatCurrency } from '../../utils/format';
import styles from '../../styles/admin/OrderList.module.css';

interface OrderListProps {
  orders: OrderResponse[];
  selectedOrderId: string | null;
  isLoading: boolean;
  processingOrderId: string | null;
  onSelect(orderId: string): void;
  onRefresh(): Promise<void>;
}

const formatTimestamp = (timestamp: string): string => {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return 'Data desconhecida';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const OrderList: FC<OrderListProps> = ({
  orders,
  selectedOrderId,
  isLoading,
  processingOrderId,
  onSelect,
  onRefresh,
}) => {
  const handleSelect = (orderId: string): void => {
    onSelect(orderId);
  };

  const handleRefresh = async (): Promise<void> => {
    await onRefresh();
  };

  return (
    <section className={styles.container} aria-label="Pedidos pendentes">
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Fila de pedidos</h2>
          <p className={styles.caption}>
            {orders.length > 0
              ? `${orders.length} pedido${orders.length > 1 ? 's' : ''} em espera`
              : 'Nenhum pedido pendente'}
          </p>
        </div>
        <button
          type="button"
          className={styles.refresh}
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Atualizando…' : 'Atualizar'}
        </button>
      </header>
      <div className={styles.list}>
        {isLoading && orders.length === 0 ? (
          <p className={styles.feedback}>Carregando pedidos…</p>
        ) : null}
        {!isLoading && orders.length === 0 ? (
          <p className={styles.feedback}>A fila está vazia no momento.</p>
        ) : null}
        <ul className={styles.items}>
          {orders.map((order) => {
            const isSelected = order.id === selectedOrderId;
            const isProcessing = order.id === processingOrderId;
            return (
              <li key={order.id}>
                <button
                  type="button"
                  className={isSelected ? styles.itemSelected : styles.item}
                  onClick={(): void => handleSelect(order.id)}
                  aria-current={isSelected}
                >
                  <div className={styles.itemHeader}>
                    <span className={styles.orderId}>#{order.id}</span>
                    <span className={styles.timestamp}>{formatTimestamp(order.createdAt)}</span>
                  </div>
                  <div className={styles.itemBody}>
                    <span className={styles.customer}>{order.customer.name}</span>
                    <span className={styles.total}>{formatCurrency(order.totals.total)}</span>
                  </div>
                  <div className={styles.itemFooter}>
                    <span className={styles.count}>
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </span>
                    {isProcessing ? <span className={styles.processing}>Processando…</span> : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default OrderList;
