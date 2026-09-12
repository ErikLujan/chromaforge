import { useEffect, useState } from 'react';

/**
 * StrictMode-safe, state-driven entrance trigger.
 *
 * Returns `false` on the very first render, then flips to `true` after two
 * animation frames have been painted, guaranteeing the browser committed and
 * painted the hidden start frame before the class toggles so CSS transitions
 * always ramp from the hidden state. Pass `resetKey` to re-arm the entrance
 * when that key changes; the hook returns to hidden in the same render as the
 * keyed content swap and re-runs the double-rAF sequence against the new DOM.
 * The consuming component owns its transition in SCSS (opacity and translate
 * only); this hook only answers whether the entrance may play now.
 *
 * @param delayMs - Optional additional delay before the entrance plays.
 * @param resetKey - Optional key; when it changes, the entrance replays.
 * @returns True once the entrance may play (after the hidden frame painted).
 */
export function useEntrance(delayMs = 0, resetKey?: unknown): boolean {
  const [visible, setVisible] = useState(false);
  const [lastKey, setLastKey] = useState(resetKey);

  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setVisible(false);
  }

  useEffect(() => {
    let rafPaint = 0;
    let rafPlay = 0;
    let timer: number | undefined;

    rafPaint = requestAnimationFrame(() => {
      rafPlay = requestAnimationFrame(() => {
        if (delayMs > 0) {
          timer = window.setTimeout(() => setVisible(true), delayMs);
        } else {
          setVisible(true);
        }
      });
    });

    return () => {
      cancelAnimationFrame(rafPaint);
      cancelAnimationFrame(rafPlay);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [delayMs, lastKey]);

  return visible;
}
