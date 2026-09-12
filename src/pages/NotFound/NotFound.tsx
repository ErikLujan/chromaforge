import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, House } from 'lucide-react';
import clsx from 'clsx';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEntrance } from '@/hooks/useEntrance';
import { useSpotlight } from '@/hooks/useSpotlight';
import NotFoundTerminal from './NotFoundTerminal';
import styles from './NotFound.module.scss';

/**
 * NotFound — 404 error stage for unmatched routes.
 *
 * The one surface a visitor reaches by mistake stays calm and precise: the
 * primary action returns to the exact previous location instead of a generic
 * home detour, and the failed route is named like a server would. Card-less
 * terminal state over the ignition grid, with the standard shell mounted so
 * navigation stays available.
 */

/**
 * ChromaForge "404" error surface for unmatched routes.
 *
 * Rendered by the router catch-all (`<Route path="*" ... />`) while the
 * standard shell (header + footer) stays mounted, so the visitor keeps full
 * navigation. The primary action returns to the exact previous location via
 * `navigate(-1)`; the secondary link is the direct-entry safety net.
 *
 * @returns {JSX.Element} The rendered 404 page.
 */
export default function NotFound() {
  useDocumentTitle('Página no encontrada');

  const navigate = useNavigate();
  const location = useLocation();

  const entered = useEntrance();

  const unknownPath = location.pathname || '/';

  const handleSpotlight = useSpotlight<HTMLAnchorElement>();
  const handleSpotlightButton = useSpotlight<HTMLButtonElement>();

  return (
    <section className={styles.notFound} aria-labelledby="not-found-title">
      <div className={styles.background} aria-hidden="true">
        <NotFoundTerminal />
      </div>

      <div className={styles.stage}>
        <p className={clsx(styles.eyebrow, entered && styles.entered)}>
          Error 404 · Ruta no encontrada
        </p>

        <h1
          id="not-found-title"
          className={clsx(styles.title, entered && styles.entered)}
          data-text="404"
        >
          <span aria-hidden="true">404</span>
          <span className={styles.srOnly}>Página no encontrada</span>
        </h1>

        <p className={clsx(styles.routeRow, entered && styles.entered)}>
          <span className={styles.routeMethod}>GET</span>
          <code className={styles.routePath}>{unknownPath}</code>
          <span className={styles.routeArrow} aria-hidden="true">
            →
          </span>
          <span className={styles.routeStatus}>404</span>
          <span className={styles.caret} aria-hidden="true" />
        </p>

        <p className={clsx(styles.message, entered && styles.entered)}>
          La página que buscas no existe o fue movida a otra dirección.
        </p>

        <div
          className={clsx(styles.actions, entered && styles.entered)}
          role="group"
          aria-label="Opciones para continuar"
        >
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => navigate(-1)}
            onPointerMove={handleSpotlightButton}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Volver atrás
          </button>
          <Link to="/" className={styles.homeLink} onPointerMove={handleSpotlight}>
            <House size={15} aria-hidden="true" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </section>
  );
}