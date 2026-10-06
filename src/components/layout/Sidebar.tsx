import { useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  BookOpen,
  LayoutDashboard,
  Palette,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import ChromaForgeIcon from '@/components/brand/ChromaForgeIcon';
import styles from './Sidebar.module.scss';

interface SidebarItem {
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
}

const sidebarItems: readonly SidebarItem[] = [
  { label: 'Panel', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Cuestionario', href: '/quiz', icon: Sparkles },
  { label: 'Marcas', href: '/brands', icon: Palette },
  { label: 'Mi perfil', href: '/profile', icon: UserRound },
] as const;

interface SidebarProps {
  /** `true` while the mobile drawer is open. Ignored on desktop, where the rail is always visible. */
  readonly open: boolean;
  /** Closes the mobile drawer (navigation, overlay press, Escape). */
  readonly onClose: () => void;
}

/**
 * Workspace sidebar — the authenticated rail.
 *
 * A fixed drawer on mobile (off-canvas, overlay + Escape dismissal, focus
 * moved in on open and restored on close) that becomes a permanent sticky
 * rail beside the content on desktop. Closed state hides through
 * `visibility` so nothing focusable or announced lingers off-canvas.
 *
 * @param {SidebarProps} props Drawer visibility and close handler.
 * @returns {JSX.Element} The sidebar rail and its mobile overlay.
 */
export default function Sidebar({ open, onClose }: SidebarProps) {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [open ]);

  useEffect(() => {
    if (open) return;
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, [open ]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open ]);

  return (
    <>
      {open && (
        <div className={styles.overlay} aria-hidden="true" onClick={onClose} />
      )}
      <aside
        ref={panelRef}
        id="workspace-sidebar"
        className={clsx(styles.sidebar, open && styles.open)}
        aria-label="Navegación del espacio de trabajo"
      >
        <Link
          to="/dashboard"
          className={styles.brand}
          aria-label="ChromaForge, ir al panel"
          onClick={onClose}
        >
          <ChromaForgeIcon size={36} className={styles.brandMark} />
          <span className={styles.brandName}>ChromaForge</span>
        </Link>

        <nav className={styles.nav} aria-label="Secciones del espacio de trabajo">
          <ul className={styles.list}>
            {sidebarItems.map((item) => (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    clsx(styles.link, isActive && styles.linkActive)
                  }
                  onClick={onClose}
                >
                  <item.icon size={18} aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sideFooter}>
          <Link to="/docs" className={styles.docsLink} onClick={onClose}>
            <BookOpen size={16} aria-hidden="true" />
            Documentación
          </Link>
        </div>
      </aside>
    </>
  );
}
