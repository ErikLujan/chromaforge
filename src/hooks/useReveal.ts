import { useEffect, useRef, useState } from 'react';
import { useMotionStore } from '@/store/useMotionStore';

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
 * @returns {{ ref: React.RefObject<T | null>, revealed: boolean }} The host
 * ref and whether the reveal may play.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(): {
  ref: React.RefObject<T | null>;
  revealed: boolean;
} {
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

  const [lastReduced, setLastReduced] = useState(storeReduced);
  if (storeReduced !== lastReduced) {
    setLastReduced(storeReduced);
    setRevealed(storeReduced);
  }

  useEffect(() => {
    if (revealed) return;
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
  }, [revealed]);

  return { ref, revealed };
}
