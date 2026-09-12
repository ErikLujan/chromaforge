import { useCallback, useEffect, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Palette, Sparkles, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import PaletteCard from '@/components/dashboard/PaletteCard';
import Modal from '@/components/ui/Modal';
import AsyncButton from '@/components/ui/AsyncButton';
import DeepBrandPreview from '@/components/results/DeepBrandPreview';
import { useAuthStore } from '@/store/useAuthStore';
import { useBrandStore } from '@/store/useBrandStore';
import type { SavedBrand } from '@/store/useBrandStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEntrance } from '@/hooks/useEntrance';
import { useSpotlight } from '@/hooks/useSpotlight';
import styles from './Brands.module.scss';

/**
 * Brands — ChromaForge brand library (`/brands`).
 *
 * The visitor's repository of saved visual identities as a calm glass card
 * grid, one card per `user_palettes` row. Cards open a deep preview modal
 * with the full brand system; the per-card trash trigger opens a
 * confirmation dialog and only the confirmed action deletes through the brand
 * store. Loading, error, empty, and data states are first-class surfaces
 * mirroring the dashboard.
 */

const monthDayFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
});

/** Formats an ISO timestamp as a short Spanish date ("12 ago"). */
function formatMonthDay(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return monthDayFormatter.format(date).replace(/\.$/, '');
}

/** Skeleton cards mirror the loaded grid so the state swap never jumps. */
const SKELETON_COUNT = 6;

/**
 * ChromaForge Brands page.
 *
 * Renders the visitor's saved identities as a responsive glass card grid:
 * one column on mobile, two on tablet, three on desktop and four on wide
 * screens. Cards open the full brand-system preview modal and expose a
 * per-card delete trigger that resolves through a confirmation dialog.
 * Empty and error states are first-class glass panels.
 *
 * @returns {JSX.Element} The rendered brand library page.
 */
