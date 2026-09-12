import { useMemo } from 'react';
import clsx from 'clsx';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEntrance } from '@/hooks/useEntrance';
import MarkdownViewer from '@/components/common/MarkdownViewer';
import styles from './LegalPage.module.scss';

/**
 * LegalPage — document stage for legal and documentation content.
 *
 * A markdown-driven document stage where the text is the page: one generic
 * reader serves the privacy, terms, cookies, and docs routes with a mono
 * fingerprint masthead, a Playfair title, and a 70ch reading column directly
 * on the canvas, plus a single static aura radial. Entrances re-arm per slug.
 *
 * Content pipeline: every `.md` file in `src/content/legal/` is bundled at
 * build time through Vite's raw glob, and the slug registry below resolves
 * each registered slug to its file with a synchronous lookup — no fetch, no
 * network, no loading state. Adding a document means writing the `.md`,
 * adding a route config entry, and registering the route.
 */

/** The registered document slugs — each maps 1:1 to a `.md` file and a route. */
const legalSlugs = ['privacy', 'terms', 'cookies', 'docs'] as const;

export type LegalSlug = (typeof legalSlugs)[number];

interface LegalRoute {
  /** Route slug — matches the content file name and the URL path. */
  readonly slug: LegalSlug;
  /** Public URL path. */
  readonly path: string;
  /** Short label for navigation surfaces (footer). */
  readonly label: string;
  /** Mono kicker shown in the document masthead. */
  readonly eyebrow: string;
  /** Spanish page name for the browser tab. */
  readonly title: string;
}

const legalRoutes: Record<LegalSlug, LegalRoute> = {
  privacy: {
    slug: 'privacy',
    path: '/privacy',
    label: 'Privacidad',
    eyebrow: 'Legal · Política de privacidad',
    title: 'Política de privacidad',
  },
  terms: {
    slug: 'terms',
    path: '/terms',
    label: 'Términos',
    eyebrow: 'Legal · Términos del servicio',
    title: 'Términos del servicio',
  },
  cookies: {
    slug: 'cookies',
    path: '/cookies',
    label: 'Cookies',
    eyebrow: 'Legal · Política de cookies',
    title: 'Política de cookies',
  },
  docs: {
    slug: 'docs',
    path: '/docs',
    label: 'Documentación',
    eyebrow: 'Recursos · Documentación',
    title: 'Documentación',
  },
};

const markdownModules = import.meta.glob('../../content/legal/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const markdownBySlug: Record<LegalSlug, string> = Object.fromEntries(
  legalSlugs.map((slug) => [
    slug,
    markdownModules[`../../content/legal/${slug}.md`] ?? '',
  ]),
) as Record<LegalSlug, string>;

interface LegalPageProps {
  /** Which document to render — must be a registered legal slug. */
  readonly slug: LegalSlug;
}

/**
 * Generic markdown document stage for legal and documentation routes.
 *
 * @param props - The registered slug selecting the document.
 * @returns {JSX.Element} The rendered document page.
 */
export default function LegalPage({ slug }: LegalPageProps) {
  const route = legalRoutes[slug];
  const markdown = useMemo(() => markdownBySlug[slug] ?? '', [slug]);

  const entered = useEntrance(0, slug);

  useDocumentTitle(route.title);

  return (
    <section className={styles.page} aria-label={route.title}>
      <div className={styles.background} aria-hidden="true" />

      <div className={styles.shell}>
        <header className={styles.masthead}>
          <p className={clsx(styles.eyebrow, entered && styles.entered)}>
            {route.eyebrow}
          </p>
          <p className={clsx(styles.fingerprint, entered && styles.entered)}>
            <span className={styles.routeMethod}>GET</span>
            <code className={styles.routePath}>{route.path}</code>
            <span className={styles.routeArrow} aria-hidden="true">
              →
            </span>
            <span className={styles.routeStatus}>200</span>
          </p>
        </header>

        <article className={clsx(styles.article, entered && styles.entered)}>
          <MarkdownViewer markdown={markdown} />
        </article>
      </div>
    </section>
  );
}