import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import ActionLoader from './ActionLoader';
import styles from './AsyncButton.module.scss';

/**
 * AsyncButton — premium action button with anti-jitter width lock.
 *
 * The shared button primitive for controls that run an async action. It swaps
 * the resting icon and text into a branded ActionLoader plus busy label while
 * the task is in flight, and it keeps the button's exact computed width
 * through the swap: the resting label always renders in normal flow so it
 * owns the width in every state, the busy label mounts absolutely positioned
 * over it with zero flow contribution, and the icon renders in a fixed 16px
 * slot the loader swaps inside. No measurement pass, no resize observer, and
 * no layout jitter while the action resolves.
 *
 * Accessibility: the busy state disables the button, sets `aria-busy`, hides
 * the resting content from assistive tech, and leaves the busy label as the
 * only readable text, so the accessible name always matches the screen.
 */

export interface AsyncButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Resting label — always rendered so it owns the button's computed width. */
  readonly label: string;
  /** Label shown while `loading`; defaults to the resting label. */
  readonly busyLabel?: string;
  /** Whether the async action is in flight. */
  readonly loading?: boolean;
  /** Resting icon, rendered in a fixed-width slot. Provide one so the icon →
   *  loader swap never changes the button's computed width. */
  readonly icon?: ReactNode;
  /** Custom busy indicator; defaults to the branded ActionLoader. */
  readonly busyIcon?: ReactNode;
  /** Loader tone: `accent` for dark/ghost surfaces, `light` for color-filled
   *  surfaces (gradient CTAs, destructive actions). */
  readonly loaderVariant?: 'accent' | 'light';
}

/**
 * Shared async action button with a width-locked busy state.
 *
 * @param {AsyncButtonProps} props Button configuration and busy-state contract.
 * @returns {JSX.Element} The rendered button.
 */
export default function AsyncButton({
  type = 'button',
  label,
  busyLabel,
  loading = false,
  icon,
  busyIcon,
  loaderVariant = 'accent',
  className,
  disabled,
  ...rest
}: AsyncButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={clsx(styles.base, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className={styles.restState} aria-hidden={loading || undefined}>
        {icon && <span className={styles.restIcon}>{icon}</span>}
        <span className={styles.restLabel}>{label}</span>
      </span>

      {loading && (
        <span className={styles.busyState}>
          {busyIcon ?? <ActionLoader variant={loaderVariant} size={16} />}
          <span className={styles.busyLabel}>{busyLabel ?? label}</span>
        </span>
      )}
    </button>
  );
}