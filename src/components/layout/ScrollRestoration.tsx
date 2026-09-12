import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollRestoration — route-change scroll reset.
 *
 * React Router preserves the previous page's scroll offset across
 * navigations; this watcher lives inside the router tree and resets the
 * window to the top whenever the location changes. The scroll uses an instant
 * behavior so it overrides the global smooth scrolling: a route change lands
 * the new page at the top immediately instead of visibly animating away.
 *
 * @returns {null} Renders nothing.
 */
export default function ScrollRestoration() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname, location.search]);

  return null;
}