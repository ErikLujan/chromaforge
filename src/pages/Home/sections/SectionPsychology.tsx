import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { quizQuestions } from '@/data/quizDictionary';
import type {
  HarmonyType,
  LightnessProfile,
  QuizAnswer,
  SaturationLevel,
} from '@/data/quizDictionary';
import {
  forgeBrandPalette,
  isTextReadable,
  resolveColorDirective,
} from '@/utils/color.utils';
import type { BrandPalette, PaletteRole } from '@/utils/color.utils';
import { useReveal } from '@/hooks/useReveal';
import styles from './SectionPsychology.module.scss';

/**
 * SectionPsychology — from intuition to system (Section 02).
 *
 * Direction contract (Batch 2 — product proof, not promises):
 *   THESIS:        the questionnaire's hidden machinery, exposed — one real
 *                  question, its real payload, the real directive, the real
 *                  forged system. No feature cards, no claims.
 *   OWN-WORLD:     vertical ledger — mono stage markers, hairline rules,
 *                  payload chips, mono directive readout; color appears only
 *                  in the forged strip.
 *   STORY:         a visitor answers one abstract question, watches the vote
 *                  become a directive and the directive become five roles,
 *                  and understands what the eight-question wizard earns.
 *   FIRST VIEWPORT: NOT the first viewport — a quiet scroll chapter below
 *                  the hero; rows stagger in once via scroll reveal.
 *   FORM:          local-state ledger — real `quizDictionary` shapes through
 *                  `resolveColorDirective` + `forgeBrandPalette`; one vote
 *                  of eight, honestly labeled.
 */

const SATURATION_LABELS: Record<SaturationLevel, string> = {
  neon: 'Neón',
  vibrant: 'Vibrante',
  balanced: 'Equilibrado',
  muted: 'Sutil',
  pastel: 'Pastel',
};

const LIGHTNESS_LABELS: Record<LightnessProfile, string> = {
  deep: 'Profundo',
  dark: 'Oscuro',
  twilight: 'Crepúsculo',
  illuminated: 'Iluminado',
  light: 'Luminoso',
};

const HARMONY_LABELS: Record<HarmonyType, string> = {
  monochromatic: 'Monocromático',
  analogous: 'Análogo',
  complementary: 'Complementario',
  'split-complementary': 'Dividido',
  triadic: 'Triádico',
};

const ROLE_ORDER: readonly PaletteRole[] = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
] as const;

const ROLE_LABELS: Record<PaletteRole, string> = {
  primary: 'Primario',
  secondary: 'Secundario',
  accent: 'Acento',
  background: 'Fondo',
  surface: 'Superficie',
};

/** Roles verified as text against the surface. */
const READABLE_ROLES: readonly PaletteRole[] = ['primary', 'secondary', 'accent'] as const;

/** Stagger between ledger rows (scroll-reveal cascade). */
const ROW_DELAYS = ['180ms', '270ms', '360ms', '450ms'] as const;

/**
 * Del cuestionario al sistema — interactive ledger.
 *
 * @returns {JSX.Element | null} The rendered section, or `null` when the
 * rehearsal question is missing from the dictionary.
 */
