import type { CSSProperties } from 'react';
import styles from './ApplicationPreview.module.scss';

/**
 * ApplicationPreview — the generated identity in real interface contexts.
 *
 * Pure HTML and SCSS mockups with no external images: a product UI window
 * (navigation rail, role swatches, primary and secondary actions) and a web
 * hero (wordmark, nav, headline, dual button treatment). Every generated tone
 * arrives through the workspace's brand custom properties.
 */

interface ApplicationPreviewProps {
  /** Brand color roles exposed as CSS custom properties on the panel root. */
  readonly style?: CSSProperties;
}

/** The palette roles surfaced in the product-UI sidebar mockup. */
const SIDEBAR_ROLES = [
  { label: 'Primario', token: '--brand-primary' },
  { label: 'Secundario', token: '--brand-secondary' },
  { label: 'Acento', token: '--brand-accent' },
  { label: 'Fondo', token: '--brand-background' },
  { label: 'Superficie', token: '--brand-surface' },
] as const;

/** The navigation items shared by both mockups. */
const NAV_ITEMS = ['Inicio', 'Identidad', 'Biblioteca'] as const;

/**
 * Application preview of the generated identity.
 *
 * Demonstrates how the primary, secondary, accent, and surface roles behave
 * in a practical interface: a compact product window with a role sidebar and
 * a dual-role action group, plus a marketing hero with wordmark, navigation,
 * and headline. Both mockups scale fluidly and never overflow the canvas.
 *
 * @param {ApplicationPreviewProps} props The preview configuration.
 * @returns {JSX.Element} The rendered application mockup panel.
 */
export default function ApplicationPreview({ style }: ApplicationPreviewProps) {
  return (
    <section
      className={styles.panel}
      style={style}
      aria-label="Vista previa de aplicaciones de la marca"
    >
      <header className={styles.panelHeader}>
        <div className={styles.panelHeading}>
          <span className={styles.panelEyebrow}>Aplicaciones · Usos de la marca</span>
          <h3 className={styles.panelTitle}>La identidad en contexto</h3>
        </div>
        <span className={styles.panelMeta}>HTML · CSS · Sin imágenes</span>
      </header>

      <div className={styles.mockupGrid}>
        {/*
          Mockup 1 — Product UI window.
          A compact application surface: window chrome, navigation rail with
          the five role swatches, and a primary/secondary action group. Pure
          HTML/SCSS; spans carry the text so nothing here claims to be a
          functioning control.
        */}
        <div className={styles.windowMockup}>
          <div className={styles.windowBar}>
            <span className={styles.windowLights} aria-hidden="true">
              <span className={styles.windowLight} />
              <span className={styles.windowLight} />
              <span className={styles.windowLight} />
            </span>
            <span className={styles.windowTitle}>chromaforge · panel</span>
            <span className={styles.windowAction} aria-hidden="true">
              Exportar
            </span>
          </div>

          <div className={styles.appHeader}>
            <span
              className={styles.appWordmark}
              style={{ color: 'var(--brand-primary)' }}
            >
              Marca
            </span>
            <span className={styles.appNav} aria-hidden="true">
              {NAV_ITEMS.join('  ·  ')}
            </span>
          </div>

          <div className={styles.appBody}>
            <div className={styles.appSidebar}>
              <span className={styles.appSidebarLabel}>Roles</span>
              {SIDEBAR_ROLES.map((role) => (
                <span key={role.token} className={styles.appRole}>
                  <span
                    className={styles.appSwatch}
                    style={{ backgroundColor: `var(${role.token})` }}
                    aria-hidden="true"
                  />
                  <span className={styles.appRoleLabel}>{role.label}</span>
                </span>
              ))}
            </div>

            <div className={styles.appContent}>
              <span className={styles.appEyebrow}>Sistema de identidad</span>
              <span className={styles.appTitle}>Panel de marca</span>
              <p className={styles.appText}>
                La interfaz de producto muestra cómo el primario dirige las
                acciones, el secundario acompaña y las superficies organizan
                la jerarquía.
              </p>

              <div className={styles.appActions}>
                <span
                  className={styles.actionPrimary}
                  style={{
                    backgroundColor: 'var(--brand-primary)',
                    color: 'var(--brand-on-primary)',
                  }}
                >
                  Acción principal
                </span>
                <span
                  className={styles.actionSecondary}
                  style={{
                    color: 'var(--brand-secondary)',
                    borderColor: 'var(--brand-secondary)',
                  }}
                >
                  Acción secundaria
                </span>
              </div>
            </div>
          </div>
        </div>

        {/*
          Mockup 2 — Web hero.
          The identity at scale: wordmark, navigation, display headline, and a
          primary + ghost action pair on the generated background.
        */}
        <div className={styles.heroMockup}>
          <div className={styles.heroNav}>
            <span
              className={styles.heroWordmark}
              style={{ color: 'var(--brand-primary)' }}
            >
              Marca
            </span>
            <span className={styles.heroNavLinks} aria-hidden="true">
              {NAV_ITEMS.join('  ·  ')}
            </span>
          </div>

          <div className={styles.heroContent}>
            <span className={styles.heroEyebrow} style={{ color: 'var(--brand-accent)' }}>
              Construye algo memorable
            </span>
            <h4 className={styles.heroTitle}>Una marca que se recuerda.</h4>
            <p className={styles.heroText}>
              Color, tipografía y superficie trabajan juntos para que cada
              aplicación comunique la misma intención.
            </p>

            <div className={styles.heroActions}>
              <span
                className={styles.actionPrimary}
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: 'var(--brand-on-primary)',
                }}
              >
                Comenzar
              </span>
              <span className={styles.actionGhost}>Ver la identidad</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}