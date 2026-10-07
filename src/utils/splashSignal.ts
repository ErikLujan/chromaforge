/**
 * Splash-done signal — lets reveal timing wait out the boot veil.
 *
 * The splash veil covers the viewport for ~3.45s per document load while the
 * hero is already intersecting, so a scroll observer armed on mount fires
 * behind the veil and the single-shot entrance never replays. `SplashScreen`
 * calls `markSplashDone` as its veil leaves the DOM; `useReveal` with
 * `afterSplash` holds its observer until then. Late subscribers (client-side
 * navigation back to `/` long after boot) resolve immediately via the
 * latched flag. No React, no deps — a tiny pub/sub by design.
 */

let done = false;
const pending = new Set<() => void>();

/**
 * Latches the splash as finished and releases queued waiters.
 *
 * Idempotent: StrictMode remounts and repeated calls collapse into the
 * first mark.
 *
 * @returns {void}
 */
export function markSplashDone(): void {
  if (done) return;
  done = true;
  pending.forEach((notify) => notify());
  pending.clear();
}

/**
 * Reports whether the boot splash has left the DOM.
 *
 * @returns {boolean} `true` once `markSplashDone` has run.
 */
export function isSplashDone(): boolean {
  return done;
}

/**
 * Runs `notify` once the splash is done — immediately if already latched.
 *
 * @param {() => void} notify Callback released on splash-done.
 * @returns {() => void} Unsubscriber for effect cleanup.
 */
export function onSplashDone(notify: () => void): () => void {
  if (done) {
    notify();
    return () => undefined;
  }
  pending.add(notify);
  return () => {
    pending.delete(notify);
  };
}
