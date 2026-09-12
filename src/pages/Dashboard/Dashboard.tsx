import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, MousePointerClick, Palette, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import ResultsWorkspace from '@/components/results/ResultsWorkspace';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/store/useAuthStore';
import { useBrandStore } from '@/store/useBrandStore';
import type { SavedBrand } from '@/store/useBrandStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useSpotlight } from '@/hooks/useSpotlight';
import styles from './Dashboard.module.scss';

/**
 * Dashboard — ChromaForge visual workspace (master-detail).
 *
 * A type-specimen ledger: one dense master list and a single sticky detail
 * pane carry every identity. The designer scans the library as rows, selects
 * one, and reads its expanded system in the pane — then opens it in the
 * workspace or deletes it through explicit confirmation. Loading renders
 * shimmer skeleton rows, an empty library renders the first-run state, and
 * errors recover in place. An active palette swaps the whole view for the
 * Results Workspace.
 */

/** Spanish labels for the five palette roles, in system order. */
const ROLE_LABELS = [
  'Primario',
  'Secundario',
  'Acento',
  'Fondo',
  'Superficie',
] as const;

const fullDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

const DAY_MS = 86_400_000;

/** Formats an ISO timestamp as a full Spanish date ("18 ago 2026"). */
function formatFullDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return fullDateFormatter.format(date).replace(/\./g, '');
}

/**
 * Formats an ISO timestamp as a Spanish relative time ("hace 3 días",
 * "ayer", "hoy") for the compact master rows.
 */
function formatRelativeDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const days = Math.round((date.getTime() - Date.now()) / DAY_MS);
  if (days === 0) return 'hoy';
  if (Math.abs(days) < 31) return relativeFormatter.format(days, 'day');
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return relativeFormatter.format(months, 'month');
  return relativeFormatter.format(Math.round(days / 365), 'year');
}

/** Number of shimmer rows shown while the library loads. */
const SKELETON_ROWS = 6;

/**
 * ChromaForge Dashboard page — Master-Detail workspace.
 *
 * A borderless typographic metrics row floats above a two-column split:
 * the master column renders the visitor's saved identities as hairline-ruled
 * rows (first row auto-selected), and the detail column keeps one sticky
 * glass pane that expands whichever row is selected (`selectedId` local
 * state). When a palette is active — freshly generated or opened from the
 * library — the whole view is replaced by the Results Workspace.
 *
 * @returns {JSX.Element} The rendered dashboard page.
 */
