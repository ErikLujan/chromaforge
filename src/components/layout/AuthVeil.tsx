import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './AuthVeil.module.scss';

/**
 * Exit beat of the auth veil, in milliseconds. The veil fades instead of
 * cutting once the layout switch has landed behind it.
 */
const VEIL_EXIT_MS = 420;

type AuthVeilMode = 'login' | 'logout';

interface AuthVeilProps {
  /**
   * Session direction shown on the instrument label. Defaults to the derived
   * session state — a present user means a login just landed, an absent user
   * means a logout just cleared — so callers render `<AuthVeil />` bare.
   */
  readonly mode?: AuthVeilMode;
}

/**
 * AuthVeil — login/logout layout-switch veil. Exclusive to explicit auth
 * transitions; the boot splash owns first paint and never returns.
 *
 * Subscribes only to `isTransitioning`, which the auth store raises solely
 * inside `signIn`/`signOut` — boot restore, silent refresh, route changes
 * and unrelated store writes never raise it, so this veil cannot leak
 * outside login/logout. Non-interactive cover: aria-hidden, no focus moves,
 * single document scroll lock with restore.
 *
 * @param {AuthVeilProps} props Optional explicit session direction.
 * @returns {JSX.Element | null} The veil, or null outside transitions.
 */
export default function AuthVeil({ mode }: AuthVeilProps) {
  const isTransitioning = useAuthStore((state) => state.isTransitioning);
  const user = useAuthStore((state) => state.user);
  const [visible, setVisible] = useState(false);

  // WHY: derived exit avoids a second synchronized state — the veil fades
  // the moment the flag drops while still mounted.
  const leaving = visible && !isTransitioning;

  // WHY: derived from session presence, never stored — login lands with a
  // user, logout clears it, so the label always names the transition in
  // flight without a new source of truth.
  const resolvedMode: AuthVeilMode = mode ?? (user ? 'login' : 'logout');

  useEffect(() => {
    if (!isTransitioning) return undefined;
    const showTimer = window.setTimeout(() => setVisible(true), 0);
    return () => window.clearTimeout(showTimer);
  }, [isTransitioning]);

  useEffect(() => {
    if (!leaving) return undefined;
    const hideTimer = window.setTimeout(() => setVisible(false), VEIL_EXIT_MS);
    return () => window.clearTimeout(hideTimer);
  }, [leaving]);

  useEffect(() => {
    if (!visible) return undefined;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [visible ]);

  if (!visible) return null;

  return (
    <div className={clsx(styles.veil, leaving && styles.veilExit)} aria-hidden="true">
      <div className={styles.lockup} aria-hidden="true">
        <span className={styles.statusRow}>
          <span className={styles.dot} />
          <span className={styles.label}>
            {resolvedMode === 'login' ? 'ABRIENDO SESIÓN' : 'CERRANDO SESIÓN'}
          </span>
        </span>
        <div className={styles.track}>
          <div className={styles.head} />
        </div>
      </div>
    </div>
  );
}
