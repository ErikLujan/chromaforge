import { useEffect } from 'react';

/**
 * Keeps the browser tab label in sync with the active route.
 *
 * Every page sets `ChromaForge | <PageName>` so the document title always
 * communicates the location in the tab bar, screen-reader virtual cursors,
 * and browser history. Usage is intentionally per-page rather than centralized
 * in the router, so each page owns its metadata and the title cannot drift
 * from the rendered content.
 *
 * @param title - Spanish page name shown after the product prefix, e.g. 'Inicio'.
 * @returns {void}
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `ChromaForge | ${title}`;
  }, [title]);
}