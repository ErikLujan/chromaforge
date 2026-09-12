import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import styles from './Modal.module.scss';

/**
 * Modal — reusable glassmorphic dialog.
 *
 * A keyboard-accessible modal dialog mounted through a portal into
 * `document.body`: traps focus, closes on Escape or backdrop pointer press,
 * locks body scroll, and restores focus to the trigger when dismissed. The
 * surface follows the Dark Cyber-SaaS tokens. Renders nothing when `open` is
 * false.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface ModalProps {
  /** Mounts the dialog when `true`; renders nothing otherwise. */
  readonly open: boolean;
  /** Called when the user closes the dialog (Escape, backdrop, close button). */
  readonly onClose: () => void;
  /** Dialog title — rendered as the heading and used as the accessible name. */
  readonly title: string;
  /** Dialog width band. `wide` suits tall, detail-rich content (e.g. the
   *  full brand-system preview); the default suits compact confirmations. */
  readonly size?: 'default' | 'wide';
  /** The dialog content. */
  readonly children: ReactNode;
}

/**
 * Renders a focus-trapped, portal-mounted dialog with Escape, backdrop, and
 * scroll-lock handling.
 *
 * @param {ModalProps} props Dialog visibility, close handler, title, size, and content.
 * @returns {JSX.Element | null} The dialog, or null when closed.
 */
export default function Modal({ open, onClose, title, size = 'default', children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    dialogRef.current?.focus();

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div
        className={styles.backdrop}
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(styles.dialog, size === 'wide' && styles.dialogWide)}
      >
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar diálogo"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}