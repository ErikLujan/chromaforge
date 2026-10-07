import { useEffect, useRef, useState } from 'react';
import { useMotionStore } from '@/store/useMotionStore';
import { isSplashDone, onSplashDone } from '@/utils/splashSignal';

/**
 * Options for the scroll-reveal trigger.
 */
interface RevealOptions {
  /**
   * Hold the observer until the boot splash leaves the DOM. The splash veil
   * covers the first viewport for ~3.45s while in-view content already
   * intersects, so an observer armed on mount fires behind the veil and the
   * once-only entrance never replays visibly. Only the hero needs this —
   * below-fold sections cannot intersect before the veil lifts (scroll is
   * locked) and late mounts resolve immediately via the latched signal.
   */
  readonly afterSplash?: boolean;
}

/**
 * Scroll-reveal trigger (fade + rise, played once per arming).
 *
 * Returns a ref to attach to the revealed block and a flag that flips the
 * first time the block enters the viewport. The consuming component owns its
 * transition in SCSS (opacity and translate only, staggered children via
 * `transition-delay`); this hook only answers whether the reveal may play.
 * Visitors with reduced motion start revealed, and environments without
 * `IntersectionObserver` reveal immediately, so content is never trapped
 * hidden.
 *
 * The flag re-arms when the manual motion override flips: forcing full
 * motion re-hides unplayed scopes so the entrances actually play (in-view
 * scopes re-intersect immediately; below-fold scopes play on scroll), while
 * forcing reduced motion reveals everything instantly. Without the re-arm,
 * a visitor arriving under reduced motion would latch every scope revealed
 * and the toggle to full would visibly do nothing.
 *
 * @param {RevealOptions} [options] Reveal configuration.
 * @returns {{ ref: React.RefObject<T | null>, revealed: boolean }} The host
 * ref and whether the reveal may play.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(
  options?: RevealOptions,
): {
  ref: React.RefObject<T | null>;
  revealed: boolean;
} {
  const afterSplash = options?.afterSplash ?? false;
  const ref = useRef<T | null>(null);
  const storeReduced = useMotionStore((state) => state.reduced);
  const [revealed, setRevealed] = useState<boolean>(() => {
    try {
      if (typeof IntersectionObserver === 'undefined') return true;
      if (storeReduced) return true;
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  });

  // WHY: splash gate — the observer must not exist while the boot veil
  // covers the viewport, or the once-only reveal spends itself unseen.
  // Reduced-motion and late mounts skip the wait (already revealed / latched).
  const [gateOpen, setGateOpen] = useState<boolean>(() => !afterSplash || isSplashDone());

  useEffect(() => {
    if (gateOpen) return undefined;
    return onSplashDone(() => setGateOpen(true));
  }, [gateOpen]);

  const [lastReduced, setLastReduced] = useState(storeReduced);
  if (storeReduced !== lastReduced) {
    setLastReduced(storeReduced);
    setRevealed(storeReduced);
  }

  useEffect(() => {
    if (revealed || !gateOpen) return;
    const target = ref.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [revealed, gateOpen]);

  return { ref, revealed };
}
