import type { CSSProperties } from 'react';
import clsx from 'clsx';
import styles from './ActionLoader.module.scss';

/**
 * ActionLoader — ChromaForge premium busy indicator.
 *
 * A compact SVG micro-interaction for async actions in flight: a faint track
 * ring, three rounded dashes in the product identity tones spinning as one
 * segment, and a small pulsing core. The animation runs on transform and
 * opacity only, and the segments are drawn with `stroke-dasharray` so the
 * geometry is a single set of circles.
 *
 * Two tones: `accent` for dark and ghost surfaces, `light` for color-filled
 * surfaces where accent tones would lack contrast. The SVG viewBox is a fixed
 * 16×16; `size` only scales the rendered box.
 */

export interface ActionLoaderProps {
  /** Rendered size in px — the viewBox stays 16×16. */
  readonly size?: number;
  /** Busy-indicator tone, picked from the surface the loader sits on. */
  readonly variant?: 'accent' | 'light';
  /** Accessible name rendered as an SVG <title>; omit when the surrounding
   *  control already names the busy state. */
  readonly label?: string;
  /** Optional inline style passthrough. */
  readonly style?: CSSProperties;
}

/**
 * Renders the branded busy indicator.
 *
 * @param {ActionLoaderProps} props Size, tone, accessible label, and style.
 * @returns {JSX.Element} The rendered SVG indicator.
 */
export default function ActionLoader({
  size = 16,
  variant = 'accent',
  label,
  style,
}: ActionLoaderProps) {
  return (
    <svg
      className={clsx(styles.loader, variant === 'light' && styles.light)}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      style={style}
      role="img"
      focusable="false"
    >
      {label ? <title>{label}</title> : null}
      <circle className={styles.track} cx="8" cy="8" r="5.75" />
      <g className={styles.segments}>
        <circle className={styles.segment} cx="8" cy="8" r="5.75" transform="rotate(0 8 8)" />
        <circle className={styles.segment} cx="8" cy="8" r="5.75" transform="rotate(120 8 8)" />
        <circle className={styles.segment} cx="8" cy="8" r="5.75" transform="rotate(240 8 8)" />
      </g>
      <g className={styles.core}>
        <circle cx="8" cy="8" r="1.4" />
      </g>
    </svg>
  );
}