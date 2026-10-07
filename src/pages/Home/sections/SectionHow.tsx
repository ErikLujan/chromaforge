import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useReveal } from '@/hooks/useReveal';
import styles from './SectionHow.module.scss';

/**
 * SectionHow — the three-step path in ledger rows, not equal cards.
 *
 * Direction: an asymmetric ordered list (lead row wider than followers)
 * that narrates cuestionario → sistema → libro. Each step carries its own
 * honest scope line and one real route — no dead links, no invented
 * outcomes.
 *
 * @returns {JSX.Element} The rendered how-it-works section.
 */
export default function SectionHow() {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  return (
    <section className={styles.section} aria-labelledby="how-heading">
      <div className={styles.inner} ref={ref} data-revealed={revealed || undefined}>
        <div className={styles.head}>
          <h2 id="how-heading" className={cn(styles.title, styles.revealItem)}>
            Cómo funciona
          </h2>
          <p className={cn(styles.lede, styles.revealItem)} style={{ transitionDelay: '90ms' }}>
            Tres pasos visibles de principio a fin. Nada ocurre en una caja
            negra: cada voto, cada corrección y cada capítulo quedan a la vista.
          </p>
        </div>

        <ol className={styles.steps}>
          <li className={cn(styles.step, styles.revealItem)} style={{ transitionDelay: '180ms' }}>
            <span className={styles.index} aria-hidden="true">
              01
            </span>
            <div className={styles.body}>
              <h3 className={styles.stepTitle}>Responde 8 preguntas</h3>
              <p className={styles.stepText}>
                Espacios, sonidos y materiales — nunca un selector de color.
                Cada respuesta vota tono, croma, valor y armonía.
              </p>
              <p className={styles.scope}>08 preguntas · ~2 minutos · sin cuenta para probar</p>
              <Link to="/quiz" className={styles.stepLink}>
                Comenzar cuestionario
              </Link>
            </div>
          </li>

          <li className={cn(styles.step, styles.revealItem)} style={{ transitionDelay: '270ms' }}>
            <span className={styles.index} aria-hidden="true">
              02
            </span>
            <div className={styles.body}>
              <h3 className={styles.stepTitle}>Recibe un sistema verificado</h3>
              <p className={styles.stepText}>
                El motor forja cinco roles y corrige cada texto sobre su
                superficie hasta superar el contraste AA 4.5:1.
              </p>
              <p className={styles.scope}>05 roles · WCAG 2.1 AA · determinista</p>
              <Link to="/docs" className={styles.stepLink}>
                Ver cómo se verifica
              </Link>
            </div>
          </li>

          <li className={cn(styles.step, styles.revealItem)} style={{ transitionDelay: '360ms' }}>
            <span className={styles.index} aria-hidden="true">
              03
            </span>
            <div className={styles.body}>
              <h3 className={styles.stepTitle}>Compila tu libro en PDF</h3>
              <p className={styles.stepText}>
                Portada, color con valores HEX, tipografía y aplicaciones con
                su nota de contraste — listo para compartir o imprimir.
              </p>
              <p className={styles.scope}>04 capítulos · PDF · desde tu panel</p>
              <Link to="/quiz" className={styles.stepLink}>
                Generar mi libro
              </Link>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}
