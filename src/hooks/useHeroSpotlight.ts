import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useMotionStore } from '@/store/useMotionStore';

/**
 * Hero cursor spotlight — rAF-throttled, transform/opacity only.
 *
 * Drives the hero `.spot` wash (a 260px-radius platinum glow) toward the
 * cursor with light interpolation. All writes land on the spot element
 * itself (`transform` plus `--mx`/`--my` for its own gradient origin), so no
 * parent-to-child style recalc fans out. The loop runs only while the
 * pointer is inside the hero and settles to rest on leave; opacity fades
 * through CSS. Fine pointers with full motion only — touch, reduced motion,
 * and the MotionToggle-off state leave the spot parked at opacity 0 while
 * the static dot grid and wash stay visible.
 *
 * @param {RefObject<HTMLElement | null>} sectionRef Host hero section.
 * @returns {RefObject<HTMLDivElement | null>} Ref to attach to the spot layer.
 */
export function useHeroSpotlight(
  sectionRef: RefObject<HTMLElement | null>,
): RefObject<HTMLDivElement | null> {
  const spotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const spot = spotRef.current;
    if (!section || !spot) return;

    let finePointer: boolean;
    try {
      finePointer = window.matchMedia('(pointer: fine)').matches;
    } catch {
      finePointer = false;
    }
    if (!finePointer) return;
    if (useMotionStore.getState().reduced) return;

    const HALF = 260;
    const LERP = 0.18;
    let raf = 0;
    let inside = false;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const frame = () => {
      raf = 0;
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;
      const settled =
        Math.abs(targetX - currentX) < 0.4 && Math.abs(targetY - currentY) < 0.4;
      spot.style.setProperty('--mx', `${Math.round(currentX)}px`);
      spot.style.setProperty('--my', `${Math.round(currentY)}px`);
      spot.style.transform = `translate3d(${(currentX - HALF).toFixed(1)}px, ${(currentY - HALF).toFixed(1)}px, 0)`;
      if (!inside && settled) return;
      raf = requestAnimationFrame(frame);
    };

    const ensure = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
      if (!inside) {
        inside = true;
        currentX = targetX;
        currentY = targetY;
        spot.style.opacity = '1';
      }
      ensure();
    };

    const onPointerLeave = () => {
      inside = false;
      spot.style.opacity = '0';
      ensure();
    };

    const unsubscribe = useMotionStore.subscribe((state) => {
      if (!state.reduced) return;
      inside = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      spot.style.opacity = '0';
    });

    section.addEventListener('pointermove', onPointerMove, { passive: true });
    section.addEventListener('pointerleave', onPointerLeave);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      unsubscribe();
      section.removeEventListener('pointermove', onPointerMove);
      section.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [sectionRef]);

  return spotRef;
}
