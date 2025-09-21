import type { FC } from 'react';
import type { CartLine, CartTotals } from '../types/menu';
import { formatCurrency } from '../utils/format';
import { summarizeSelection } from '../utils/cart';
import styles from '../styles/CartSheet.module.css';

export interface CartSheetProps {
  isOpen: boolean;
  lines: CartLine[];
  totals: CartTotals;
  onClose: () => void;
  onIncrement: (key: string) => void;
  onDecrement: (key: string) => void;
  onCheckout: () => void;
}

const CartSheet: FC<CartSheetProps> = ({
  isOpen,
  lines,
  totals,
  onClose,
  onIncrement,
  onDecrement,
  onCheckout,
}) => {
  const sheetClassName = `${styles.sheet} ${isOpen ? styles.open : ''}`.trim();

  return (
    <section className={sheetClassName} aria-hidden={!isOpen}>
      <header className={styles.sheetHeader}>
        <h3 className={styles.title}>Minha sacola</h3>
        <span className={styles.etaPill}>30–40 min</span>
      </header>
      <div className={styles.body}>
        {lines.length === 0 && <p className={styles.emptyMessage}>Seu carrinho está vazio.</p>}
        {lines.map((line) => {
          const lineTotal = line.unitPrice * line.quantity;
          return (
            <div key={line.key} className={styles.line}>
              <div className={styles.thumb}>
                <img src={line.product.img} alt={line.product.name} />
              </div>
              <div className={styles.lineInfo}>
                <div className={styles.lineTitle}>{line.product.name}</div>
                <div className={styles.lineDesc}>{summarizeSelection(line.product, line.selection)}</div>
              </div>
              <div className={styles.qty}>
                <button type="button" className={styles.qtyButton} onClick={(): void => onDecrement(line.key)} aria-label="Remover unidade">
                  –
                </button>
                <strong>{line.quantity}</strong>
                <button type="button" className={styles.qtyButton} onClick={(): void => onIncrement(line.key)} aria-label="Adicionar unidade">
                  +
                </button>
              </div>
              <div className={styles.linePrice}>{formatCurrency(lineTotal)}</div>
            </div>
          );
        })}
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Fechar
        </button>
        <button
          type="button"
          className={styles.checkout}
          disabled={totals.count === 0}
          onClick={onCheckout}
        >
          Finalizar • <span>{formatCurrency(totals.total)}</span>
        </button>
      </div>
    </section>
  );
};

export default CartSheet;
