import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Motion Store — manual animation override with persisted-first seeding.
 *
 * `reduced` starts from the persisted manual choice when one exists and
 * falls back to the visitor's `prefers-reduced-motion` setting otherwise;
 * it flips only through the MotionToggle, whose choice persists across
 * reloads under `chromaforge-motion`. Seeding synchronously from storage
 * matters because zustand's rehydration lands in a microtask — first paint,
 * the module-level attribute sync, and every `useState` initializer would
 * otherwise consume the OS value and flash the wrong mode before the
 * persisted choice arrives. Every change mirrors to
 * `document.documentElement[data-motion]`, which the `reduced-motion` SCSS
 * mixin and the AuroraField canvas read as the authoritative override —
 * so the toggle freezes and releases motion in real time.
 */

interface MotionState {
  /** `true` while non-essential motion stays disabled. */
  readonly reduced: boolean;
  /**
   * Sets the override explicitly.
   *
   * @param {boolean} reduced Whether motion stays disabled.
   * @returns {void}
   */
  setReduced: (reduced: boolean) => void;
  /**
   * Flips the override.
   *
   * @returns {void}
   */
  toggleReduced: () => void;
}

/** Storage key shared with the `persist` middleware below. */
const STORAGE_KEY = 'chromaforge-motion';

/**
 * Reads the persisted manual choice synchronously, ahead of rehydration.
 *
 * Mirrors zustand's `{ state, version }` envelope defensively: anything
 * unparseable, missing, or non-boolean falls through to `null` so the OS
 * preference decides, exactly as before.
 *
 * @returns {boolean | null} The persisted choice, or `null` when absent.
 */
function readStoredReduced(): boolean | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { reduced?: unknown } | null };
    const stored = parsed?.state?.reduced;
    return typeof stored === 'boolean' ? stored : null;
  } catch {
    return null;
  }
}

/** Reads the OS preference as the pre-choice default. */
function readOsReduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Seeds the override: persisted manual choice first, OS preference second.
 * The persisted choice permanently outranks the OS setting across reloads.
 *
 * @returns {boolean} The initial override value.
 */
function readInitialReduced(): boolean {
  return readStoredReduced() ?? readOsReduced();
}

/**
 * Mirrors the override onto the document element for SCSS and canvas.
 *
 * @param {boolean} reduced Whether motion stays disabled.
 * @returns {void}
 */
function syncMotionAttribute(reduced: boolean): void {
  try {
    document.documentElement.setAttribute('data-motion', reduced ? 'reduced' : 'full');
  } catch {
    /* Non-DOM environment — the SCSS media-query fallback still applies. */
  }
}

export const useMotionStore = create<MotionState>()(
  persist(
    (set, get) => ({
      reduced: readInitialReduced(),
      setReduced: (reduced) => set({ reduced }),
      toggleReduced: () => set({ reduced: !get().reduced }),
    }),
    { name: STORAGE_KEY },
  ),
);

syncMotionAttribute(useMotionStore.getState().reduced);
useMotionStore.subscribe((state) => syncMotionAttribute(state.reduced));
