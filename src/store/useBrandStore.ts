import { create } from 'zustand';
import { toast } from 'sonner';
import type { Json } from '@/types/supabase.types';
import { supabase } from '@/services/supabase.client';
import { useAuthStore } from '@/store/useAuthStore';
import {
  generateBrandIdentity as buildBrandIdentity,
  generateBrandPalette as buildBrandPalette,
} from '@/utils/color.utils';
import type { BrandPalette } from '@/utils/color.utils';
import type { QuizAnswer } from '@/data/quizDictionary';
import { sanitizeText } from '@/utils/sanitization.utils';

/**
 * Brand Store — Zustand domain store for the generated palette lifecycle and
 * the visitor's saved identities (`user_palettes` via Supabase).
 *
 * State stays deliberately small and atomic so a component subscribing to one
 * field never re-renders on unrelated changes. Palette computation lives in
 * the pure `color.utils` engine; the store only orchestrates it.
 *
 * Generation simulates a short bounded delay so the workspace loading state
 * stays observable until the backend pipeline lands. Reads and writes target
 * `user_palettes`, whose RLS policies scope every row to its owner; the store
 * reads the session via `useAuthStore` only to learn the current owner and
 * keeps an explicit `user_id` filter as defense-in-depth against a policy
 * regression.
 */

/** A saved brand identity — one row of the `user_palettes` table. */
export interface SavedBrand {
  readonly id: string;
  readonly name: string;
  /** The brand's hex colors in system order. */
  readonly colors: readonly string[];
  /** Questionnaire answers captured at generation time, if any. */
  readonly quiz_answers?: Json | null;
  /** ISO creation timestamp, or `null` when the row predates one. */
  readonly created_at: string | null;
}

/** Payload accepted by `saveBrand`. */
export interface SaveBrandInput {
  readonly name: string;
  readonly colors: readonly string[];
  readonly quiz_answers?: Json | null;
}

interface BrandState {
  /** The currently active generated palette, or `null` before any generation. */
  activePalette: BrandPalette | null;
  /** `true` while a generation pass is in flight. */
  isGenerating: boolean;
  /** The visitor's saved identities, most recent first. */
  savedBrands: SavedBrand[];
  /** `true` while the saved identities are being fetched. */
  isFetchingBrands: boolean;
  /** A short Spanish message describing the last data-layer failure. */
  brandsError: string | null;
  /**
   * `true` once the currently active palette has been persisted to the
   * visitor's library. Reset on every new generation or workspace clear so
   * the Results Workspace can distinguish "Guardado" from "requiere guardar".
   */
  isActivePaletteSaved: boolean;
  /**
   * Loads the signed-in visitor's saved identities into `savedBrands`.
   * Quietly no-ops when no session exists (the Dashboard guards this).
   * Failures are logged and surfaced as a recoverable message.
   *
   * @returns {Promise<void>} Resolves once the fetch settles.
   */
  fetchSavedBrands: () => Promise<void>;
  /**
   * Persists a new brand identity to `user_palettes` and prepends the stored
   * row to `savedBrands`. The free-text name is sanitized at this
   * data-access boundary so no executable markup reaches the row or a future
   * rendering context. Exact PostgREST/RLS failures are logged for diagnosis.
   *
   * @param {SaveBrandInput} input The identity to save.
   * @returns {Promise<SavedBrand | null>} The stored row, or `null` on failure.
   */
  saveBrand: (input: SaveBrandInput) => Promise<SavedBrand | null>;
  /**
   * Deletes a saved identity from `user_palettes` and removes it from
   * `savedBrands` immediately (optimistic update). On rejection the row is
   * restored at its original index and the failure is logged and surfaced
   * with an error toast, so the UI never drifts from the database.
   *
   * @param {string} id The `user_palettes` row id to delete.
   * @returns {Promise<boolean>} `true` when the row was deleted.
   */
  deleteBrand: (id: string) => Promise<boolean>;
  /**
   * Generates a brand palette and publishes it as the active palette.
   * Simulates the generation latency until the backend pipeline exists.
   *
   * When the questionnaire answers are provided, the full multi-dimensional
   * engine runs — the aggregated directive (base hue, hue shift, saturation
   * score, lightness score, harmony vote) drives chroma, surface family and
   * harmony geometry. Without them, the seed alone forges through the same
   * engine with a neutral dark/analogous directive. The seed is always the
   * deterministic color derived from the answers — never a hardcoded
   * fallback.
   *
   * @param {string} baseColor The seed color in any CSS format.
   * @param {readonly QuizAnswer[]} [answers] The questionnaire payload.
   * @returns {Promise<void>} Resolves once the palette is published.
   */
  generateBrandPalette: (
    baseColor: string,
    answers?: readonly QuizAnswer[],
  ) => Promise<void>;
  /**
   * Clears the unsaved active palette, returning the workspace to the
   * Dashboard. Only generation state is reset — saved identities are never
   * touched.
   */
  clearActivePalette: () => void;
  /**
   * Opens a saved identity in the Results Workspace by rehydrating its
   * role-ordered colors into a `BrandPalette` — the exact inverse of the
   * save pipeline. No regeneration happens and nothing is written: the row
   * already lives in `user_palettes`, so `isActivePaletteSaved` flips true.
   *
   * @param {string} id The `user_palettes` row id to open.
   * @returns {boolean} `true` when a saved identity was found and published.
   */
  openSavedBrand: (id: string) => boolean;
}

