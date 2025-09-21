import type { ChangeEventHandler, FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { CartSelection, Product, ProductOptionGroup } from '../types/menu';
import { calculateUnitPrice, createDefaultSelection } from '../utils/cart';
import { formatCurrency } from '../utils/format';
import styles from '../styles/ProductModal.module.css';

export interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: Product, selection: CartSelection) => void;
}

const isSelectionValid = (product: Product, selection: CartSelection): boolean => {
  if (!product.opts) {
    return true;
  }

  return product.opts.groups.every((group) => {
    if (!group.required) {
      return true;
    }
    const value = selection[group.key];
    if (group.type === 'radio') {
      return typeof value === 'string' && value.length > 0;
    }
    return Array.isArray(value) && value.length > 0;
  });
};

const ProductModal: FC<ProductModalProps> = ({ product, isOpen, onClose, onAdd }) => {
  const [selection, setSelection] = useState<CartSelection>({});

  useEffect((): void => {
    if (product) {
      setSelection(createDefaultSelection(product));
    }
  }, [product]);

  const total = useMemo(() => {
    if (!product) {
      return 0;
    }
    return calculateUnitPrice(product, selection);
  }, [product, selection]);

  const handleRadioChange = (group: ProductOptionGroup, value: string): void => {
    setSelection((previous) => ({ ...previous, [group.key]: value }));
  };

  const handleCheckboxChange = (group: ProductOptionGroup, optionKey: string): void => {
    setSelection((previous) => {
      const current = Array.isArray(previous[group.key]) ? (previous[group.key] as string[]) : [];
      const next = current.includes(optionKey)
        ? current.filter((entry) => entry !== optionKey)
        : [...current, optionKey];
      return { ...previous, [group.key]: next };
    });
  };

  const handleAddClick = (): void => {
    if (product && isSelectionValid(product, selection)) {
      onAdd(product, selection);
    }
  };

  const overlayClassName = `${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`.trim();
  const modalClassName = `${styles.modal} ${isOpen ? styles.modalOpen : ''}`.trim();

  return (
    <>
      <div className={overlayClassName} role="presentation" onClick={onClose} />
      <section className={modalClassName} aria-hidden={!isOpen}>
        {product && (
          <>
            <header className={styles.modalHeader}>
              <div className={styles.modalThumb}>
                <img src={product.img} alt={product.name} />
              </div>
              <div className={styles.modalInfo}>
                <div className={styles.modalTitle}>{product.name}</div>
                <div className={styles.modalDesc}>{product.desc}</div>
              </div>
              <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar modal">
                ✕
              </button>
            </header>
            <div className={styles.modalBody}>
              {product.opts?.groups.map((group) => (
                <div key={group.key} className={styles.optionGroup}>
                  <h4 className={styles.optionGroupTitle}>
                    {group.title}
                    {group.required ? (
                      <span className={styles.badge}>obrigatório</span>
                    ) : (
                      <span className={styles.optionalHint}>opcional</span>
                    )}
                  </h4>
                  {group.options.map((option) => {
                    const id = `${product.id}-${group.key}-${option.k}`;
                    if (group.type === 'radio') {
                      const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
                        if (event.target.checked) {
                          handleRadioChange(group, option.k);
                        }
                      };
                      const checked = selection[group.key] === option.k;
                      return (
                        <label key={option.k} className={styles.optionRow} htmlFor={id}>
                          <input
                            id={id}
                            type="radio"
                            name={`${product.id}-${group.key}`}
                            checked={checked}
                            onChange={handleChange}
                          />
                          <span className={styles.optionLabel}>{option.label}</span>
                          <small className={styles.optionHint}>
                            {option.delta > 0 && `+ ${formatCurrency(option.delta)}`}
                            {option.delta < 0 && `- ${formatCurrency(Math.abs(option.delta))}`}
                          </small>
                        </label>
                      );
                    }

                    const currentValues = Array.isArray(selection[group.key])
                      ? (selection[group.key] as string[])
                      : [];
                    const checked = currentValues.includes(option.k);
                    const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
                      if (event.target.checked) {
                        handleCheckboxChange(group, option.k);
                      } else {
                        handleCheckboxChange(group, option.k);
                      }
                    };
                    return (
                      <label key={option.k} className={styles.optionRow} htmlFor={id}>
                        <input id={id} type="checkbox" checked={checked} onChange={handleChange} />
                        <span className={styles.optionLabel}>{option.label}</span>
                        <small className={styles.optionHint}>
                          {option.delta > 0 && `+ ${formatCurrency(option.delta)}`}
                        </small>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className={styles.modalFooter}>
              <div className={styles.modalTotal}>{formatCurrency(total)}</div>
              <button
                type="button"
                className={styles.ctaButton}
                onClick={handleAddClick}
                disabled={!product || !isSelectionValid(product, selection)}
              >
                + Adicionar ao carrinho
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default ProductModal;
