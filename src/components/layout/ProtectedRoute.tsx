import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './ProtectedRoute.module.scss';

/**
 * ProtectedRoute — auth route guard.
 *
 * Renders `children` only for authenticated visitors and otherwise redirects
 * to the auth page, preserving the attempted destination so the auth flow can
 * send the user back after sign-in. No redirect ever fires while the initial
 * session restore is in flight.
 */

interface ProtectedRouteProps {
  /** The subtree rendered when access is granted. */
  readonly children: ReactNode;
}

/**
 * Renders the protected subtree for authenticated visitors.
 *
 * @param {ProtectedRouteProps} props The subtree rendered when access is granted.
 * @returns {JSX.Element} The subtree, a loading state, or a redirect.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className={styles.loader} role="status" aria-live="polite">
        <span className={styles.dot} aria-hidden="true" />
        <span>Verificando acceso…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
