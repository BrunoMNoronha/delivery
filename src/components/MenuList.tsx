import type { ChangeEventHandler, FC } from 'react';
import type { Product } from '../types/menu';
import { formatCurrency } from '../utils/format';
import styles from '../styles/MenuList.module.css';

export interface MenuListProps {
  products: Product[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onProductClick: (product: Product) => void;
}

const MenuList: FC<MenuListProps> = ({ products, searchTerm, onSearchChange, onProductClick }) => {
  const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onSearchChange(event.target.value);
  };

  return (
    <>
      <div className={styles.search}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar itens"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>
      <main className={styles.list}>
        {products.length === 0 && <p className={styles.empty}>Nenhum item encontrado.</p>}
        {products.map((product) => (
          <article key={product.id} className={styles.card}>
            <button type="button" className={styles.thumb} onClick={(): void => onProductClick(product)}>
              <img src={product.img} alt={product.name} loading="lazy" />
            </button>
            <div className={styles.meta}>
              <div className={styles.title}>{product.name}</div>
              <div className={styles.desc}>{product.desc}</div>
              <div className={styles.priceRow}>
                <div className={styles.price}>{formatCurrency(product.price)}</div>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={(): void => onProductClick(product)}
                >
                  + Adicionar
                </button>
              </div>
            </div>
          </article>
        ))}
      </main>
    </>
  );
};

export default MenuList;
