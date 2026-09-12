import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useEntrance } from '@/hooks/useEntrance';
import styles from './RouteTransition.module.scss';

/**
 * RouteTransition — route-change entrance (state-driven crossfade).
 *
 * Wraps the routed content and replays a fast entrance on every navigation:
 * the wrapper is born hidden and `useEntrance`, keyed by pathname plus
 * search, flips the visible class after two painted animation frames, so the
 * crossfade survives React 19 Strict Mode where mount-time keyframes skip
 * their start frame. There is no exit animation and no second page held in
 * the DOM; the old page disappears instantly while scroll restoration snaps
 * to the top, and the new page fades in from opacity 0.
 *
 * Motion contract: opacity plus translate only. The crossfade intentionally
 * stays active under reduced-motion settings because it is core navigation
 * feedback. The wrapper remains a flex-column flex item so route sections
 * relying on the shell flex layout keep their exact geometry.
 */

interface RouteTransitionProps {
  /** The routed content (`<Routes>` output). */
  readonly children: ReactNode;
}

/**
 * Wraps routed content with a state-driven crossfade entrance.
 *
 * @param {RouteTransitionProps} props The routed content.
 * @returns {JSX.Element} The transition wrapper.
 */
export default function RouteTransition({ children }: RouteTransitionProps) {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  const visible = useEntrance(0, routeKey);

  return (
    <div className={clsx(styles.transition, visible && styles.visible)}>
      {children}
    </div>
  );
}