const initialState = {
  activePalette: null as BrandPalette | null,
  isGenerating: false,
  savedBrands: [] as SavedBrand[],
  isFetchingBrands: false,
  brandsError: null as string | null,
  isActivePaletteSaved: false,
};

/** Simulated generation latency so the loading state remains observable. */
const GENERATION_DELAY_MS = 700;

export const useBrandStore = create<BrandState>()((set) => ({
  ...initialState,

  generateBrandPalette: async (baseColor, answers) => {
    set({ isGenerating: true, isActivePaletteSaved: false });

    try {
      await new Promise((resolve) => setTimeout(resolve, GENERATION_DELAY_MS));
      const palette =
        answers && answers.length > 0
          ? buildBrandIdentity(answers)
          : buildBrandPalette(baseColor);
      set({ activePalette: palette, isGenerating: false });
    } catch {
      set({ isGenerating: false });
    }
  },

  clearActivePalette: () =>
    set({ activePalette: null, isGenerating: false, isActivePaletteSaved: false }),

  openSavedBrand: (id) => {
    const brand = useBrandStore.getState().savedBrands.find((row) => row.id === id);
    if (!brand) return false;

    const [primary, secondary, accent, background, surface] = brand.colors;
    set({
      activePalette: { primary, secondary, accent, background, surface },
      isGenerating: false,
      isActivePaletteSaved: true,
    });
    return true;
  },

  fetchSavedBrands: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ isFetchingBrands: true });

    try {
      const { data, error } = await supabase
        .from('user_palettes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ savedBrands: data, isFetchingBrands: false, brandsError: null });
    } catch (error) {
      console.error('Supabase Fetch Error:', error);
      set({ isFetchingBrands: false, brandsError: 'No se pudieron cargar tus identidades.' });
    }
  },

  saveBrand: async (input) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('Supabase Save Error: no hay una sesión de usuario activa.');
      set({ brandsError: 'Inicia sesión para guardar tu identidad.' });
      return null;
    }

    const { data, error } = await supabase
      .from('user_palettes')
      .insert({
        user_id: user.id,
        name: sanitizeText(input.name),
        colors: [...input.colors],
        quiz_answers: input.quiz_answers ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Supabase Save Error:', error);
      set({ brandsError: 'No se pudo guardar la identidad.' });
      return null;
    }

    set((state) => ({
      savedBrands: [data, ...state.savedBrands],
      brandsError: null,
      isActivePaletteSaved: true,
    }));

    return data;
  },

  deleteBrand: async (id) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.error('Supabase Delete Error: no hay una sesión de usuario activa.');
      set({ brandsError: 'Inicia sesión para eliminar tu identidad.' });
      toast.error('Inicia sesión para eliminar tu identidad.');
      return false;
    }

    const index = useBrandStore.getState().savedBrands.findIndex((brand) => brand.id === id);
    const target = index >= 0 ? useBrandStore.getState().savedBrands[index] : null;
    set((state) => ({
      savedBrands: state.savedBrands.filter((brand) => brand.id !== id),
    }));

    const { error } = await supabase
      .from('user_palettes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase Delete Error:', error);
      set({ brandsError: 'No se pudo eliminar la identidad.' });

      if (target) {
        set((state) => {
          const restored = [...state.savedBrands];
          restored.splice(Math.min(index, restored.length), 0, target);
          return { savedBrands: restored };
        });
      }

      toast.error('No se pudo eliminar la identidad.');
      return false;
    }

    set({ brandsError: null });
    toast.success('Identidad eliminada de tu biblioteca.');
    return true;
  },
}));