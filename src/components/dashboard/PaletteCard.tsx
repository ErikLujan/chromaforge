import { useCallback, useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react';
import clsx from 'clsx';
import styles from './PaletteCard.module.scss';

/**
 * PaletteCard — reusable bento card for the ChromaForge dashboard.
 */

export type PaletteCardVariant = 'hero' | 'wide' | 'square' | 'tall';

export interface PaletteCardProps {
  /** Visual variant — controls the card's grid span and surface emphasis. */
  readonly variant: PaletteCardVariant;
  /** Primary card title. */
  readonly title: string;
  /** Small mono eyebrow rendered above the title (optional). */
  readonly eyebrow?: string;
  /** Supporting copy rendered above the palette visualization. */
  readonly description?: string;
  /** Data-driven palette. When provided without children, the card renders its
   *  own swatch visualization (horizontal strip or vertical ladder by variant). */
  readonly colors?: readonly string[];
  /** Secondary metadata rendered in the card footer. */
  readonly footer?: string;
  /** Marks the card as interactive: enables the hover lift and the
   *  pointer-aware spotlight. Informational cards stay visually quiet. */
  readonly interactive?: boolean;
  /** Opens a preview when provided; the card becomes a keyboard-accessible
   *  trigger (role="button", Enter/Space). */
  readonly onClick?: () => void;
  /** Custom content that replaces the default palette visualization. */
  readonly children?: ReactNode;
  /** Optional control rendered as a compact floating action in the card's
   *  top-right corner (e.g. a delete trigger). It lifts above the spotlight
   *  and sits clear of the header text. */
  readonly action?: ReactNode;
  /** Marks the card as entered so its entrance transition may play. The
   *  parent (grid) drives this from a single `useEntrance` call so the whole
   *  grid staggers as one authored moment — and re-enters on data-state
   *  swaps — instead of every card animating independently on mount. */
  readonly entered?: boolean;
}

const variantClassNames: Record<PaletteCardVariant, string> = {
  hero: styles.variantHero,
  wide: styles.variantWide,
  square: styles.variantSquare,
  tall: styles.variantTall,
};

/**
 * Renders the palette swatches for a card.
 *
 * The tall variant renders a vertical "ladder" with hex values; every other
 * variant renders a horizontal strip of color bars. Colors are genuine
 * per-card data, so they are applied through inline styles rather than
 * duplicated SCSS declarations.
 *
 * @returns {ReactNode} The palette visualization, or null when no colors exist.
 */
function renderPalette(colors: readonly string[], variant: PaletteCardVariant): ReactNode {
  if (colors.length === 0) return null;

  if (variant === 'tall') {
    return (
      <ul className={styles.swatchLadder} aria-label="Paleta de colores">
        {colors.map((color, index) => (
          <li key={`${color}-${index}`} className={styles.swatchLadderItem}>
            <span
              className={styles.swatchLadderBar}
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <code className={styles.swatchHex}>{color}</code>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={styles.swatchStrip} aria-label="Paleta de colores">
      {colors.map((color, index) => (
        <li key={`${color}-${index}`} className={styles.swatchStripItem}>
          <span
            className={styles.swatchStripBar}
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Reusable brand/palette card used as the Bento grid unit of the Dashboard.
 *
 * The card exposes a small semantic API (variant, title, metadata, colors and
 * optional custom content) and owns its own grid spans, glass surface and
 * interaction states — parents never attach positioning classes by hand.
 *
 * Interactive cards track the pointer through CSS custom properties written
 * directly to the element (no React state, no re-renders) so the spotlight
 * follows the cursor cheaply.
 *
 * @param {PaletteCardProps} props The card configuration.
 * @returns {JSX.Element} The rendered card.
 */
export default function PaletteCard({
  variant,
  title,
  eyebrow,
  description,
  colors,
  footer,
  interactive = false,
  onClick,
  children,
  action,
  entered = true,
}: PaletteCardProps) {
  const articleRef = useRef<HTMLElement>(null);

  /**
   * Tracks the pointer over an interactive card and exposes its position to
   * the spotlight surface via CSS custom properties.
   *
   * @param {ReactPointerEvent<HTMLElement>} event The pointer move event.
   * @returns {void}
   */
  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const element = articleRef.current;
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    element.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    element.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
  }, []);

  /**
   * Activates the preview trigger with the keyboard (Enter or Space) so the
   * clickable card stays operable without a pointer.
   *
   * @param {ReactKeyboardEvent<HTMLElement>} event The key down event.
   * @returns {void}
   */
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!onClick) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const className = clsx(
    styles.card,
    variantClassNames[variant],
    interactive && styles.cardInteractive,
    onClick && styles.cardClickable,
    entered && styles.cardEntered,
  );

  const triggerProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: handleKeyDown,
        'aria-haspopup': 'dialog' as const,
      }
    : {};

  return (
    <article
      ref={articleRef}
      className={className}
      onPointerMove={interactive ? handlePointerMove : undefined}
      {...triggerProps}
    >
      <header className={clsx(styles.header, action && styles.headerWithAction)}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h3 className={styles.title}>{title}</h3>
      </header>

      <div className={styles.content}>
        {description && <p className={styles.description}>{description}</p>}
        {children ?? renderPalette(colors ?? [], variant)}
      </div>

      {footer && <footer className={styles.footer}>{footer}</footer>}

      {action && <div className={styles.action}>{action}</div>}
    </article>
  );
}