export default function Dashboard() {
  useDocumentTitle('Panel');

  const handleSpotlight = useSpotlight<HTMLButtonElement>();

  const navigate = useNavigate();

  const [selectedIdInput, setSelectedId] = useState<string | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<SavedBrand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const user = useAuthStore((state) => state.user);

  const activePalette = useBrandStore((state) => state.activePalette);
  const savedBrands = useBrandStore((state) => state.savedBrands);
  const isFetchingBrands = useBrandStore((state) => state.isFetchingBrands);
  const brandsError = useBrandStore((state) => state.brandsError);
  const fetchSavedBrands = useBrandStore((state) => state.fetchSavedBrands);
  const deleteBrand = useBrandStore((state) => state.deleteBrand);
  const openSavedBrand = useBrandStore((state) => state.openSavedBrand);

  useEffect(() => {
    if (user) void fetchSavedBrands();
  }, [user, fetchSavedBrands]);

  /**
   * Dismisses the confirmation dialog without touching the identity.
   */
  const cancelDelete = useCallback(() => {
    setBrandToDelete(null);
  }, []);

  /**
   * Executes the deletion after explicit confirmation. The confirm action
   * stays disabled while in flight; on success the derived selection
   * re-anchors to the next row automatically.
   *
   * @returns {Promise<void>}
   */
  const confirmDelete = useCallback(async () => {
    if (!brandToDelete || isDeleting) return;
    setIsDeleting(true);
    await deleteBrand(brandToDelete.id);
    setIsDeleting(false);
    setBrandToDelete(null);
  }, [brandToDelete, isDeleting, deleteBrand]);

  if (activePalette) {
    return (
      <section className={styles.dashboard}>
        <ResultsWorkspace palette={activePalette} />
      </section>
    );
  }

  const selected =
    savedBrands.find((brand) => brand.id === selectedIdInput) ?? savedBrands[0] ?? null;

  const totalTones = savedBrands.reduce((total, brand) => total + brand.colors.length, 0);

  const bodyState =
    isFetchingBrands && savedBrands.length === 0
      ? 'skeleton'
      : brandsError && savedBrands.length === 0
        ? 'error'
        : savedBrands.length === 0
          ? 'empty'
          : 'data';

  const startQuiz = () => navigate('/quiz');

  /** Opens the confirmed identity in the live Results Workspace. */
  const openInWorkspace = () => {
    if (!selected || !openSavedBrand(selected.id)) {
      toast.error('No se pudo abrir la identidad.');
    }
  };

  return (
    <section className={styles.dashboard}>
      <div className={styles.background} aria-hidden="true" />

      <div className={styles.container}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderText}>
            <span className={styles.pageEyebrow}>Espacio de trabajo</span>
            <h1 className={styles.pageTitle}>Panel de diseño</h1>
            <p className={styles.pageDescription}>
              Proyectos, paletas y sistemas de identidad listos para producción.
            </p>
          </div>

          <button
            type="button"
            className={styles.primaryAction}
            onClick={startQuiz}
            onPointerMove={handleSpotlight}
          >
            Generar identidad
          </button>
        </header>

        <dl className={styles.metrics} aria-label="Resumen de la biblioteca">
          <div className={styles.metric}>
            <dt className={styles.metricLabel}>Identidades</dt>
            <dd className={styles.metricValue}>{savedBrands.length}</dd>
          </div>
          <div className={styles.metric}>
            <dt className={styles.metricLabel}>Paletas generadas</dt>
            <dd className={clsx(styles.metricValue, styles.metricValueAccent)}>
              {savedBrands.length}
            </dd>
          </div>
          <div className={styles.metric}>
            <dt className={styles.metricLabel}>Tonos en biblioteca</dt>
            <dd className={styles.metricValue}>{totalTones}</dd>
          </div>
        </dl>

        {bodyState === 'skeleton' && (
          <div className={clsx(styles.workspace)} role="status" aria-label="Cargando tus identidades">
            <nav className={styles.master} aria-hidden="true">
              <ul className={styles.skeletonList}>
                {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                  <li key={index} className={styles.skeletonRow}>
                    <span className={styles.skeletonBar} style={{ width: '38%' }} />
                    <span className={styles.skeletonBar} style={{ width: '18%' }} />
                  </li>
                ))}
              </ul>
            </nav>
            <aside className={styles.detail}>
              <div className={clsx(styles.detailPanel, styles.detailPanelSkeleton)}>
                <span className={clsx(styles.skeletonBar, styles.skeletonBlock)} />
                <span className={clsx(styles.skeletonBar, styles.skeletonBlock, styles.skeletonWide)} />
                <span className={clsx(styles.skeletonBar, styles.skeletonBlock)} />
              </div>
            </aside>
          </div>
        )}

        {bodyState === 'error' && (
          <div className={clsx(styles.statePanel, styles.statePanelError)} role="alert">
            <span className={styles.stateIcon} aria-hidden="true">
              <AlertTriangle size={22} />
            </span>
            <h2 className={styles.stateTitle}>No se pudieron cargar tus identidades.</h2>
            <p className={styles.stateDescription}>
              Revisa tu conexión y vuelve a intentarlo. Tus identidades guardadas no se han
              perdido.
            </p>
            <button
              type="button"
              className={styles.stateAction}
              onClick={() => void fetchSavedBrands()}
            >
              Reintentar
            </button>
          </div>
        )}

        {bodyState === 'empty' && (
          <div className={styles.emptyPanel} role="status">
            <span className={styles.emptyIcon} aria-hidden="true">
              <Palette size={22} />
            </span>
            <h2 className={styles.emptyTitle}>Aún no tienes identidades generadas.</h2>
            <p className={styles.emptyDescription}>
              Responde el cuestionario abstracto y ChromaForge forjará el sistema cromático
              completo de tu marca: cinco roles, verificados en contraste AA.
            </p>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={startQuiz}
              onPointerMove={handleSpotlight}
            >
              <Sparkles size={15} aria-hidden="true" />
              Generar mi primera identidad
            </button>
          </div>
        )}

        {bodyState === 'data' && (
          <>
            <div className={styles.workspace}>
              <nav className={styles.master} aria-label="Biblioteca de identidades">
                <ul className={styles.brandList}>
                  {savedBrands.map((brand) => {
                    const isActive = brand.id === selected?.id;
                    return (
                      <li key={brand.id}>
                        <button
                          type="button"
                          className={clsx(styles.brandRow, isActive && styles.brandRowActive)}
                          aria-current={isActive || undefined}
                          onClick={() => setSelectedId(brand.id)}
                        >
                          <span className={styles.brandRowText}>
                            <span className={styles.brandName}>{brand.name}</span>
                            <span className={styles.brandDate}>
                              {formatRelativeDate(brand.created_at)}
                            </span>
                          </span>

                          <span className={styles.brandSwatches} aria-hidden="true">
                            {brand.colors.slice(0, 5).map((color, index) => (
                              <span
                                key={`${color}-${index}`}
                                className={styles.brandSwatch}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <aside className={styles.detail} aria-label="Vista previa de la identidad">
                {selected ? (
                  <div key={selected.id} className={styles.detailPanel}>
                    <p className={styles.detailEyebrow}>Identidad seleccionada</p>
                    <h2 className={styles.detailName}>{selected.name}</h2>
                    <p className={styles.detailMeta}>
                      Guardada el {formatFullDate(selected.created_at)} ·{' '}
                      {selected.colors.length}{' '}
                      {selected.colors.length === 1 ? 'tono' : 'tonos'}
                    </p>

                    <ul className={styles.detailSwatches} aria-label={`Paleta de ${selected.name}`}>
                      {selected.colors.map((color, index) => (
                        <li key={`${color}-${index}`} className={styles.detailSwatchItem}>
                          <span
                            className={styles.detailSwatchDot}
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                          <span className={styles.detailSwatchRole}>
                            {ROLE_LABELS[index] ?? `Tono ${index + 1}`}
                          </span>
                          <code className={styles.detailHex}>{color}</code>
                        </li>
                      ))}
                    </ul>

                    <div className={styles.detailActions}>
                      <button
                        type="button"
                        className={styles.detailPrimaryAction}
                        onClick={openInWorkspace}
                        onPointerMove={handleSpotlight}
                      >
                        Abrir en espacio de trabajo
                      </button>
                      <button
                        type="button"
                        className={styles.detailDangerAction}
                        onClick={() => setBrandToDelete(selected)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.detailEmpty}>
                    <span className={styles.detailEmptyIcon} aria-hidden="true">
                      <MousePointerClick size={20} />
                    </span>
                    <h2 className={styles.detailEmptyTitle}>Ninguna identidad seleccionada</h2>
                    <p className={styles.detailEmptyText}>
                      Elige una fila de la lista para previsualizar su sistema cromático aquí.
                    </p>
                  </div>
                )}
              </aside>
            </div>

            <footer className={styles.libraryFooter}>
              <span>
                {savedBrands.length}{' '}
                {savedBrands.length === 1 ? 'identidad guardada' : 'identidades guardadas'} en tu
                biblioteca
              </span>
              <button type="button" className={styles.libraryFooterAction} onClick={startQuiz}>
                <Sparkles size={13} aria-hidden="true" />
                Crear una nueva
              </button>
            </footer>
          </>
        )}
      </div>

      <Modal
        open={brandToDelete !== null}
        onClose={cancelDelete}
        title="Eliminar identidad"
      >
        {brandToDelete ? (
          <div className={styles.confirm}>
            <span className={styles.confirmIcon} aria-hidden="true">
              <AlertTriangle size={20} />
            </span>
            <div className={styles.confirmText}>
              <p className={styles.confirmTitle}>¿Eliminar «{brandToDelete.name}»?</p>
              <p className={styles.confirmDescription}>
                Esta acción borra la identidad de tu biblioteca de forma permanente. No se puede
                deshacer.
              </p>
            </div>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmDelete}
                onClick={() => void confirmDelete()}
                disabled={isDeleting}
              >
                {isDeleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
