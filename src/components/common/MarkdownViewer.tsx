import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import styles from './MarkdownViewer.module.scss';

/**
 * MarkdownViewer — token-styled markdown renderer.
 *
 * The single reader for every markdown-driven surface (legal pages, docs).
 * Content files live as `.md` sources imported as raw strings; this component
 * is deliberately free of content and only knows how to render the
 * ChromaForge way: display-face headings with hairline accents, secondary
 * body text, accent links with hairline underlines, mono code blocks on
 * elevated surfaces, tables wrapped in a keyboard-scrollable region, and
 * blockquotes with a 1px cyan edge.
 *
 * Safety: react-markdown escapes raw HTML by default, so the
 * developer-authored sources are the only trust boundary. External links open
 * in a new tab with `rel="noopener noreferrer"`.
 */

interface MarkdownViewerProps {
  /** Raw markdown string to render (from a Vite `?raw` import). */
  readonly markdown: string;
  /** Optional extra class merged onto the root (entrance states, layout). */
  readonly className?: string;
}

/**
 * Renders markdown through the ChromaForge Dark Cyber-SaaS typographic system.
 *
 * The hast `node` injected by react-markdown into custom components is
 * consumed and dropped so it never reaches the DOM.
 *
 * @param props - Markdown source and optional merged class name.
 * @returns {JSX.Element} The token-styled document.
 */
export default function MarkdownViewer({ markdown, className }: MarkdownViewerProps) {
  return (
    <div className={clsx(styles.root, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, href, children, ...props }) => {
            void node;
            const external = typeof href === 'string' && href.startsWith('http');
            return (
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                {...props}
              >
                {children}
              </a>
            );
          },
          table: ({ node, ...props }) => {
            void node;
            return (
              <div
                className={styles.tableWrap}
                role="region"
                aria-label="Tabla de contenido"
                tabIndex={0}
              >
                <table {...props} />
              </div>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}