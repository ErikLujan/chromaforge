import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './ProtectedRoute.module.scss';

/**
 * PublicRoute — auth boundary for public surfaces.
 *
 * The counterpart of ProtectedRoute: renders `children` only for anonymous
 * visitors and redirects authenticated users to the workspace. The auth
 * boundary stays strict in both directions, so no signed-in visitor reaches
 * the sign-in or registration UI. No redirect ever fires while the initial
 * session restore is in flight.
 */

interface PublicRouteProps {
  /** The subtree rendered while the visitor is signed out. */
  readonly children: ReactNode;
}

/**
 * Renders the public subtree for anonymous visitors.
 *
 * @param {PublicRouteProps} props The subtree rendered while signed out.
 * @returns {JSX.Element} The subtree, a loading state, or a redirect.
 */
export default function PublicRoute({ children }: PublicRouteProps) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className={styles.loader} role="status" aria-live="polite">
        <span className={styles.dot} aria-hidden="true" />
        <span>Verificando acceso…</span>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}