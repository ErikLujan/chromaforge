import { useEffect, useState } from 'react';
import clsx from 'clsx';
import ChromaForgeIcon from '@/components/brand/ChromaForgeIcon';
import styles from './SplashScreen.module.scss';

/**
 * ChromaForge splash screen — ultra-minimalist boot veil.
 *
 * Plays once per document load (every first visit and hard reload, never on
 * internal router navigation): pure obsidian ground, a living brand mark at
 * center, and a fluid simulated progress fill as the only meter. The
 * component mounts at the app root outside the router, so it renders the veil
 * synchronously on every document load with no storage reads or effect
 * gating, and the fully opaque first paint doubles as a FOUC guard.
 *
 * Timing: fully visible for 3s, then a 450ms exit begins and the component
 * leaves the DOM right after. The sequence runs unconditionally for every
 * render with no reduced-motion gating: this one-time brand veil playing its
 * full choreography reads as boot, while a parked veil would read as a flash.
 * This exception covers the splash veil only.
 *
 * The scroll lock lives in its own effect keyed on the gone state rather
 * than inside the sequence effect, because the component stays mounted at the
 * app root after rendering null: only the separate effect's cleanup restores
 * body overflow exactly when the veil disappears.
 */

const EXIT_START_MS = 3000;
const EXIT_MS = 450;
const GONE_MS = EXIT_START_MS + EXIT_MS;

/**
 * Renders the one-shot boot veil.
 *
 * @returns {JSX.Element | null} The veil, or null once it has played.
 */
export default function SplashScreen() {
  const [visible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const exitTimer = window.setTimeout(() => setExiting(true), EXIT_START_MS);
    const goneTimer = window.setTimeout(() => setGone(true), GONE_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(goneTimer);
    };
  }, [visible]);

  useEffect(() => {
    if (gone) return undefined;

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
  }, [gone]);

  if (!visible || gone) return null;

  return (
    <div
      className={clsx(styles.splash, exiting && styles.splashExit)}
      aria-hidden="true"
      data-testid="splash-screen"
    >
      <div className={styles.markWrap} aria-hidden="true">
        <ChromaForgeIcon size={72} className={styles.mark} />
      </div>
      <div className={styles.trace} aria-hidden="true">
        <div className={styles.traceFill} />
      </div>
    </div>
  );
}
