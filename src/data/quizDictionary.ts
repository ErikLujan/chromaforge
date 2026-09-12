// ===========================================================================
// Quiz Dictionary — Psychological Intake for the Color Algorithm
//
// The wizard's data source. Eight deep, abstract questions — deliberately not
// a form. Each option carries a hidden metadata payload that the generation
// engine consumes along four independent color dimensions:
//
// - `archetype` / `tags`  → the conceptual fingerprint (and the deterministic
//   base hue, hashed from the chosen archetypes).
// - `hueShift`            → degrees added on top of that base hue.
// - `saturationLevel`     → the chroma intent (pastel → neon).
// - `lightnessProfile`    → the value intent (deep obsidian → luminous light).
// - `harmonyType`         → how secondary and accent relate to the primary.
//
// The answer is psychology; the payload is the math's input. Every word is
// Premium Spanish by design — this file IS the product voice.
// ===========================================================================

/** Chroma intent for a generated identity, from soft washes to full glow. */
export type SaturationLevel = 'neon' | 'vibrant' | 'balanced' | 'muted' | 'pastel';

/** Value intent — drives both surface tones and role lightness bands. */
export type LightnessProfile = 'deep' | 'dark' | 'twilight' | 'illuminated' | 'light';

/** How the secondary and accent hues relate to the primary hue. */
export type HarmonyType =
  | 'monochromatic'
  | 'analogous'
  | 'complementary'
  | 'split-complementary'
  | 'triadic';

/** The hidden payload attached to every option. */
export interface QuizOptionMeta {
  /**
   * The dominant concept of the option — a single, high-signal keyword the
   * algorithm hashes into the deterministic base hue.
   */
  readonly archetype: string;
  /** Secondary conceptual tags that qualify the archetype. */
  readonly tags: readonly string[];
  /** Degrees added to the deterministic base hue (−45 … +45). */
  readonly hueShift: number;
  /** The chroma intent this option votes for. */
  readonly saturationLevel: SaturationLevel;
  /** The value intent this option votes for. */
  readonly lightnessProfile: LightnessProfile;
  /** The hue relationship this option votes for. */
  readonly harmonyType: HarmonyType;
}

/** One selectable answer within a question. */
export interface QuizOption {
  readonly id: string;
  /** The option's short, evocative title. */
  readonly label: string;
  /** A brief line that paints the option in a single breath. */
  readonly description: string;
  /** The hidden payload the algorithm consumes. */
  readonly meta: QuizOptionMeta;
}

/** A single wizard step. */
export interface QuizQuestion {
  readonly id: string;
  /** A one-word framing that orients the reader before the question. */
  readonly focus: string;
  /** The abstract question itself, written to reward reflection. */
  readonly question: string;
  /** Exactly four options, rendered as distinct cards. */
  readonly options: readonly QuizOption[];
}

/** A captured user answer, ready for the generation engine. */
export interface QuizAnswer {
  readonly questionId: string;
  readonly optionId: string;
  /** Mirrors `QuizOptionMeta.archetype` for direct access. */
  readonly archetype: string;
  /** Mirrors `QuizOptionMeta.tags` for direct access. */
  readonly tags: readonly string[];
  /** Mirrors `QuizOptionMeta.hueShift`. */
  readonly hueShift: number;
  /** Mirrors `QuizOptionMeta.saturationLevel`. */
  readonly saturationLevel: SaturationLevel;
  /** Mirrors `QuizOptionMeta.lightnessProfile`. */
  readonly lightnessProfile: LightnessProfile;
  /** Mirrors `QuizOptionMeta.harmonyType`. */
  readonly harmonyType: HarmonyType;
}

/**
 * The full wizard script. Read left to right it forms an arc —
 * space → sound → material → light → movement → tone → audience → archetype —
 * each question drawing the brand further out of its category and deeper into
 * its character while the payloads accumulate a complete color directive.
 */
