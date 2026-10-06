import { useEffect } from 'react';
import type { LegalSlug } from '@/pages/Legal/LegalPage';

/**
 * Public SEO routes (Batch B). Only these five surfaces are indexable —
 * every other route owns `useNoIndex` instead and must never gain
 * canonical/OG tags here.
 */
export type SeoRoute = 'home' | LegalSlug;

interface SeoConfig {
  /** Spanish page name shown after the product prefix. */
  readonly title: string;
  /** Unique factual Spanish description — no metrics, no testimonials. */
  readonly description: string;
  /** Public URL path (leading slash, no trailing slash except root). */
  readonly path: string;
}

// WHY: placeholder domain shared with robots.txt/sitemap.xml until launch.
const SITE_URL = 'https://chromaforge-generator.vercel.app';
const OG_IMAGE = `${SITE_URL}/og-cover.png`;

const seoConfigs: Record<SeoRoute, SeoConfig> = {
  home: {
    title: 'Inicio',
    description:
      'ChromaForge forja la identidad visual de tu marca: responde un cuestionario de ocho preguntas, obtén un sistema cromático de cinco roles verificado en contraste WCAG AA y expórtalo en PDF.',
    path: '/',
  },
  docs: {
    title: 'Documentación',
    description:
      'Documentación de ChromaForge: el motor en tres fases —cuestionario, análisis y sistema de identidad—, verificación de contraste WCAG AA y exportación del manual en PDF.',
    path: '/docs',
  },
  privacy: {
    title: 'Política de privacidad',
    description:
      'Política de privacidad de ChromaForge: qué datos recolectamos, para qué los usamos y qué derechos tienes sobre tu información.',
    path: '/privacy',
  },
  terms: {
    title: 'Términos del servicio',
    description:
      'Términos del servicio de ChromaForge: descripción del servicio, registro de cuenta y condiciones de uso de las identidades generadas.',
    path: '/terms',
  },
  cookies: {
    title: 'Política de cookies',
    description:
      'Política de cookies de ChromaForge: qué cookies esenciales utilizamos, cuáles nunca usamos y cómo gestionarlas en tu navegador.',
    path: '/cookies',
  },
};

/**
 * Upserts a `<meta>` tag and reports whether it was created, so the caller
 * can remove or restore it on cleanup.
 */
function upsertMeta(
  selector: string,
  create: () => HTMLMetaElement,
  content: string,
): { meta: HTMLMetaElement; created: boolean; previous: string | null } {
  let meta = document.querySelector<HTMLMetaElement>(selector);
  let created = false;
  if (!meta) {
    meta = create();
    document.head.appendChild(meta);
    created = true;
  }
  const previous = meta.getAttribute('content');
  meta.setAttribute('content', content);
  return { meta, created, previous };
}

/**
 * Sets the full SEO head for one public route: document title, meta
 * description, canonical, and OG/Twitter tags (`og:title`, `og:description`,
 * `og:type`, `og:locale es_ES`, `og:url`, `og:image`,
 * `twitter:card summary_large_image`). Everything it creates is removed on
 * unmount and pre-existing values are restored, so client-side navigation
 * between the five public surfaces never leaks tags across routes.
 *
 * @param route - The public route owning this page (`home` or a legal slug).
 * @returns {void}
 */
export function useSeo(route: SeoRoute): void {
  useEffect(() => {
    const config = seoConfigs[route];
    const fullTitle = `ChromaForge | ${config.title}`;
    const url = `${SITE_URL}${config.path === '/' ? '/' : config.path}`;
    const previousTitle = document.title;
    document.title = fullTitle;

    const managed: Array<{
      meta: HTMLMetaElement;
      created: boolean;
      previous: string | null;
    }> = [];
    const meta = (
      attr: 'name' | 'property',
      key: string,
      content: string,
    ): void => {
      managed.push(
        upsertMeta(`meta[${attr}="${key}"]`, () => {
          const el = document.createElement('meta');
          el.setAttribute(attr, key);
          return el;
        }, content),
      );
    };

    meta('name', 'description', config.description);
    meta('property', 'og:title', fullTitle);
    meta('property', 'og:description', config.description);
    meta('property', 'og:type', 'website');
    meta('property', 'og:locale', 'es_ES');
    meta('property', 'og:url', url);
    meta('property', 'og:image', OG_IMAGE);
    meta('name', 'twitter:card', 'summary_large_image');

    let canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    let canonicalCreated = false;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
      canonicalCreated = true;
    }
    const previousCanonical = canonical.getAttribute('href');
    canonical.setAttribute('href', url);

    return () => {
      document.title = previousTitle;
      for (const entry of managed) {
        if (entry.created) {
          entry.meta.remove();
        } else if (entry.previous !== null) {
          entry.meta.setAttribute('content', entry.previous);
        } else {
          entry.meta.removeAttribute('content');
        }
      }
      if (canonical) {
        if (canonicalCreated) {
          canonical.remove();
        } else if (previousCanonical !== null) {
          canonical.setAttribute('href', previousCanonical);
        } else {
          canonical.removeAttribute('href');
        }
      }
    };
  }, [route]);
}
