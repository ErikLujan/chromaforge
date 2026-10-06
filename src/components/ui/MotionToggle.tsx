import { Wind } from 'lucide-react';
import { useMotionStore } from '@/store/useMotionStore';
import styles from './MotionToggle.module.scss';

/**
 * MotionToggle — manual animation override (Batch 4).
 *
 * A fixed, icon-only glass control pinned to the viewport's bottom-right:
 * visible mid-scroll, silent otherwise. Flips the persisted motion override,
 * which mirrors to `document.documentElement[data-motion]` and freezes or
 * releases the AuroraField canvas and every `reduced-motion` transition in
 * real time. The status dot reads bright while motion plays, muted while
 * held.
 *
 * @returns {JSX.Element} The rendered toggle.
 */
export default function MotionToggle() {
  const reduced = useMotionStore((state) => state.reduced);
  const toggleReduced = useMotionStore((state) => state.toggleReduced);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-pressed={reduced}
      aria-label={reduced ? 'Activar animaciones' : 'Reducir animaciones'}
      data-reduced={reduced || undefined}
      onClick={toggleReduced}
    >
      <Wind size={18} aria-hidden="true" className={styles.icon} />
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.tooltip} aria-hidden="true">
        {reduced ? 'Activar' : 'Desactivar'}
        <br />
        animaciones
      </span>
    </button>
  );
}
