import type { FC } from 'react';
import type { OrderItem, OrderResponse, OrderStatus } from '../../types/order';
import { formatCurrency } from '../../utils/format';
import styles from '../../styles/admin/OrderDetails.module.css';

interface OrderDetailsProps {
  order: OrderResponse | null;
  isProcessing: boolean;
  processingOrderId: string | null;
  onAccept(orderId: string): Promise<void>;
  onConfirmPayment(orderId: string): Promise<void>;
  onDiscard(orderId: string): Promise<void>;
}

const getStatusLabel = (status: OrderStatus): string => {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'queued':
      return 'Na fila';
    case 'confirmed':
      return 'Confirmado';
    case 'failed':
      return 'Descartado';
    default:
      return status;
  }
};

const formatSelection = (selection: OrderItem['selection']): string => {
  const entries = Object.entries(selection);
  if (entries.length === 0) {
    return 'Sem adicionais';
  }
  return entries
    .map(([group, value]) => {
      if (Array.isArray(value)) {
        return `${group}: ${value.join(', ')}`;
      }
      return `${group}: ${value}`;
    })
    .join(' • ');
};

const OrderDetails: FC<OrderDetailsProps> = ({
  order,
  isProcessing,
  processingOrderId,
  onAccept,
  onConfirmPayment,
  onDiscard,
}) => {
  if (!order) {
    return (
      <section className={styles.container} aria-label="Detalhes do pedido">
        <div className={styles.placeholder}>
          <h2>Nenhum pedido selecionado</h2>
          <p>Escolha um pedido na lista para visualizar os detalhes.</p>
        </div>
      </section>
    );
  }

  const isBusy = isProcessing && processingOrderId === order.id;

  const handleAccept = async (): Promise<void> => {
    await onAccept(order.id);
  };

  const handleConfirmPayment = async (): Promise<void> => {
    await onConfirmPayment(order.id);
  };

  const handleDiscard = async (): Promise<void> => {
    await onDiscard(order.id);
  };

  return (
    <section className={styles.container} aria-label={`Pedido ${order.id}`}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Pedido #{order.id}</h2>
          <p className={styles.subtitle}>{order.customer.name}</p>
        </div>
        <span className={`${styles.status} ${styles[order.status]}`}>{getStatusLabel(order.status)}</span>
      </header>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Contato</h3>
        <p className={styles.sectionContent}>
          {order.customer.phone}
          {order.customer.notes ? <span className={styles.inlineNote}>• {order.customer.notes}</span> : null}
        </p>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Entrega</h3>
        <p className={styles.sectionContent}>{order.address.label}</p>
        {order.address.complement ? (
          <p className={styles.sectionContentMuted}>{order.address.complement}</p>
        ) : null}
      </div>

      <div className={`${styles.section} ${styles.items}`}>
        <h3 className={styles.sectionTitle}>Itens</h3>
        <ul className={styles.itemsList}>
          {order.items.map((item) => (
            <li key={item.lineId} className={styles.item}>
              <div className={styles.itemHeader}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemTotal}>{formatCurrency(item.totalPrice)}</span>
              </div>
              <div className={styles.itemMeta}>
                <span className={styles.itemQuantity}>{item.quantity}x</span>
                <span className={styles.itemSelection}>{formatSelection(item.selection)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.section}>
        <div className={styles.summaryRow}>
          <span>Total</span>
          <strong>{formatCurrency(order.totals.total)}</strong>
        </div>
      </div>

      <footer className={styles.actions}>
        <button
          type="button"
          className={styles.discard}
          onClick={handleDiscard}
          disabled={isBusy}
        >
          {isBusy ? 'Processando…' : 'Descartar'}
        </button>
        <button
          type="button"
          className={styles.accept}
          onClick={handleAccept}
          disabled={isBusy}
        >
          {isBusy ? 'Processando…' : 'Aceitar'}
        </button>
        <button
          type="button"
          className={styles.confirm}
          onClick={handleConfirmPayment}
          disabled={isBusy}
        >
          {isBusy ? 'Processando…' : 'Confirmar pagamento'}
        </button>
      </footer>
    </section>
  );
};

export default OrderDetails;
