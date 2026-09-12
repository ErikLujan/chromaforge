import { Link } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  Cookie,
  FileText,
  LayoutDashboard,
  Palette,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ChromaForgeIcon from '@/components/brand/ChromaForgeIcon';
import styles from './Footer.module.scss';

/**
 * Footer — premium asymmetric footer.
 *
 * Composition: brand block on the left and two navigation columns on the
 * right (Producto mirrors the header navigation; Legal reaches the public
 * markdown-driven document routes). Every link resolves to a real route, so
 * no placeholder column exists. The footer is a normal content-sized flex
 * item in the app shell, so its height never enters any page math.
 */

interface FooterLink {
  readonly label: string;
  readonly to: string;
  readonly icon: LucideIcon;
}

const productLinks: readonly FooterLink[] = [
  { label: 'Panel', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Cuestionario', to: '/quiz', icon: ClipboardList },
  { label: 'Marcas', to: '/brands', icon: Palette },
  { label: 'Documentación', to: '/docs', icon: BookOpen },
];

const legalLinks: readonly FooterLink[] = [
  { label: 'Privacidad', to: '/privacy', icon: Shield },
  { label: 'Términos', to: '/terms', icon: FileText },
  { label: 'Cookies', to: '/cookies', icon: Cookie },
];

/**
 * ChromaForge application footer.
 *
 * @returns {JSX.Element} The rendered footer.
 */
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.brandLink} aria-label="Inicio de ChromaForge">
            <span className={styles.brandMark} aria-hidden="true">
              <ChromaForgeIcon size={36} className={styles.brandMarkIcon} />
            </span>
            <span className={styles.brandName}>ChromaForge</span>
          </Link>
          <p className={styles.slogan}>Sistemas de identidad visual algorítmicos.</p>
          <p className={styles.copyright}>© {new Date().getFullYear()} ChromaForge.</p>
        </div>

        <nav className={styles.nav} aria-label="Enlaces del pie de página">
          <div className={styles.column}>
            <h2 className={styles.heading}>Producto</h2>
            <ul className={styles.list}>
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link className={styles.link} to={link.to}>
                    <link.icon size={14} aria-hidden="true" className={styles.linkIcon} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h2 className={styles.heading}>Legal</h2>
            <ul className={styles.list}>
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link className={styles.link} to={link.to}>
                    <link.icon size={14} aria-hidden="true" className={styles.linkIcon} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </footer>
  );
}