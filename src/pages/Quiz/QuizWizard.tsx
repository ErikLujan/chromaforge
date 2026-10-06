import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { quizQuestions } from '@/data/quizDictionary';
import type { QuizAnswer, QuizOption, QuizQuestion } from '@/data/quizDictionary';
import { useBrandStore } from '@/store/useBrandStore';
import { PALETTE_ROLES } from '@/utils/color.utils';
import type { Json } from '@/types/supabase.types';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNoIndex } from '@/hooks/useNoIndex';
import styles from './QuizWizard.module.scss';

/**
 * QuizWizard — interactive brand intake.
 *
 * Opens on a Step 0 intro screen framing the interview before the first
 * question; starting and every step change run through the same
 * GPU-composited drift (opacity and transform only). State stays local to the
 * wizard: a started flag gating intro versus question stage, the step index,
 * the accumulating answers, the active selection, and the transition phase.
 * Answers mirror into a ref so the completion sequence always reads the final
 * list regardless of render timing.
 */

type Phase = 'entering' | 'stable' | 'leaving';

/** Feedback pause after a selection before the step advances. */
const ADVANCE_DELAY_MS = 400;

/** Duration of the opacity/transform drift between steps. */
const TRANSITION_MS = 260;

/** Visual letters that label the four option cards. */
const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

/** The completion sequence stages, in order. */
type CompletionPhase = 'forging' | 'saving';

/** Spanish short date ("17 ago") used to name the auto-saved identity. */
function shortDate(): string {
  return new Date()
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    .replace(/\.$/, '');
}

/**
 * Derives a deterministic HSL seed color from the selected answers by hashing
 * their conceptual tags. Pure and deterministic: the same answers always
 * produce the same seed, which the palette engine turns into a full identity.
 *
 * @param {readonly QuizAnswer[]} answers The collected answers, in order.
 * @returns {string} An HSL color usable as a generation seed.
 */