export default function Brands() {
  useDocumentTitle('Marcas');

  const navigate = useNavigate();

  const [previewBrand, setPreviewBrand] = useState<SavedBrand | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<SavedBrand | null>(null);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set());

  const user = useAuthStore((state) => state.user);

  const savedBrands = useBrandStore((state) => state.savedBrands);
  const isFetchingBrands = useBrandStore((state) => state.isFetchingBrands);
  const brandsError = useBrandStore((state) => state.brandsError);
  const fetchSavedBrands = useBrandStore((state) => state.fetchSavedBrands);
  const deleteBrand = useBrandStore((state) => state.deleteBrand);

  useEffect(() => {
    if (user) void fetchSavedBrands();
  }, [user, fetchSavedBrands]);

  const headerEntered = useEntrance();
  const bodyState =
    isFetchingBrands && savedBrands.length === 0
      ? 'skeleton'
      : brandsError && savedBrands.length === 0
        ? 'error'
        : savedBrands.length === 0
          ? 'empty'
          : 'data';

  const handleSpotlight = useSpotlight<HTMLButtonElement>();
  const bodyEntered = useEntrance(0, bodyState);

  const openPreview = (brand: SavedBrand) => setPreviewBrand(brand);
  const closePreview = () => setPreviewBrand(null);

  /** Starts the brand intake through the questionnaire's palette pipeline.
   *
   * @returns {void}
   */
  const startQuiz = () => navigate('/quiz');

  /**
   * Opens the confirmation dialog for a saved identity. The click never
   * bubbles to the card (the card itself opens the preview); nothing is
   * deleted at this point.
   *
   * @param {ReactMouseEvent<HTMLButtonElement>} event The delete trigger event.
   * @param {SavedBrand} brand The identity flagged for deletion.
   * @returns {void}
   */
  const requestDelete = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, brand: SavedBrand) => {
      event.stopPropagation();
      setBrandToDelete(brand);
    },
    [],
  );

  /**
   * Dismisses the confirmation dialog without touching the identity.
   *
   * @returns {void}
   */
  const cancelDelete = useCallback(() => {
    setBrandToDelete(null);
  }, []);

  /**
   * Executes the deletion after explicit confirmation. The delete is
   * idempotent per identity (the confirm action stays disabled while in
   * flight), and an open preview of the deleted identity closes with it.
   *
   * @returns {Promise<void>}
   */
  const confirmDelete = useCallback(async () => {
    if (!brandToDelete || deletingIds.has(brandToDelete.id)) return;
    const brand = brandToDelete;

    setDeletingIds((current) => new Set(current).add(brand.id));
    const deleted = await deleteBrand(brand.id);
    setDeletingIds((current) => {
      const next = new Set(current);
      next.delete(brand.id);
      return next;
    });

    if (deleted) {
      setBrandToDelete(null);
      if (previewBrand?.id === brand.id) {
        setPreviewBrand(null);
      }
    }
  }, [brandToDelete, deletingIds, deleteBrand, previewBrand]);

  /**
   * Prevents the card's keyboard trigger (Enter/Space) from firing when the
   * focus is on the delete button — the button handles its own activation.
   *
   * @param {ReactKeyboardEvent<HTMLElement>} event The key down event.
   * @returns {void}
   */
  const stopKeyPropagation = useCallback((event: ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();
  }, []);

  const isDeletingBrand = brandToDelete !== null && deletingIds.has(brandToDelete.id);

  const renderDeleteAction = (brand: SavedBrand) => (
    <button
      type="button"
      className={styles.deleteButton}
      onClick={(event) => requestDelete(event, brand)}
      onKeyDown={stopKeyPropagation}
      aria-label={`Eliminar «${brand.name}» de tu biblioteca`}
      title="Eliminar identidad"
    >
      <Trash2 aria-hidden="true" />
    </button>
  );

  const pageHeader = (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        <span className={clsx(styles.pageEyebrow, headerEntered && styles.entered)}>
          Biblioteca de marcas
        </span>
        <h1 className={clsx(styles.pageTitle, headerEntered && styles.entered)}>
          Tus identidades
        </h1>
        <p className={clsx(styles.pageDescription, headerEntered && styles.entered)}>
          El historial de sistemas cromáticos que has generado y guardado con
          ChromaForge, listos para abrir o eliminar.
        </p>
      </div>

      <button
        type="button"
        className={clsx(styles.primaryAction, headerEntered && styles.entered)}
        onClick={startQuiz}
        onPointerMove={handleSpotlight}
      >
        <Sparkles size={15} aria-hidden="true" />
        Generar identidad
      </button>
    </header>
  );

  const renderLibraryBody = () => {
    if (isFetchingBrands && savedBrands.length === 0) {
      return (
        <div className={styles.grid} role="status" aria-label="Cargando tus identidades">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <PaletteCard key={index} variant="square" title=" " entered={bodyEntered}>
              <span className={styles.skeletonBars} aria-hidden="true">
                <span className={styles.skeletonBar} style={{ width: '72%' }} />
              </span>
            </PaletteCard>
          ))}
        </div>
      );
    }

    if (brandsError && savedBrands.length === 0) {
      return (
        <div className={clsx(styles.statePanel, styles.statePanelError, bodyEntered && styles.entered)} role="alert">
          <span className={styles.stateIcon} aria-hidden="true">
            <AlertTriangle size={22} />
          </span>
          <span className={styles.stateEyebrow}>Error de conexión</span>
          <h2 className={styles.stateTitle}>No se pudieron cargar tus identidades.</h2>
          <p className={styles.stateDescription}>
            Revisa tu conexión y vuelve a intentarlo. Tus identidades guardadas no se han
            perdido.
          </p>
          <button type="button" className={styles.stateAction} onClick={() => void fetchSavedBrands()} onPointerMove={handleSpotlight}>
            Reintentar
          </button>
        </div>
      );
    }

    if (savedBrands.length === 0) {
      return (
        <div className={clsx(styles.statePanel, bodyEntered && styles.entered)} role="status">
          <span className={styles.stateIcon} aria-hidden="true">
            <Palette size={22} />
          </span>
          <span className={styles.stateEyebrow}>Biblioteca de marcas</span>
          <h2 className={styles.stateTitle}>Aún no tienes identidades generadas.</h2>
          <p className={styles.stateDescription}>
            Comienza tu primer cuestionario y ChromaForge creará el sistema cromático de
            tu marca. Todo lo que guardes aparecerá aquí.
          </p>
          <button type="button" className={styles.stateAction} onClick={startQuiz} onPointerMove={handleSpotlight}>
            <Sparkles size={15} aria-hidden="true" />
            Comenzar cuestionario
          </button>
        </div>
      );
    }

    const libraryCount = `${savedBrands.length} ${
      savedBrands.length === 1 ? 'identidad guardada' : 'identidades guardadas'
    }`;

    return (
      <>
        <p className={styles.libraryCount}>
          {libraryCount}
          <span aria-hidden="true">·</span>
          {savedBrands.reduce((total, brand) => total + brand.colors.length, 0)} tonos
        </p>

        <div className={styles.grid}>
          {savedBrands.map((brand) => (
            <PaletteCard
              key={brand.id}
              variant="square"
              eyebrow={`Guardado · ${formatMonthDay(brand.created_at)}`}
              title={brand.name}
              colors={brand.colors}
              footer={`${brand.colors.length} ${brand.colors.length === 1 ? 'tono' : 'tonos'}`}
              interactive
              entered={bodyEntered}
              onClick={() => openPreview(brand)}
              action={renderDeleteAction(brand)}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <section className={styles.brands}>
      <div className={styles.background} aria-hidden="true" />

      <div className={styles.container}>
        {pageHeader}
        {renderLibraryBody()}
      </div>

      <Modal
        open={previewBrand !== null}
        onClose={closePreview}
        title={previewBrand?.name ?? 'Identidad de marca'}
        size="wide"
      >
        {previewBrand ? <DeepBrandPreview brand={previewBrand} /> : null}
      </Modal>

      <Modal
        open={brandToDelete !== null}
        onClose={cancelDelete}
        title="Eliminar identidad"
      >
        {brandToDelete ? (
          <div className={styles.confirm}>
            <span className={styles.confirmIcon} aria-hidden="true">
              <Trash2 size={20} />
            </span>

            <div className={styles.confirmText}>
              <p className={styles.confirmTitle}>¿Eliminar «{brandToDelete.name}»?</p>
              <p className={styles.confirmDescription}>
                ¿Estás seguro de que deseas eliminar esta identidad? Esta acción no se puede
                deshacer.
              </p>
            </div>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={cancelDelete}
                disabled={isDeletingBrand}
              >
                Cancelar
              </button>
              <AsyncButton
                type="button"
                className={styles.confirmDelete}
                label="Eliminar"
                busyLabel="Eliminando…"
                loading={isDeletingBrand}
                icon={<Trash2 size={15} />}
                loaderVariant="light"
                disabled={isDeletingBrand}
                onClick={() => void confirmDelete()}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}