export default function SectionPsychology() {
  const { ref, revealed } = useReveal<HTMLDivElement>();

  const lightQuestion = quizQuestions.find((question) => question.id === 'light');
  const [selectedId, setSelectedId] = useState('c');

  const selected =
    lightQuestion?.options.find((option) => option.id === selectedId) ??
    lightQuestion?.options[2];

  const answer: QuizAnswer | null = useMemo(() => {
    if (!lightQuestion || !selected) return null;
    return {
      questionId: lightQuestion.id,
      optionId: selected.id,
      archetype: selected.meta.archetype,
      tags: selected.meta.tags,
      hueShift: selected.meta.hueShift,
      saturationLevel: selected.meta.saturationLevel,
      lightnessProfile: selected.meta.lightnessProfile,
      harmonyType: selected.meta.harmonyType,
    };
  }, [lightQuestion, selected]);

  const directive = useMemo(
    () => (answer ? resolveColorDirective([answer]) : null),
    [answer],
  );

  const palette: BrandPalette | null = useMemo(
    () => (directive ? forgeBrandPalette(directive) : null),
    [directive],
  );

  if (!lightQuestion || !selected || !answer || !directive || !palette) return null;

  const hueSign = selected.meta.hueShift >= 0 ? '+' : '';

  return (
    <section className={styles.section} aria-labelledby="psychology-heading">
      <div className={styles.inner} ref={ref} data-revealed={revealed || undefined}>
        <div className={styles.block}>
          <h2 id="psychology-heading" className={clsx(styles.title, styles.revealItem)} style={{ transitionDelay: '0ms' }}>
            De la intuición al sistema
          </h2>
          <p className={clsx(styles.lede, styles.revealItem)} style={{ transitionDelay: '90ms' }}>
            El cuestionario no pregunta por colores. Pregunta por espacios,
            sonidos y materiales — y cada respuesta vota en cuatro dimensiones
            del motor. Ensaya una aquí, con la maquinaria a la vista.
          </p>
          <ol className={clsx(styles.arc, styles.revealItem)} style={{ transitionDelay: '180ms' }} aria-label="Recorrido del cuestionario">
            {quizQuestions.map((question) => (
              <li
                key={question.id}
                className={styles.arcItem}
                data-active={question.id === 'light' || undefined}
              >
                {question.focus}
              </li>
            ))}
          </ol>
        </div>

        <div className={clsx(styles.row, styles.revealItem)} style={{ transitionDelay: ROW_DELAYS[1] }}>
          <div className={styles.marker} aria-hidden="true">
            <span className={styles.markerIndex}>01</span>
            <span className={styles.markerLine} />
          </div>
          <div className={styles.rowBody}>
            <h3 className={styles.rowTitle}>La pregunta</h3>
            <p className={styles.question}>{lightQuestion.question}</p>
            <div className={styles.options} role="group" aria-label="Opciones de ensayo">
              {lightQuestion.options.map((option) => {
                const isActive = option.id === selected.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={styles.option}
                    aria-pressed={isActive}
                    data-active={isActive || undefined}
                    onClick={() => setSelectedId(option.id)}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    <span className={styles.optionDescription}>{option.description}</span>
                  </button>
                );
              })}
            </div>
            <ul className={styles.chips} aria-label="Carga oculta de la opción elegida">
              <li className={styles.chip} title="Desplazamiento de tono">
                {hueSign}
                {selected.meta.hueShift}°
              </li>
              <li className={styles.chip} title="Intensidad cromática">
                {SATURATION_LABELS[selected.meta.saturationLevel]}
              </li>
              <li className={styles.chip} title="Perfil de valor">
                {LIGHTNESS_LABELS[selected.meta.lightnessProfile]}
              </li>
              <li className={styles.chip} title="Armonía votada">
                {HARMONY_LABELS[selected.meta.harmonyType]}
              </li>
              <li className={styles.chip} title="Arquetipo">
                {selected.meta.archetype}
              </li>
            </ul>
          </div>
        </div>

        <div className={clsx(styles.row, styles.rowOffset, styles.revealItem)} style={{ transitionDelay: ROW_DELAYS[2] }}>
          <div className={styles.marker} aria-hidden="true">
            <span className={styles.markerIndex}>02</span>
            <span className={styles.markerLine} />
          </div>
          <div className={styles.rowBody}>
            <h3 className={styles.rowTitle}>La directiva</h3>
            <p className={styles.rowText}>
              Tu elección vota en cuatro dimensiones. El motor promedia los
              ocho votos del cuestionario para forjar la identidad final.
            </p>
            <p className={styles.directive} role="status">
              base {Math.round(directive.baseHue)}° · deriva {hueSign}
              {selected.meta.hueShift}° · croma {directive.saturationScore.toFixed(2)} ·
              valor {directive.lightnessScore.toFixed(2)} ·{' '}
              {HARMONY_LABELS[directive.harmonyType].toLowerCase()}
            </p>
            <p className={styles.rowNote}>Un voto de ocho — aquí ensayas uno.</p>
          </div>
        </div>

        <div className={clsx(styles.row, styles.revealItem)} style={{ transitionDelay: ROW_DELAYS[3] }}>
          <div className={styles.marker} aria-hidden="true">
            <span className={styles.markerIndex}>03</span>
            <span className={styles.markerLine} />
          </div>
          <div className={styles.rowBody}>
            <h3 className={styles.rowTitle}>El sistema</h3>
            <p className={styles.rowText}>
              La directiva se forja en cinco roles, verificados en contraste AA
              sobre la superficie.
            </p>
            <ul className={styles.strip} aria-label="Sistema forjado del voto de ensayo">
              {ROLE_ORDER.map((role) => {
                const hex = palette[role];
                const isReadable = READABLE_ROLES.includes(role);
                const readable = isTextReadable(hex, palette.surface);
                return (
                  <li key={role} className={styles.stripItem}>
                    <span
                      className={styles.stripSwatch}
                      style={{ backgroundColor: hex }}
                      aria-hidden="true"
                    />
                    <span className={styles.stripRole}>{ROLE_LABELS[role]}</span>
                    <code className={styles.stripHex}>{hex}</code>
                    {isReadable ? (
                      <span
                        className={styles.aaDot}
                        data-pass={readable || undefined}
                        title={readable ? 'Contraste AA superado' : 'Sin contraste AA'}
                        aria-hidden="true"
                      />
                    ) : (
                      <span className={styles.baseTag} aria-hidden="true">
                        base
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
