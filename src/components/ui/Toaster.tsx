import { Toaster as SonnerToaster } from 'sonner';
import type { CSSProperties } from 'react';

/**
 * Toaster — ChromaForge Dark Cyber-SaaS toast shell.
 *
 * Wraps the sonner `Toaster` so the theme configuration lives in one place
 * instead of the root layout. Chrome values mirror the SCSS design tokens in
 * `src/styles/_tokens.scss` and must stay in sync when tokens change. Sonner
 * drives toast chrome through CSS custom properties on each toast, which is
 * more robust than fighting its cascade; only the variables are set here so
 * success, error, info, and warning toasts keep their distinct tinted
 * surfaces instead of a flat neutral.
 */
const toastStyle = {
  '--normal-bg': '#0b0d12',
  '--normal-border': 'rgba(255, 255, 255, 0.10)',
  '--normal-text': '#e8e9ed',
  '--success-bg': 'rgba(34, 197, 94, 0.15)',
  '--success-border': 'rgba(34, 197, 94, 0.35)',
  '--success-text': '#22c55e',
  '--info-bg': 'rgba(59, 130, 246, 0.15)',
  '--info-border': 'rgba(59, 130, 246, 0.35)',
  '--info-text': '#3b82f6',
  '--warning-bg': 'rgba(245, 158, 11, 0.15)',
  '--warning-border': 'rgba(245, 158, 11, 0.35)',
  '--warning-text': '#f59e0b',
  '--error-bg': 'rgba(239, 68, 68, 0.15)',
  '--error-border': 'rgba(239, 68, 68, 0.35)',
  '--error-text': '#ef4444',
  borderRadius: '0.625rem',
  boxShadow:
    '0 12px 30px rgba(0, 0, 0, 0.28), 0 4px 12px rgba(0, 0, 0, 0.18)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as CSSProperties;

/**
 * ChromaForge themed toast mount.
 *
 * Inject once at the application root. Toasts are then triggered with the
 * `sonner` API (`toast.success('…')`, etc.).
 *
 * @returns {JSX.Element} The mounted toast viewport.
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      richColors
      closeButton
      gap={8}
      offset={16}
      toastOptions={{ style: toastStyle }}
    />
  );
}
