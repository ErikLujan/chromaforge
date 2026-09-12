import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, X } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import ChromaForgeIcon from '@/components/brand/ChromaForgeIcon';
import { useAuthStore } from '@/store/useAuthStore';
import { useSpotlight } from '@/hooks/useSpotlight';
import styles from './Header.module.scss';

interface NavigationItem {
  readonly label: string;
  readonly href: string;
}

const navigationItems: readonly NavigationItem[] = [
  { label: 'Panel', href: '/dashboard' },
  { label: 'Cuestionario', href: '/quiz' },
  { label: 'Marcas', href: '/brands' },
  { label: 'Documentación', href: '/docs' },
] as const;

/**
 * Derives the avatar fallback initials from a display name (first letters of
 * the first two words) or, failing that, from the email's local part.
 *
 * @param {string} name The user's display name.
 * @param {string} email The user's email address.
 * @returns {string} At most two uppercase letters.
 */
function getInitials(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean).slice(0, 2);
    const initials = parts
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
    if (initials) return initials;
  }
  const local = email.split('@')[0] ?? '';
  return (local.slice(0, 2) || '?').toUpperCase();
}

interface AvatarDropdownProps {
  readonly name: string;
  readonly email: string;
  readonly avatarUrl: string | null;
  readonly onSignOut: () => void;
}

/**
 * Desktop avatar trigger with an elevated dropdown menu: identity header,
 * divider, profile link and sign-out. Closes on outside click, Escape, and
 * route change; keyboard focus moves into the menu on open and back to the
 * trigger on close.
 *
 * @returns {JSX.Element} The avatar button and its dropdown.
 */
function AvatarDropdown({ name, email, avatarUrl, onSignOut }: AvatarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);

  const initials = getInitials(name, email);

  const close = useCallback(() => setIsOpen(false), []);

  const handleSignOut = useCallback(() => {
    close();
    onSignOut();
  }, [close, onSignOut]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        close();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen) {
      firstItemRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={styles.userMenu}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.avatarButton}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Menú de usuario de ${name}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.avatar}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className={styles.avatarImage} />
          ) : (
            <span className={styles.avatarInitials}>{initials}</span>
          )}
        </span>
        <ChevronDown
          size={15}
          className={clsx(styles.avatarChevron, isOpen && styles.avatarChevronOpen)}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="menu" aria-label="Menú de usuario">
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownName}>{name}</span>
            <span className={styles.dropdownEmail}>{email}</span>
          </div>
          <div className={styles.dropdownDivider} aria-hidden="true" />
          <Link
            ref={firstItemRef}
            to="/profile"
            role="menuitem"
            className={styles.dropdownItem}
            onClick={close}
          >
            <User size={16} aria-hidden="true" />
            Mi Perfil
          </Link>
          <button
            type="button"
            role="menuitem"
            className={clsx(styles.dropdownItem, styles.dropdownItemDanger)}
            onClick={handleSignOut}
          >
            <LogOut size={16} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Application header — a classic, edge-to-edge, full-width premium navigation
 * bar with a strictly fixed height. The bar sits in normal document flow
 * (`position: sticky; top: 0`) so page content starts cleanly beneath it with
 * no clearance hacks.
 *
 * It carries responsive desktop navigation, an animated mobile drawer, and
 * auth-aware actions: sign-in CTAs when signed out, an avatar dropdown
 * (desktop) or account panel (mobile drawer) when signed in.
 *
 * The mobile overlay and drawer are rendered through a portal into
 * `document.body` so no header stacking context can misplace them.
 *
 * @returns {JSX.Element} The rendered header with mobile drawer.
 */
