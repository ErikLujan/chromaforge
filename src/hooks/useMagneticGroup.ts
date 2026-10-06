import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * useMagneticGroup — pointer-tracked magnetic hover for a button group.
 *
 * Attaches two handlers to the group container; delegation via
 * `[data-magnetic]` keeps one listener per group no matter how many buttons
 * it holds. The hovered button gravitates toward the cursor (capped pull),
 * written as `--mx` / `--my` custom properties the CSS composes into
 * `translate` — GPU-only, no re-renders, interruptible by design. Fine
 * pointers only; touch input never engages. Reduced-motion CSS zeroes the
 * composed transform, so the effect degrades to stillness automatically.
 *
 * @returns {{ onPointerMove, onPointerLeave }} Handlers for the container.
 */
const MAGNETIC_STRENGTH = 4;

function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

export function useMagneticGroup<T extends HTMLElement>() {
  const lastRef = useRef<HTMLElement | null>(null);

  const reset = useCallback((target: HTMLElement | null) => {
    if (!target) return;
    target.style.setProperty('--mx', '0px');
    target.style.setProperty('--my', '0px');
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<T>) => {
      if (event.pointerType !== 'mouse') return;
      const node = event.target;
      const hit =
        node instanceof HTMLElement
          ? (node.closest('[data-magnetic]') as HTMLElement | null)
          : null;
      if (lastRef.current && lastRef.current !== hit) reset(lastRef.current);
      lastRef.current = hit;
      if (!hit) return;
      const rect = hit.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      hit.style.setProperty('--mx', `${(clampUnit(nx) * MAGNETIC_STRENGTH).toFixed(2)}px`);
      hit.style.setProperty('--my', `${(clampUnit(ny) * MAGNETIC_STRENGTH).toFixed(2)}px`);
    },
    [reset],
  );

  const onPointerLeave = useCallback(() => {
    reset(lastRef.current);
    lastRef.current = null;
  }, [reset]);

  return { onPointerMove, onPointerLeave };
}
