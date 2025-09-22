import type { ChangeEvent, FC, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Location } from 'react-router-dom';
import { useAdminAuth } from './state/useAdminAuth';
import styles from '../styles/admin/AdminLogin.module.css';

const AdminLogin: FC = () => {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const resolveRedirectTarget = (state: unknown): string => {
    if (state && typeof state === 'object' && 'from' in state) {
      const fromLocation = (state as { from?: Location }).from;
      if (fromLocation && typeof fromLocation.pathname === 'string') {
        return fromLocation.pathname;
      }
    }
    return '/admin';
  };

  useEffect((): void => {
    if (!isAuthenticated) {
      return;
    }

    const redirectTarget = resolveRedirectTarget(location.state);
    navigate(redirectTarget, { replace: true });
  }, [isAuthenticated, location.state, navigate]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setToken(event.target.value);
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const success = login(token);
    if (!success) {
      setError('Token inválido. Tente novamente.');
      return;
    }
    const redirectTarget = resolveRedirectTarget(location.state);
    navigate(redirectTarget, { replace: true });
  };

  return (
    <main className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Acesso administrativo</h1>
        <p className={styles.subtitle}>Informe o token de administrador para entrar.</p>
        <label className={styles.label} htmlFor="admin-token">
          Token de acesso
        </label>
        <input
          id="admin-token"
          name="token"
          type="password"
          className={styles.input}
          value={token}
          onChange={handleChange}
          placeholder="Digite o token fornecido"
          autoComplete="current-password"
          required
        />
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" className={styles.submit}>
          Entrar
        </button>
      </form>
    </main>
  );
};

export default AdminLogin;
