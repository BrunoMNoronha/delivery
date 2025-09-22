import type { ChangeEventHandler, FC } from 'react';
import { Link } from 'react-router-dom';
import type { GeolocationStatus } from '../hooks/useGeolocation';
import styles from '../styles/Header.module.css';

export interface HeaderProps {
  address: string;
  onAddressChange: (value: string) => void;
  onRequestLocation: () => void;
  onToggleTheme?: () => void;
  locationStatus: GeolocationStatus;
  isLocationSupported: boolean;
}

const Header: FC<HeaderProps> = ({
  address,
  onAddressChange,
  onRequestLocation,
  onToggleTheme,
  locationStatus,
  isLocationSupported,
}) => {
  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (event): void => {
    onAddressChange(event.target.value);
  };

  const handleGpsClick = (): void => {
    onRequestLocation();
  };

  const handleThemeClick = (): void => {
    onToggleTheme?.();
  };

  const isLoading: boolean = locationStatus === 'loading';
  const isError: boolean = locationStatus === 'error';
  const isUnavailable: boolean = locationStatus === 'unsupported' || !isLocationSupported;
  const buttonLabel: string = isLoading
    ? 'Buscando...'
    : isError
      ? 'Tentar novamente'
      : isUnavailable
        ? 'GPS indisponível'
        : 'Usar GPS';
  const buttonClassName: string = isLoading
    ? `${styles.gpsButton} ${styles.gpsButtonLoading}`
    : styles.gpsButton;

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
        <Link
          to="/admin/login"
          className={styles.adminLink}
          aria-label="Ir para login administrativo"
        >
          Área Admin
        </Link>
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
        <button
          type="button"
          className={buttonClassName}
          onClick={handleGpsClick}
          disabled={isLoading || isUnavailable}
          aria-busy={isLoading}
        >
          {buttonLabel}
        </button>
      </div>
    </header>
  );
};

export default Header;
