import { useEffect } from 'react';

/**
 * Marks the active route as non-indexable (Batch A — crawlability).
 *
 * Private surfaces (`/auth`, `/forgot-password`, `/update-password`,
 * `/dashboard`, `/quiz`, `/brands`, `/profile`) and the 404 stage must never
 * appear in search results. The effect upserts a single
 * `<meta name="robots" content="noindex,nofollow">` tag and removes it on
 * unmount, so navigating back to an indexable route (`/`, `/docs`,
 * `/privacy`, `/terms`, `/cookies`) restores the default crawlable state.
 *
 * @returns {void}
 */
export function useNoIndex(): void {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
      created = true;
    }
    const previous = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex,nofollow');
    return () => {
      if (created) {
        meta?.remove();
      } else if (previous !== null) {
        meta?.setAttribute('content', previous);
      } else {
        meta?.removeAttribute('content');
      }
    };
  }, []);
}
