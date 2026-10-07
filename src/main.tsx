import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.scss'
import App from './App.tsx'
import SplashScreen from './components/layout/SplashScreen'
import { useAuthStore } from './store/useAuthStore'
import { paintMotionAttribute } from './store/useMotionStore'

// Motion hydrate guarantee (before the first render): paint the resolved
// `data-motion` (persisted choice first, OS preference second — motion ON by
// default) so reveals and the hero background boot in the correct mode
// without an off/on toggle cycle. The store re-syncs on every later change.
paintMotionAttribute();

// Hard-load scroll guarantee (module scope, before the first render): the
// browser restores the previous scroll offset on reload or URL entry, while
// in-app navigations are owned by ScrollRestoration. Manual mode plus an
// immediate climb ensures every hard load starts at the hero.
try {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
} catch {
  /* Non-DOM environment — routing still lands callers at the top. */
}

// Restore the persisted Supabase session before the first paint so guarded
// routes and the auth UI render the correct state from the start.
void useAuthStore.getState().initialize().catch((error) => {
  console.error('No se pudo restaurar la sesión de usuario:', error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SplashScreen />
    <App />
  </StrictMode>,
)
