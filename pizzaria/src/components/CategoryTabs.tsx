import type { FC } from 'react';
import type { Category } from '../types/menu';
import styles from '../styles/CategoryTabs.module.css';

export interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

const renderCategoryIcon = (icon: string): string => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100%' height='100%' rx='16' fill='white'/><text x='50%' y='54%' text-anchor='middle' font-size='40'>${icon}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const CategoryTabs: FC<CategoryTabsProps> = ({ categories, activeCategory, onSelectCategory }) => {
  return (
    <nav className={styles.tabs}>
      {categories.map((category) => {
        const isActive = category.name === activeCategory;
        const iconSource = renderCategoryIcon(category.icon);
        return (
          <button
            type="button"
            key={category.name}
            className={`${styles.tab} ${isActive ? styles.active : ''}`.trim()}
            onClick={(): void => onSelectCategory(category.name)}
          >
            <img className={styles.tabImage} alt={category.name} src={iconSource} />
            <span className={styles.tabLabel}>{category.name}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default CategoryTabs;
