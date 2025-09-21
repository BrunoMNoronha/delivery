import type { ChangeEventHandler, FC } from 'react';
import styles from '../styles/Header.module.css';

export interface HeaderProps {
  address: string;
  onAddressChange: (value: string) => void;
  onRequestLocation: () => void;
  onToggleTheme?: () => void;
}

const Header: FC<HeaderProps> = ({
  address,
  onAddressChange,
  onRequestLocation,
  onToggleTheme,
}) => {
  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onAddressChange(event.target.value);
  };

  const handleGpsClick = (): void => {
    onRequestLocation();
  };

  const handleThemeClick = (): void => {
    onToggleTheme?.();
  };

  return (
    <header className={styles.header}>
      <div className={styles.topbar}>
        <button type="button" className={styles.iconButton} aria-label="menu">
          ☰
        </button>
        <div className={styles.logo}>
          <div className={styles.mark}>🍕</div>
          <div>Pizzaria Minutu’s</div>
        </div>
        <button type="button" className={styles.iconButton} onClick={handleThemeClick} aria-label="Alternar tema">
          ◐
        </button>
      </div>
      <div className={styles.address}>
        <span role="img" aria-label="Localização">
          📍
        </span>
        <input
          className={styles.addressInput}
          placeholder="Informar endereço de entrega"
          value={address}
          onChange={handleInputChange}
        />
        <button type="button" className={styles.gpsButton} onClick={handleGpsClick}>
          Usar GPS
        </button>
      </div>
    </header>
  );
};

export default Header;