export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const displayName =
    (user?.user_metadata?.name as string | undefined)?.trim() || user?.email?.split('@')[0] || '';
  const email = user?.email ?? '';
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;

  /**
   * Toggles the mobile navigation drawer between open and closed states.
   * Captures the element that triggered the toggle for focus restoration.
   *
   * @returns {void}
   */
  const toggleMobileMenu = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsMobileMenuOpen((isOpen) => !isOpen);
  }, []);

  /**
   * Closes the mobile navigation drawer and returns focus
   * to the element that originally opened it.
   *
   * @returns {void}
   */
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  /**
   * Signs the current user out, notifies them, and returns to the auth page
   * so a signed-out visitor lands on the login surface instead of the public
   * landing page. The store flips `user` to `null`, which swaps the header
   * actions back to the sign-in CTAs.
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
    } finally {
      closeMobileMenu();
    }
  }, [signOut, navigate, closeMobileMenu]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen) return;

    const timer = setTimeout(() => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }, 300);

    return () => clearTimeout(timer);
  }, [isMobileMenuOpen]);

  const hamburgerClass = clsx(styles.hamburger, isMobileMenuOpen && styles.hamburgerOpen);
  const drawerClass = clsx(styles.drawer, isMobileMenuOpen && styles.drawerOpen);

  const handleSpotlight = useSpotlight<HTMLAnchorElement>();

  return (
    <header role="banner" className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.brand} aria-label="Inicio de ChromaForge">
          <span className={styles.brandMark} aria-hidden="true">
            <ChromaForgeIcon size={40} className={styles.brandMarkIcon} />
          </span>
          <span className={styles.brandName}>ChromaForge</span>
        </Link>

        <nav className={styles.navigation} aria-label="Navegación principal">
          {navigationItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                clsx(styles.navLink, isActive && styles.navLinkActive)
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          {isLoading ? (
            <span className={styles.actionPlaceholder} aria-hidden="true" />
          ) : user ? (
            <AvatarDropdown
              name={displayName}
              email={email}
              avatarUrl={avatarUrl}
              onSignOut={() => void handleSignOut()}
            />
          ) : (
            <>
              <Link to="/auth" className={styles.actionButton}>
                Iniciar sesión
              </Link>
              <Link
                to="/auth"
                className={clsx(styles.actionButton, styles.actionButtonPrimary)}
                onPointerMove={handleSpotlight}
              >
                Comenzar
              </Link>
            </>
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className={hamburgerClass}
          aria-label={
            isMobileMenuOpen
              ? 'Cerrar menú de navegación'
              : 'Abrir menú de navegación'
          }
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={toggleMobileMenu}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {createPortal(
        <>
          {isMobileMenuOpen && (
            <div
              className={styles.overlay}
              aria-hidden="true"
              onClick={closeMobileMenu}
            />
          )}

          <aside
            id="mobile-navigation"
            className={drawerClass}
            aria-label="Navegación móvil"
            inert={!isMobileMenuOpen}
          >
            <div className={styles.drawerHeader}>
              <Link
                to="/"
                className={styles.brand}
                aria-label="Inicio de ChromaForge"
                onClick={closeMobileMenu}
              >
                <span className={styles.brandMark} aria-hidden="true">
                  <ChromaForgeIcon size={40} className={styles.brandMarkIcon} />
                </span>
                <span className={styles.brandName}>ChromaForge</span>
              </Link>
              <button
                type="button"
                className={styles.drawerClose}
                aria-label="Cerrar menú de navegación"
                onClick={closeMobileMenu}
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <nav
              className={styles.drawerNav}
              aria-label="Enlaces de navegación móvil"
            >
              {navigationItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    clsx(styles.drawerLink, isActive && styles.drawerLinkActive)
                  }
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className={styles.drawerFooter}>
              {user ? (
                <div className={styles.drawerUser}>
                  <span className={styles.avatar}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className={styles.avatarImage} />
                    ) : (
                      <span className={styles.avatarInitials}>
                        {getInitials(displayName, email)}
                      </span>
                    )}
                  </span>
                  <div className={styles.drawerUserMeta}>
                    <span className={styles.drawerUserName}>{displayName}</span>
                    <span className={styles.drawerUserEmail}>{email}</span>
                  </div>
                </div>
              ) : null}

              {user ? (
                <>
                  <Link
                    to="/profile"
                    className={styles.drawerActionButton}
                    onClick={closeMobileMenu}
                  >
                    <User size={16} aria-hidden="true" />
                    Mi Perfil
                  </Link>
                  <button
                    type="button"
                    className={clsx(
                      styles.drawerActionButton,
                      styles.drawerActionButtonPrimary,
                    )}
                    onClick={() => void handleSignOut()}
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className={styles.drawerActionButton}
                    onClick={closeMobileMenu}
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    to="/auth"
                    className={clsx(
                      styles.drawerActionButton,
                      styles.drawerActionButtonPrimary,
                    )}
                    onClick={closeMobileMenu}
                    onPointerMove={handleSpotlight}
                  >
                    Comenzar
                  </Link>
                </>
              )}
            </div>
          </aside>
        </>,
        document.body,
      )}
    </header>
  );
}