function deriveSeedColor(answers: readonly QuizAnswer[]): string {
  const tokens = answers.flatMap((answer) => answer.tags).join('|');

  let hash = 2166136261;
  for (let i = 0; i < tokens.length; i += 1) {
    hash ^= tokens.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 55%)`;
}

/**
 * ChromaForge Quiz Wizard.
 *
 * A focused, single-screen-per-question intake over a fixed radial mesh.
 * The step counter and a gradient progress hairline sit above the question,
 * four large glass option cards below it, and a quiet exit plus intent hint
 * at the foot. On the final answer the wizard shows a short forging state,
 * triggers the palette engine, and routes to the results workspace.
 *
 * @returns {JSX.Element} The rendered quiz wizard.
 */
export default function QuizWizard() {
  useDocumentTitle('Cuestionario');
  useNoIndex();

  const navigate = useNavigate();
  const generateBrandPalette = useBrandStore((state) => state.generateBrandPalette);
  const saveBrand = useBrandStore((state) => state.saveBrand);

  const [hasStarted, setHasStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('entering');
  const [isSlidingBack, setIsSlidingBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionPhase, setCompletionPhase] = useState<CompletionPhase>('forging');

  const questionRef = useRef<HTMLHeadingElement>(null);
  const optionsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const answersRef = useRef<readonly QuizAnswer[]>([]);
  const advanceTimerRef = useRef<number | null>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);

  const totalQuestions = quizQuestions.length;
  const currentQuestion = quizQuestions[index];
  const progress = (index + 1) / totalQuestions;

  useEffect(() => {
    if (mountedRef.current && hasStarted) {
      questionRef.current?.focus({ preventScroll: true });
    }
    mountedRef.current = true;

    const settleTimer = window.setTimeout(() => {
      setPhase('stable');
      setIsSlidingBack(false);
    }, 30);
    return () => window.clearTimeout(settleTimer);
  }, [hasStarted, index, isSubmitting]);

  useEffect(() => {
    const advanceTimer = advanceTimerRef.current;
    const leaveTimer = leaveTimerRef.current;

    return () => {
      if (advanceTimer !== null) window.clearTimeout(advanceTimer);
      if (leaveTimer !== null) window.clearTimeout(leaveTimer);
    };
  }, []);

  /**
   * Starts the interview from Step 0: drifts the intro screen out with the
   * same GPU-composited transition used between questions, then lands on
   * question one. Purely visual gating — no answers exist yet, so the data
   * payload flow is untouched.
   *
   * @returns {void}
   */
  const startQuiz = useCallback(() => {
    if (phase === 'leaving') return;

    setPhase('leaving');
    leaveTimerRef.current = window.setTimeout(() => {
      setHasStarted(true);
      setPhase('entering');
    }, TRANSITION_MS);
  }, [phase]);

  /**
   * Steps backward through the interview with a mirrored drift (exit right,
   * enter from left) so backward travel reads as the reverse of forward
   * travel. From the first question it lands back on the Step 0 intro; the
   * discarded answer is popped so re-answering records exactly once. The
   * progress hairline and counter derive from `index` and follow for free.
   * Blocked while a selection is mid-flight or the completion runs.
   *
   * @returns {void}
   */
  const goBack = useCallback(() => {
    if (!hasStarted || isSubmitting || phase === 'leaving' || selectedId !== null) return;

    setIsSlidingBack(true);
    setPhase('leaving');
    leaveTimerRef.current = window.setTimeout(() => {
      answersRef.current = answersRef.current.slice(0, -1);
      if (index === 0) {
        setHasStarted(false);
      } else {
        setIndex((current) => current - 1);
      }
      setSelectedId(null);
      setPhase('entering');
    }, TRANSITION_MS);
  }, [hasStarted, isSubmitting, phase, selectedId, index]);

  const canGoBack = hasStarted && !isSubmitting && phase !== 'leaving' && selectedId === null;

  /**
   * Completes the wizard: derives a seed from every collected answer, runs
   * the palette engine, auto-saves the resulting identity to the visitor's
   * library, and lands them in the results workspace. Saving happens before
   * the route change so the palette is already persisted when the workspace
   * appears — the manual "Guardar" becomes the fallback when this fails.
   *
   * @returns {Promise<void>}
   */
  const completeWizard = useCallback(async () => {
    const answers = answersRef.current;
    const seed = deriveSeedColor(answers);
    await generateBrandPalette(seed, answers);

    const activePalette = useBrandStore.getState().activePalette;
    if (activePalette) {
      setCompletionPhase('saving');

      const quizAnswers: Json = {
        questions: answers.map((answer) => ({
          questionId: answer.questionId,
          optionId: answer.optionId,
          archetype: answer.archetype,
          tags: [...answer.tags],
          hueShift: answer.hueShift,
          saturationLevel: answer.saturationLevel,
          lightnessProfile: answer.lightnessProfile,
          harmonyType: answer.harmonyType,
        })),
      };

      const saved = await saveBrand({
        name: `Identidad generada · ${shortDate()}`,
        colors: PALETTE_ROLES.map((role) => activePalette[role]),
        quiz_answers: quizAnswers,
      });

      if (!saved) {
        toast.error('No se pudo guardar tu identidad.');
      }
    }

    navigate('/dashboard', { replace: true });
  }, [generateBrandPalette, navigate, saveBrand]);

  /**
   * Handles an option selection: records the answer, shows the selected
   * state, then advances to the next step after the feedback delay — or
   * starts the completion sequence on the final question.
   *
   * @param {QuizQuestion} question The active question.
   * @param {QuizOption} option The chosen option.
   * @returns {void}
   */
  const handleSelect = useCallback(
    (question: QuizQuestion, option: QuizOption) => {
      if (selectedId !== null || isSubmitting || phase === 'leaving') return;

      const answer: QuizAnswer = {
        questionId: question.id,
        optionId: option.id,
        archetype: option.meta.archetype,
        tags: option.meta.tags,
        hueShift: option.meta.hueShift,
        saturationLevel: option.meta.saturationLevel,
        lightnessProfile: option.meta.lightnessProfile,
        harmonyType: option.meta.harmonyType,
      };
      const nextAnswers = [...answersRef.current, answer];
      answersRef.current = nextAnswers;
      setSelectedId(option.id);

      const isLast = question.id === quizQuestions[quizQuestions.length - 1].id;

      advanceTimerRef.current = window.setTimeout(() => {
        setPhase('leaving');

        leaveTimerRef.current = window.setTimeout(() => {
          if (isLast) {
            setIsSubmitting(true);
            void completeWizard();
          } else {
            setIndex((current) => current + 1);
            setSelectedId(null);
            setPhase('entering');
          }
        }, TRANSITION_MS);
      }, ADVANCE_DELAY_MS);
    },
    [completeWizard, isSubmitting, selectedId, phase],
  );

  /**
   * Moves focus within the option radiogroup without selecting: arrows cycle
   * through the four options (wrapping at the ends), Home jumps to the first
   * and End to the last. Selection stays on Enter/Space through the native
   * buttons, so arrowing can never submit an answer by accident. Blocked
   * while a selection is mid-flight.
   *
   * @param {ReactKeyboardEvent<HTMLDivElement>} event The key down event.
   * @returns {void}
   */
  const handleOptionsKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const isNext = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      const isPrev = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
      const isFirst = event.key === 'Home';
      const isLast = event.key === 'End';
      if (!isNext && !isPrev && !isFirst && !isLast) return;
      if (selectedId !== null) return;

      event.preventDefault();
      const buttons = optionsRef.current.filter(
        (button): button is HTMLButtonElement => button !== null,
      );
      if (buttons.length === 0) return;

      if (isFirst) {
        buttons[0]?.focus();
        return;
      }
      if (isLast) {
        buttons[buttons.length - 1]?.focus();
        return;
      }

      const activeIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const nextIndex =
        (activeIndex + (isNext ? 1 : -1) + buttons.length) % buttons.length;
      buttons[nextIndex]?.focus();
    },
    [selectedId],
  );

  const stageClass = clsx(
    styles.stage,
    phase === 'entering' && (isSlidingBack ? styles.stageEnteringBack : styles.stageEntering),
    phase === 'leaving' && (isSlidingBack ? styles.stageLeavingBack : styles.stageLeaving),
  );

  return (
    <section className={styles.quiz} aria-label="Cuestionario de identidad">
      <div className={styles.background} aria-hidden="true" />

      <div className={styles.container}>
        {isSubmitting ? (
          <div className={styles.completion} role="status" aria-live="polite">
            <span className={styles.completionMark} aria-hidden="true">
              <Sparkles size={20} />
            </span>
            <h2 className={styles.completionTitle}>
              {completionPhase === 'forging'
                ? 'Forjando tu identidad…'
                : 'Guardando tu identidad…'}
            </h2>
            <p className={styles.completionText}>
              {completionPhase === 'forging'
                ? 'Traducimos tus respuestas en un sistema cromático con contraste AA verificado.'
                : 'Persistimos tu identidad en la biblioteca antes de llevarte al panel.'}
            </p>
            {/* Forge indicator — five dots for the five palette roles being
                computed, a travelling pulse rather than a generic spinner.
                Hidden from assistive tech: the status container already
                announces the forging state. */}
            <span className={styles.forgeLoader} aria-hidden="true">
              {Array.from({ length: 5 }, (_, dotIndex) => (
                <span key={dotIndex} className={styles.forgeLoaderDot} />
              ))}
            </span>
          </div>
        ) : (
          <>
            {hasStarted ? (
              <>
                <header className={styles.progressHeader}>
                  <span className={styles.kicker}>{currentQuestion.focus}</span>
                  <span
                    className={styles.counter}
                    aria-label={`Pregunta ${index + 1} de ${totalQuestions}`}
                  >
                    {String(index + 1).padStart(2, '0')}
                    <span className={styles.counterSlash} aria-hidden="true">
                      {' '}/{' '}
                    </span>
                    {String(totalQuestions).padStart(2, '0')}
                  </span>
                </header>

                {/* Segmented progress track — one hairline per question, each
                    fill animating on the compositor (scaleX only). Hidden from
                    assistive tech: the mono counter already announces progress. */}
                <div className={styles.progressTrack} aria-hidden="true">
                  {quizQuestions.map((question, segmentIndex) => (
                    <span key={question.id} className={styles.progressSegment}>
                      <span
                        className={styles.progressFill}
                        style={
                          {
                            '--progress':
                              segmentIndex < index
                                ? 1
                                : segmentIndex === index
                                  ? progress
                                  : 0,
                          } as CSSProperties
                        }
                      />
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            {hasStarted ? (
              <div className={stageClass}>
                <h1
                  ref={questionRef}
                  id="quiz-question-heading"
                  tabIndex={-1}
                  className={styles.question}
                  aria-live="polite"
                >
                  {currentQuestion.question}
                </h1>

                <div
                  className={styles.options}
                  role="radiogroup"
                  aria-labelledby="quiz-question-heading"
                  onKeyDown={handleOptionsKeyDown}
                >
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isSelected = selectedId === option.id;
                    return (
                      <button
                        key={option.id}
                        ref={(element) => {
                          optionsRef.current[optionIndex] = element;
                        }}
                        type="button"
                        className={clsx(
                          styles.option,
                          isSelected && styles.optionSelected,
                        )}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelect(currentQuestion, option)}
                      >
                        <span className={styles.optionTop}>
                          <span className={styles.optionLetter} aria-hidden="true">
                            {OPTION_LETTERS[optionIndex]}
                          </span>
                          {isSelected ? (
                            <Check className={styles.optionCheck} size={16} aria-hidden="true" />
                          ) : null}
                        </span>
                        <span className={styles.optionTitle}>{option.label}</span>
                        <span className={styles.optionDescription}>
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className={clsx(stageClass, styles.stageIntro)}>
                <div className={styles.intro}>
                  <p className={styles.introKicker}>
                    Motor de identidad algorítmica
                  </p>
                  <h1 ref={questionRef} tabIndex={-1} className={styles.introTitle}>
                    Descubre tu identidad algorítmica
                  </h1>
                  <p className={styles.introText}>
                    Ocho decisiones aparentemente abstractas bastan. La psicología
                    de tus respuestas alimenta un motor matemático que forja un
                    sistema cromático completo para tu marca.
                  </p>
                  <p className={styles.introMeta}>
                    {String(totalQuestions).padStart(2, '0')} preguntas · ~2 minutos
                    · Contraste AA verificado
                  </p>
                  <button
                    type="button"
                    className={styles.cta}
                    onClick={startQuiz}
                    autoFocus
                  >
                    Comenzar cuestionario
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            <footer className={styles.foot}>
              <div className={styles.footNav}>
                <Link to="/dashboard" className={styles.exit}>
                  <ArrowLeft size={14} aria-hidden="true" />
                  Salir del cuestionario
                </Link>
                {hasStarted ? (
                  <button
                    type="button"
                    className={styles.back}
                    onClick={goBack}
                    disabled={!canGoBack}
                  >
                    <ChevronLeft size={14} aria-hidden="true" />
                    Anterior
                  </button>
                ) : null}
              </div>
              <span className={styles.hint}>
                {hasStarted
                  ? 'Tus respuestas definen el sistema cromático de tu marca.'
                  : 'Matemática y psicología, al servicio de tu marca.'}
              </span>
            </footer>
          </>
        )}
      </div>
    </section>
  );
}