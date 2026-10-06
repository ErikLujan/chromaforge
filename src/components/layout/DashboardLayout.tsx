import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';
import { AvatarDropdown } from './Header';
import Sidebar from './Sidebar';
import RouteTransition from './RouteTransition';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './DashboardLayout.module.scss';

/**
 * Breadcrumb sections per workspace route. Unknown workspace paths fall back
 * to the Panel label — every route served by this shell is listed here.
 */
const sectionLabels: Record<string, string> = {
  '/dashboard': 'Panel',
  '/quiz': 'Cuestionario',
  '/brands': 'Marcas',
  '/profile': 'Mi perfil',
};

/**
 * DashboardLayout — enterprise workspace shell for authenticated surfaces.
 *
 * A CSS Grid shell: a fixed sidebar rail on desktop (collapsing into a
 * hamburger drawer on mobile) beside a content column carrying a sticky
 * context topbar (breadcrumbs + avatar dropdown), the routed workspace, and
 * a minimal footer. Serves `/dashboard`, `/quiz`, `/brands` and `/profile`.
 * Routed page content is untouched — only the surrounding chrome changed.
 *
 * @returns {JSX.Element} The rendered workspace shell with routed content.
 */
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const displayName =
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    user?.email?.split('@')[0] ||
    '';
  const email = user?.email ?? '';
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  /**
   * Signs the current user out, notifies them, and returns to the auth page.
   * The store raises the transition veil so the layout switch lands behind it.
   *
   * @returns {Promise<void>}
   */
  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada.');
      navigate('/auth', { replace: true });
    } catch {
      toast.error('No pudimos cerrar tu sesión. Inténtalo de nuevo.');
    }
  }, [signOut, navigate]);

  const section = sectionLabels[location.pathname] ?? 'Panel';
  const showRoot = location.pathname !== '/dashboard';

  // Route-change scroll reset for the shell's scroll owner: on desktop the
  // document never scrolls (`.main` owns the scrollport), so the global
  // window reset never fires there — without this, the next route inherits
  // the previous route's offset. Inner pane scrolls are separate elements
  // and keep their positions. Instant, like the window-level restoration.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  return (
    <div className={styles.layout}>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Isolated content column: on desktop the shell locks to one viewport
          and this column owns its own scroll, so sidebar geometry can never
          leak into the content rows. On mobile it dissolves
          (`display: contents`) and the grid behaves exactly as before. */}
      <div className={styles.content}>
      <header className={styles.topbar}>
        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-label={sidebarOpen ? 'Cerrar navegación' : 'Abrir navegación'}
          aria-expanded={sidebarOpen}
          aria-controls="workspace-sidebar"
          onClick={sidebarOpen ? closeSidebar : openSidebar}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <nav className={styles.crumbs} aria-label="Migas de pan">
          <ol className={styles.crumbList}>
            {showRoot && (
              <li className={styles.crumbItem}>
                <Link to="/dashboard" className={styles.crumbLink}>
                  Panel
                </Link>
                <span className={styles.crumbSeparator} aria-hidden="true">
                  /
                </span>
              </li>
            )}
            <li className={styles.crumbItem}>
              <span aria-current="page" className={styles.crumbCurrent}>
                {section}
              </span>
            </li>
          </ol>
        </nav>

        <div className={styles.topbarActions}>
          {user ? (
            <AvatarDropdown
              name={displayName}
              email={email}
              avatarUrl={avatarUrl}
              onSignOut={() => void handleSignOut()}
            />
          ) : (
            <span className={styles.topbarPlaceholder} aria-hidden="true" />
          )}
        </div>
      </header>

      <main ref={mainRef} className={styles.main}>
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </main>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>ChromaForge</span>
        <Link to="/docs" className={styles.footerLink}>
          Documentación
        </Link>
      </footer>
      </div>
    </div>
  );
}
