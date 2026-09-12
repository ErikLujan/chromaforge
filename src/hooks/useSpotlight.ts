import { useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

/**
 * Shared pointer tracker for spotlight CTA interactions.
 *
 * Writes the cursor position into `--spot-x` / `--spot-y` custom properties
 * on the hovered element. The reveals themselves are opacity-only
 * pseudo-element fades in SCSS, so each pointermove costs a single style
 * write and zero React re-renders. Single source of truth for every
 * spotlight surface: Home hero CTAs, navbar primary CTA, auth submit
 * buttons, and dashboard primary actions.
 *
 * @returns {(event: ReactMouseEvent<T>) => void} Handler to attach to `onPointerMove`.
 */
export function useSpotlight<T extends HTMLElement>(): (event: ReactMouseEvent<T>) => void {
  return useCallback((event: ReactMouseEvent<T>) => {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--spot-x', `${x.toFixed(1)}%`);
    el.style.setProperty('--spot-y', `${y.toFixed(1)}%`);
  }, []);
}