export const quizQuestions: readonly QuizQuestion[] = [
  {
    id: 'space',
    focus: 'Espacio',
    question:
      'Si tu marca fuera un entorno arquitectónico, ¿cómo sería?',
    options: [
      {
        id: 'a',
        label: 'Un pabellón minimalista',
        description:
          'Volúmenes puros, luz calibrada y una geometría que respira en silencio.',
        meta: {
          archetype: 'minimalist',
          tags: ['minimalist', 'restrained', 'precise'],
          hueShift: -12,
          saturationLevel: 'muted',
          lightnessProfile: 'illuminated',
          harmonyType: 'monochromatic',
        },
      },
      {
        id: 'b',
        label: 'Una estructura orgánica',
        description:
          'Formas que crecen con el terreno, curvas suaves y materiales que envejecen con dignidad.',
        meta: {
          archetype: 'organic',
          tags: ['organic', 'natural', 'warm'],
          hueShift: 8,
          saturationLevel: 'muted',
          lightnessProfile: 'twilight',
          harmonyType: 'analogous',
        },
      },
      {
        id: 'c',
        label: 'Un monumento brutalista',
        description:
          'Hormigón visto, escala imponente y una presencia que no pide permiso.',
        meta: {
          archetype: 'bold',
          tags: ['bold', 'monumental', 'raw'],
          hueShift: 0,
          saturationLevel: 'balanced',
          lightnessProfile: 'deep',
          harmonyType: 'complementary',
        },
      },
      {
        id: 'd',
        label: 'Una torre de vanguardia',
        description:
          'Cristal, acero y líneas que anticipan el futuro desde cada ángulo.',
        meta: {
          archetype: 'futuristic',
          tags: ['futuristic', 'dynamic', 'precise'],
          hueShift: 24,
          saturationLevel: 'neon',
          lightnessProfile: 'dark',
          harmonyType: 'split-complementary',
        },
      },
    ],
  },
  {
    id: 'sound',
    focus: 'Sonido',
    question: 'Si tu marca fuera un sonido, ¿cuál sería?',
    options: [
      {
        id: 'a',
        label: 'El silencio que sostiene',
        description:
          'Una pausa profunda donde cada detalle se escucha con nitidez.',
        meta: {
          archetype: 'calm',
          tags: ['calm', 'focused', 'quiet'],
          hueShift: -20,
          saturationLevel: 'pastel',
          lightnessProfile: 'illuminated',
          harmonyType: 'monochromatic',
        },
      },
      {
        id: 'b',
        label: 'Un ritmo hipnótico',
        description:
          'Una percusión constante que construye energía sin prisa.',
        meta: {
          archetype: 'rhythmic',
          tags: ['rhythmic', 'energetic', 'driving'],
          hueShift: 16,
          saturationLevel: 'vibrant',
          lightnessProfile: 'dark',
          harmonyType: 'triadic',
        },
      },
      {
        id: 'c',
        label: 'Una melodía cálida',
        description:
          'Acordes acústicos que envuelven y generan confianza al instante.',
        meta: {
          archetype: 'warm',
          tags: ['warm', 'melodic', 'approachable'],
          hueShift: 36,
          saturationLevel: 'muted',
          lightnessProfile: 'twilight',
          harmonyType: 'analogous',
        },
      },
      {
        id: 'd',
        label: 'Un pulso sintético',
        description:
          'Frecuencias electrónicas que rozan el futuro y desafían lo conocido.',
        meta: {
          archetype: 'synthetic',
          tags: ['synthetic', 'futuristic', 'bold'],
          hueShift: -30,
          saturationLevel: 'neon',
          lightnessProfile: 'deep',
          harmonyType: 'split-complementary',
        },
      },
    ],
  },
  {
    id: 'material',
    focus: 'Material',
    question: 'Si tu marca fuera un material al tacto, ¿cuál sería?',
    options: [
      {
        id: 'a',
        label: 'Piedra pulida',
        description:
          'Fría al principio, cálida después; una superficie que invita a la permanencia.',
        meta: {
          archetype: 'solid',
          tags: ['solid', 'timeless', 'premium'],
          hueShift: -8,
          saturationLevel: 'muted',
          lightnessProfile: 'illuminated',
          harmonyType: 'monochromatic',
        },
      },
      {
        id: 'b',
        label: 'Madera envejecida',
        description:
          'Grano honesto y textura que cuenta décadas de historias.',
        meta: {
          archetype: 'heritage',
          tags: ['heritage', 'organic', 'warm'],
          hueShift: 28,
          saturationLevel: 'muted',
          lightnessProfile: 'twilight',
          harmonyType: 'analogous',
        },
      },
      {
        id: 'c',
        label: 'Acero cepillado',
        description:
          'Reflejos industriales y una precisión que promete exactitud.',
        meta: {
          archetype: 'industrial',
          tags: ['industrial', 'engineered', 'precise'],
          hueShift: -16,
          saturationLevel: 'balanced',
          lightnessProfile: 'dark',
          harmonyType: 'complementary',
        },
      },
      {
        id: 'd',
        label: 'Seda densa',
        description:
          'Suavidad que sugiere lujo contenido y una elegancia silenciosa.',
        meta: {
          archetype: 'refined',
          tags: ['refined', 'luxurious', 'elegant'],
          hueShift: 4,
          saturationLevel: 'pastel',
          lightnessProfile: 'light',
          harmonyType: 'monochromatic',
        },
      },
    ],
  },
  {
    id: 'light',
    focus: 'Luz',
    question: '¿En qué momento de la luz vive tu marca?',
    options: [
      {
        id: 'a',
        label: 'El amanecer',
        description:
          'Una claridad que promete comienzos, frescura y posibilidades.',
        meta: {
          archetype: 'dawn',
          tags: ['fresh', 'optimistic', 'soft'],
          hueShift: 12,
          saturationLevel: 'pastel',
          lightnessProfile: 'light',
          harmonyType: 'analogous',
        },
      },
      {
        id: 'b',
        label: 'El mediodía',
        description:
          'Luz directa, colores vibrantes y una energía que no admite dudas.',
        meta: {
          archetype: 'noon',
          tags: ['vibrant', 'confident', 'bold'],
          hueShift: 0,
          saturationLevel: 'vibrant',
          lightnessProfile: 'illuminated',
          harmonyType: 'triadic',
        },
      },
      {
        id: 'c',
        label: 'El crepúsculo',
        description:
          'Sombras largas, tonos cálidos y la serenidad del final del día.',
        meta: {
          archetype: 'dusk',
          tags: ['warm', 'serene', 'nostalgic'],
          hueShift: 20,
          saturationLevel: 'balanced',
          lightnessProfile: 'twilight',
          harmonyType: 'complementary',
        },
      },
      {
        id: 'd',
        label: 'La medianoche',
        description:
          'Un azul profundo, neones contenidos y el poder del misterio.',
        meta: {
          archetype: 'midnight',
          tags: ['nocturnal', 'mysterious', 'dramatic'],
          hueShift: -24,
          saturationLevel: 'neon',
          lightnessProfile: 'deep',
          harmonyType: 'split-complementary',
        },
      },
    ],
  },
  {
    id: 'motion',
    focus: 'Movimiento',
    question: 'Si tu marca fuera un movimiento, ¿cómo se movería?',
    options: [
      {
        id: 'a',
        label: 'Con paso firme',
        description:
          'Determinación tranquila; cada paso calculado, sin ruido innecesario.',
        meta: {
          archetype: 'steady',
          tags: ['confident', 'steady', 'grounded'],
          hueShift: -6,
          saturationLevel: 'balanced',
          lightnessProfile: 'dark',
          harmonyType: 'monochromatic',
        },
      },
      {
        id: 'b',
        label: 'Con fluidez total',
        description:
          'Un flujo continuo que se adapta a cualquier terreno sin esfuerzo.',
        meta: {
          archetype: 'fluid',
          tags: ['fluid', 'adaptive', 'seamless'],
          hueShift: 14,
          saturationLevel: 'balanced',
          lightnessProfile: 'twilight',
          harmonyType: 'analogous',
        },
      },
      {
        id: 'c',
        label: 'Con un salto audaz',
        description:
          'Un gesto imprevisible que rompe la expectativa y llama la atención.',
        meta: {
          archetype: 'daring',
          tags: ['bold', 'playful', 'daring'],
          hueShift: 30,
          saturationLevel: 'neon',
          lightnessProfile: 'dark',
          harmonyType: 'complementary',
        },
      },
      {
        id: 'd',
        label: 'Con elegancia contenida',
        description:
          'Precisión quirúrgica, gracia medida y cero desperdicio.',
        meta: {
          archetype: 'graceful',
          tags: ['refined', 'precise', 'elegant'],
          hueShift: -10,
          saturationLevel: 'muted',
          lightnessProfile: 'light',
          harmonyType: 'monochromatic',
        },
      },
    ],
  },
  {
    id: 'tone',
    focus: 'Tono',
    question: '¿Qué tono emocional debe proyectar tu marca en cada encuentro?',
    options: [
      {
        id: 'a',
        label: 'Serena y contemplativa',
        description:
          'Una voz pausada que invita a detenerse y pensar con calma.',
        meta: {
          archetype: 'serene',
          tags: ['calm', 'contemplative', 'soft'],
          hueShift: -18,
          saturationLevel: 'pastel',
          lightnessProfile: 'illuminated',
          harmonyType: 'monochromatic',
        },
      },
      {
        id: 'b',
        label: 'Vital y contagiosa',
        description:
          'Entusiasmo que se propaga; cada mensaje llega con pulso propio.',
        meta: {
          archetype: 'energetic',
          tags: ['energetic', 'joyful', 'expressive'],
          hueShift: 22,
          saturationLevel: 'vibrant',
          lightnessProfile: 'illuminated',
          harmonyType: 'triadic',
        },
      },
      {
        id: 'c',
        label: 'Sobria y confiable',
        description:
          'Autoridad sin estridencias; palabras que se cumplen siempre.',
        meta: {
          archetype: 'trustworthy',
          tags: ['sober', 'reliable', 'professional'],
          hueShift: -14,
          saturationLevel: 'muted',
          lightnessProfile: 'dark',
          harmonyType: 'complementary',
        },
      },
      {
        id: 'd',
        label: 'Misteriosa y magnética',
        description:
          'Una aura enigmática que despierta curiosidad y no suelta jamás.',
        meta: {
          archetype: 'mysterious',
          tags: ['mysterious', 'magnetic', 'dramatic'],
          hueShift: -26,
          saturationLevel: 'neon',
          lightnessProfile: 'deep',
          harmonyType: 'split-complementary',
        },
      },
    ],
  },
  {
    id: 'audience',
    focus: 'Audiencia',
    question: '¿Quién cruza la puerta de tu marca, y qué siente al entrar?',
    options: [
      {
        id: 'a',
        label: 'Pioneros que buscan lo nuevo',
        description:
          'Mentes inquietas que quieren llegar primero a donde nadie ha ido.',
        meta: {
          archetype: 'pioneer',
          tags: ['innovative', 'disruptive', 'bold'],
          hueShift: 26,
          saturationLevel: 'neon',
          lightnessProfile: 'dark',
          harmonyType: 'triadic',
        },
      },
      {
        id: 'b',
        label: 'Conocedores del detalle',
        description:
          'Miradas expertas que distinguen el matiz fino y premian el cuidado.',
        meta: {
          archetype: 'connoisseur',
          tags: ['discerning', 'premium', 'refined'],
          hueShift: 6,
          saturationLevel: 'muted',
          lightnessProfile: 'light',
          harmonyType: 'analogous',
        },
      },
      {
        id: 'c',
        label: 'Comunidades que buscan pertenencia',
        description:
          'Personas que encuentran en tu marca un lugar donde ser parte de algo.',
        meta: {
          archetype: 'community',
          tags: ['communal', 'welcoming', 'human'],
          hueShift: 18,
          saturationLevel: 'vibrant',
          lightnessProfile: 'twilight',
          harmonyType: 'complementary',
        },
      },
      {
        id: 'd',
        label: 'Soñadores que huyen de lo ordinario',
        description:
          'Espíritus que prefieren la evocación antes que la explicación.',
        meta: {
          archetype: 'dreamer',
          tags: ['imaginative', 'ethereal', 'poetic'],
          hueShift: -22,
          saturationLevel: 'pastel',
          lightnessProfile: 'deep',
          harmonyType: 'monochromatic',
        },
      },
    ],
  },
  {
    id: 'archetype',
    focus: 'Arquetipo',
    question: 'Si tu marca fuera una figura narrativa, ¿cuál sería?',
    options: [
      {
        id: 'a',
        label: 'El Sabio',
        description:
          'Comprende antes de hablar; su autoridad nace del conocimiento profundo.',
        meta: {
          archetype: 'sage',
          tags: ['wise', 'analytical', 'timeless'],
          hueShift: 0,
          saturationLevel: 'balanced',
          lightnessProfile: 'dark',
          harmonyType: 'monochromatic',
        },
      },
      {
        id: 'b',
        label: 'El Explorador',
        description:
          'Nace para el horizonte abierto; la rutina le resulta invisible.',
        meta: {
          archetype: 'explorer',
          tags: ['adventurous', 'free', 'earthy'],
          hueShift: 34,
          saturationLevel: 'vibrant',
          lightnessProfile: 'twilight',
          harmonyType: 'analogous',
        },
      },
      {
        id: 'c',
        label: 'El Mago',
        description:
          'Transforma lo imposible en experiencia; todos sienten su truco sin verlo.',
        meta: {
          archetype: 'magician',
          tags: ['transformative', 'visionary', 'charismatic'],
          hueShift: -28,
          saturationLevel: 'neon',
          lightnessProfile: 'deep',
          harmonyType: 'split-complementary',
        },
      },
      {
        id: 'd',
        label: 'El Creador',
        description:
          'Da forma a lo que imagina; su obra es su firma y su promesa.',
        meta: {
          archetype: 'creator',
          tags: ['creative', 'expressive', 'original'],
          hueShift: 10,
          saturationLevel: 'pastel',
          lightnessProfile: 'light',
          harmonyType: 'complementary',
        },
      },
    ],
  },
] as const;
