import { useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import ChromaForgeIcon from '@/components/brand/ChromaForgeIcon';
import { useAuthStore } from '@/store/useAuthStore';
import { useMotionStore } from '@/store/useMotionStore';
import MotionToggle from '@/components/ui/MotionToggle';
import RouteTransition from './RouteTransition';
import styles from './LandingLayout.module.scss';

/**
 * LandingLayout — conversion chrome for public persuasion surfaces.
 *
 * A slim sticky header (brand, documentation link, one auth-resolved action),
 * a fixed zero-cost static wash that keeps the aurora's premium presence
 * behind every section without a second canvas, and a minimal single-row
 * footer with the legally required links. Serves `/`, the document routes,
 * and the 404 stage.
 *
 * @returns {JSX.Element} The rendered landing shell with routed content.
 */
export default function LandingLayout() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = user !== null;

  const actionTo = isAuthenticated ? '/dashboard' : '/auth';
  const actionLabel = isAuthenticated ? 'Continuar al panel' : 'Comenzar';

  const location = useLocation();
  const motionReduced = useMotionStore((state) => state.reduced);

  /**
   * Brand navigation with a top guarantee (same contract as the workspace
   * header): cross-route clicks ride the router snap; same-route clicks
   * climb manually.
   *
   * @param {ReactMouseEvent<HTMLAnchorElement>} event The brand click event.
   * @returns {void}
   */
  const handleBrandClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (location.pathname !== '/') return;
      event.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: motionReduced ? 'auto' : 'smooth' });
    },
    [location.pathname, motionReduced],
  );

  return (
    <div className={styles.layout}>
      <div className={styles.wash} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            to="/"
            className={styles.brand}
            aria-label="Inicio de ChromaForge"
            onClick={handleBrandClick}
          >
            <span className={styles.brandMark} aria-hidden="true">
              <ChromaForgeIcon size={36} className={styles.brandMarkIcon} />
            </span>
            <span className={styles.brandName}>ChromaForge</span>
          </Link>

          <nav className={styles.nav} aria-label="Navegación de la página pública">
            <Link to="/docs" className={styles.navLink}>
              Documentación
            </Link>
            {!isLoading && (
              <Link to={actionTo} className={styles.navCta}>
                {actionLabel}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.copyright}>© {new Date().getFullYear()} ChromaForge.</span>
          <nav className={styles.footerNav} aria-label="Enlaces legales">
            <Link to="/docs" className={styles.footerLink}>
              Documentación
            </Link>
            <Link to="/privacy" className={styles.footerLink}>
              Privacidad
            </Link>
            <Link to="/terms" className={styles.footerLink}>
              Términos
            </Link>
            <Link to="/cookies" className={styles.footerLink}>
              Cookies
            </Link>
          </nav>
        </div>
      </footer>

      <MotionToggle />
    </div>
  );
}
