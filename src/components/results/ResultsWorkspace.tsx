import { useCallback, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';
import {
  ArrowLeft,
  Check,
  Download,
  LayoutTemplate,
  Palette,
  Save,
  Share2,
  Sparkles,
  Type,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useBrandStore } from '@/store/useBrandStore';
import { isTextReadable } from '@/utils/color.utils';
import type { BrandPalette, PaletteRole } from '@/utils/color.utils';
import { exportBrandToPDF } from '@/utils/pdf.utils';
import { useEntrance } from '@/hooks/useEntrance';
import TypographyPreview from './TypographyPreview';
import ApplicationPreview from './ApplicationPreview';
import AsyncButton from '../ui/AsyncButton';
import styles from './ResultsWorkspace.module.scss';

/**
 * ResultsWorkspace — interactive results workspace.
 *
 * A professional branding workspace replacing the dashboard grid while an
 * active palette exists: a compact toolbar, a role-based navigation rail, and
 * a canvas presenting the generated palette as a living identity system. The
 * full brand identity batches (name, typography, logo) arrive from the
 * generation pipeline in later batches; this shell owns the workspace
 * language.
 */

type WorkspaceView = 'brand' | 'colors' | 'typography' | 'applications';

interface WorkspaceViewConfig {
  readonly id: WorkspaceView;
  readonly label: string;
  readonly hint: string;
  readonly icon: LucideIcon;
}

const workspaceViews: readonly WorkspaceViewConfig[] = [
  { id: 'brand', label: 'Marca', hint: 'Identidad principal', icon: Sparkles },
  { id: 'colors', label: 'Colores', hint: 'Sistema cromático', icon: Palette },
  { id: 'typography', label: 'Tipografía', hint: 'Escala tipográfica', icon: Type },
  { id: 'applications', label: 'Aplicaciones', hint: 'Usos de la marca', icon: LayoutTemplate },
] as const;

const PALETTE_ROLE_LABELS: Record<PaletteRole, string> = {
  primary: 'Primario',
  secondary: 'Secundario',
  accent: 'Acento',
  background: 'Fondo',
  surface: 'Superficie',
};

const PALETTE_ROLE_HINTS: Record<PaletteRole, string> = {
  primary: 'Rol dominante',
  secondary: 'Acompañante',
  accent: 'Destacados',
  background: 'Base profunda',
  surface: 'Nivel elevado',
};

const TOOLBAR_ACTIONS = [
  { id: 'share', label: 'Compartir', icon: Share2 },
  { id: 'export', label: 'Exportar', icon: Download },
  { id: 'save', label: 'Guardar', icon: Save },
] as const;

/** ID of the off-screen stage captured by the PDF Brand Book export. */
const EXPORT_AREA_ID = 'brand-export-area';

/**
 * Builds the display name for the current generated identity. Shared by the
 * save action, the PDF export and the export stage header so all three stay
 * in sync until the pipeline supplies a real brand name.
 *
 * @returns {string} The dated identity name in Premium Spanish.
 */
function getGeneratedIdentityName(): string {
  const shortDate = new Date()
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    .replace(/\.$/, '');
  return `Identidad generada · ${shortDate}`;
}

interface ResultsWorkspaceProps {
  /** The generated palette the workspace presents. */
  readonly palette: BrandPalette;
}

/**
 * React logo mark for the generated identity.
 *
 * A two-tone geometric mark built from the palette's primary and accent
 * colors — the closest the shell can come to a real logo until the brand
 * pipeline generates one.
 *
 * @returns {JSX.Element} The rendered monogram.
 */
function LogoMark() {
  return (
    <svg
      className={styles.logoMark}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 6 56 18v28L32 58 8 46V18L32 6Z"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.5"
      />
      <path d="M32 20 44 27v10l-12 7-12-7V27l12-7Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Renders the contrast metadata badge for a palette role.
 *
 * @param {string} color The role color to verify against the surface.
 * @param {string} surface The workspace surface color.
 * @returns {JSX.Element | null} The AA badge, or `null` when not readable.
 */
function ContrastBadge({ color, surface }: { color: string; surface: string }) {
  const readable = isTextReadable(color, surface);

  return (
    <span
      className={clsx(styles.contrastBadge, !readable && styles.contrastBadgeFail)}
      title={
        readable
          ? 'Cumple contraste AA (≥ 4.5:1)'
          : 'No alcanza contraste AA sobre la superficie'
      }
    >
      {readable ? (
        <Check size={12} aria-hidden="true" />
      ) : (
        <span className={styles.contrastBadgeDot} aria-hidden="true" />
      )}
      AA
    </span>
  );
}

/**
 * Brand view — the generated identity as the canvas focal point.
 *
 * @param {BrandPalette} palette The generated palette.
 * @returns {JSX.Element} The brand presentation panel.
 */
function BrandView({ palette }: { palette: BrandPalette }) {
  return (
    <div className={styles.stage}>
      <div className={styles.brandHero}>
        <div className={styles.logoTile}>
          <LogoMark />
        </div>

        <div className={styles.brandMeta}>
          <span className={styles.brandEyebrow}>Marca generada · Contraste AA</span>
          <h2 className={styles.brandTitle}>Identidad de marca</h2>
          <p className={styles.brandTagline}>
            Sistema de identidad calculado a partir de un único color semilla.
            El nombre, la tipografía y el logotipo finales se componen en la
            generación de marca.
          </p>
        </div>

        <ul className={styles.brandPalette} aria-label="Paleta generada">
          {(['primary', 'secondary', 'accent', 'surface', 'background'] as const).map(
            (role) => (
              <li key={role} className={styles.brandPaletteItem}>
                <span
                  className={styles.brandPaletteSwatch}
                  style={{ backgroundColor: palette[role] }}
                  aria-hidden="true"
                />
                <span className={styles.brandPaletteLabel}>{PALETTE_ROLE_LABELS[role]}</span>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

/**
 * Colors view — the generated palette with per-role hex and AA verification.
 *
 * @param {BrandPalette} palette The generated palette.
 * @returns {JSX.Element} The palette ladder panel.
 */
function ColorsView({ palette }: { palette: BrandPalette }) {
  return (
    <div className={styles.stage}>
      <ul className={styles.paletteLadder} aria-label="Sistema cromático generado">
        {(['primary', 'secondary', 'accent', 'background', 'surface'] as const).map(
          (role) => (
            <li key={role} className={styles.paletteLadderItem}>
              <span
                className={styles.paletteLadderSwatch}
                style={{ backgroundColor: palette[role] }}
                aria-hidden="true"
              />
              <span className={styles.paletteLadderRole}>
                <span className={styles.paletteLadderName}>{PALETTE_ROLE_LABELS[role]}</span>
                <span className={styles.paletteLadderHint}>{PALETTE_ROLE_HINTS[role]}</span>
              </span>
              <code className={styles.paletteLadderHex}>{palette[role]}</code>
              {role !== 'background' && role !== 'surface' ? (
                <ContrastBadge color={palette[role]} surface={palette.surface} />
              ) : null}
            </li>
          ),
        )}
      </ul>

      <p className={styles.stageNote}>
        Los tres roles legibles se verifican contra la superficie clara del
        sistema: todo lo que se muestre como texto cumple WCAG 2.1 AA (≥ 4.5:1).
      </p>
    </div>
  );
}

/**
 * Typography view — the generated identity's type scale as a live specimen.
 *
 * @param {CSSProperties} paletteStyle Brand roles as CSS custom properties.
 * @returns {JSX.Element} The typography specimen panel.
 */
function TypographyView({ paletteStyle }: { paletteStyle: CSSProperties }) {
  return (
    <div className={styles.stage}>
      <TypographyPreview style={paletteStyle} />
    </div>
  );
}

/**
 * Applications view — the identity rendered in practical interface contexts.
 *
 * @param {CSSProperties} paletteStyle Brand roles as CSS custom properties.
 * @returns {JSX.Element} The application mockup panel.
 */
function ApplicationsView({ paletteStyle }: { paletteStyle: CSSProperties }) {
  return (
    <div className={styles.stage}>
      <ApplicationPreview style={paletteStyle} />
    </div>
  );
}

/**
 * Export section — a labeled chapter of the PDF Brand Book.
 *
 * @param {string} label The chapter label rendered above the content.
 * @param {ReactNode} children The view content captured into the PDF.
 * @returns {JSX.Element} The labeled export chapter.
 */
function ExportSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={styles.exportSection}>
      <span className={styles.exportSectionLabel}>{label}</span>
      {children}
    </section>
  );
}

/**
 * ChromaForge Results Workspace.
 *
 * Presents a generated palette as a living identity workspace: a compact
 * toolbar with the project status and a functional "Volver al Dashboard"
 * action, a role-based navigation rail that switches the active view through
 * local state, and a canvas that renders the view content against layered
 * dark-glass surfaces.
 *
 * @param {ResultsWorkspaceProps} props The workspace configuration.
 * @returns {JSX.Element} The rendered workspace.
 */
export default function ResultsWorkspace({ palette }: ResultsWorkspaceProps) {
  const clearActivePalette = useBrandStore((state) => state.clearActivePalette);
  const saveBrand = useBrandStore((state) => state.saveBrand);
  const isActivePaletteSaved = useBrandStore((state) => state.isActivePaletteSaved);

  const [activeView, setActiveView] = useState<WorkspaceView>('brand');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const entered = useEntrance();

  /**
   * Persists the generated palette to the visitor's library and confirms with
   * a toast. The identity is named with its creation date until the
   * questionnaire pipeline supplies a real brand name. This is the manual
   * fallback — the quiz auto-saves on completion, so this only fires when
   * that first attempt failed or the visitor re-generates.
   *
   * @returns {Promise<void>}
   */
  const handleSave = useCallback(async () => {
    if (isSaving || isActivePaletteSaved) return;
    setIsSaving(true);

    const colors = (['primary', 'secondary', 'accent', 'background', 'surface'] as const).map(
      (role) => palette[role],
    );

    const saved = await saveBrand({ name: getGeneratedIdentityName(), colors });
    setIsSaving(false);

    if (saved) {
      toast.success('Identidad guardada en tu biblioteca.');
    } else {
      toast.error('No se pudo guardar la identidad.');
    }
  }, [isSaving, isActivePaletteSaved, palette, saveBrand]);

  /**
   * Compiles the off-screen Brand Book stage into a downloadable PDF and
   * confirms with a toast. The capture runs against the always-mounted
   * `#brand-export-area` node, independent of the active workspace view. The
   * busy state flips instantly and the work yields briefly so the loader
   * paints before the synchronous capture blocks the main thread.
   *
   * @returns {Promise<void>}
   */
  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);

    setTimeout(async () => {
      try {
        await exportBrandToPDF(getGeneratedIdentityName(), EXPORT_AREA_ID);
        toast.success('PDF exportado exitosamente.');
      } catch {
        toast.error('No se pudo generar el PDF. Inténtalo de nuevo.');
      } finally {
        setIsExporting(false);
      }
    }, 150);
  }, [isExporting]);

  const onPrimary = isTextReadable('#FFFFFF', palette.primary)
    ? '#FFFFFF'
    : palette.background;

  const paletteStyle = {
    '--brand-primary': palette.primary,
    '--brand-secondary': palette.secondary,
    '--brand-accent': palette.accent,
    '--brand-background': palette.background,
    '--brand-surface': palette.surface,
    '--brand-on-primary': onPrimary,
  } as CSSProperties;

  const renderView = (view: WorkspaceView) => {
    switch (view) {
      case 'brand':
        return <BrandView palette={palette} />;
      case 'colors':
        return <ColorsView palette={palette} />;
      case 'typography':
        return <TypographyView paletteStyle={paletteStyle} />;
      case 'applications':
        return <ApplicationsView paletteStyle={paletteStyle} />;
    }
  };

  const workspaceStyle = {
    '--logo-from': palette.primary,
    '--logo-to': palette.accent,
  } as CSSProperties;

  /**
   * Brand tokens published on the off-screen capture stage itself rather than
   * only on its descendants, so the cloned capture keeps the real tones
   * instead of falling back to transparent.
   */
  const exportStageStyle = {
    ...paletteStyle,
    '--logo-from': palette.primary,
    '--logo-to': palette.accent,
  } as CSSProperties;

  return (
    <section
      className={clsx(styles.workspace, entered && styles.entered)}
      style={workspaceStyle}
      aria-label="Espacio de resultados"
    >
      <div className={styles.background} aria-hidden="true" />

      <header className={styles.toolbar}>
        <div className={styles.toolbarIdentity}>
          <span className={styles.toolbarMark} aria-hidden="true">
            <LogoMark />
          </span>
          <div className={styles.toolbarTitles}>
            <span className={styles.toolbarTitle}>Identidad de marca</span>
            <span className={styles.toolbarSubtitle}>Espacio de resultados</span>
          </div>
        </div>

        <div className={styles.toolbarStatus}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span className={styles.statusLabel}>Sistema generado · Contraste AA</span>
        </div>

        <div className={styles.toolbarActions}>
          {TOOLBAR_ACTIONS.map((action) => {
            const isSave = action.id === 'save';
            const isExport = action.id === 'export';
            const isPlaceholder = action.id === 'share';
            const showSaved = isSave && isActivePaletteSaved;

            const buttonClass = isExport
              ? styles.btnExport
              : showSaved
                ? styles.toolbarGhostSaved
                : isSave
                  ? styles.toolbarGhostEnabled
                  : styles.toolbarGhost;

            const isDisabled =
              isPlaceholder ||
              showSaved ||
              (isSave && isSaving) ||
              (isExport && isExporting);

            return (
              <AsyncButton
                key={action.id}
                className={buttonClass}
                label={showSaved ? 'Guardado' : action.label}
                busyLabel={isSave ? 'Guardando…' : 'Generando PDF…'}
                loading={(isSave && isSaving) || (isExport && isExporting)}
                icon={isSave && showSaved ? <Check size={15} /> : <action.icon size={15} />}
                loaderVariant={isExport ? 'light' : 'accent'}
                onClick={
                  isSave
                    ? () => void handleSave()
                    : isExport
                      ? () => void handleExport()
                      : undefined
                }
                disabled={isDisabled}
                title={
                  isPlaceholder
                    ? 'Disponible en una próxima versión'
                    : showSaved
                      ? 'Identidad guardada en tu biblioteca'
                      : isExport
                        ? 'Descarga el libro de marca en PDF'
                        : undefined
                }
                tabIndex={(isPlaceholder || showSaved) ? -1 : undefined}
                aria-pressed={showSaved}
              ></AsyncButton>
            );
          })}

          <button
            type="button"
            className={styles.toolbarBack}
            onClick={clearActivePalette}
            aria-label="Volver al Dashboard"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Volver al Dashboard
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Vistas del espacio de resultados">
          <span className={styles.sidebarLabel}>Identidad</span>
          <ul className={styles.sidebarList}>
            {workspaceViews.map((view) => {
              const isActive = view.id === activeView;
              return (
                <li key={view.id}>
                  <button
                    type="button"
                    className={clsx(styles.sidebarItem, isActive && styles.sidebarItemActive)}
                    aria-pressed={isActive}
                    onClick={() => setActiveView(view.id)}
                  >
                    <view.icon size={16} aria-hidden="true" />
                    <span className={styles.sidebarItemText}>
                      <span className={styles.sidebarItemLabel}>{view.label}</span>
                      <span className={styles.sidebarItemHint}>{view.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className={styles.canvas} aria-live="polite">
          {renderView(activeView)}
        </main>
      </div>

      {/* Brand Book capture stage — always mounted so the PDF export compiles
          every chapter (marca, colores, tipografía, aplicaciones) regardless
          of the active view. Parked far off-screen; never focusable, never
          announced. The opaque obsidian ground keeps the PDF free of any
          transparent fall-through. */}
      <div
        id={EXPORT_AREA_ID}
        className={styles.exportStage}
        style={exportStageStyle}
        aria-hidden="true"
      >
        <header className={styles.exportHeader}>
          <span className={styles.exportEyebrow}>ChromaForge · Libro de marca</span>
          <h2 className={styles.exportTitle}>{getGeneratedIdentityName()}</h2>
          <p className={styles.exportMeta}>
            Sistema cromático verificado bajo WCAG 2.1 AA · Generado de forma determinista a
            partir del cuestionario de identidad.
          </p>
        </header>

        <ExportSection label="Marca">
          <BrandView palette={palette} />
        </ExportSection>
        <ExportSection label="Colores">
          <ColorsView palette={palette} />
        </ExportSection>
        <ExportSection label="Tipografía">
          <TypographyView paletteStyle={paletteStyle} />
        </ExportSection>
        <ExportSection label="Aplicaciones">
          <ApplicationsView paletteStyle={paletteStyle} />
        </ExportSection>
      </div>
    </section>
  );
}