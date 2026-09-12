import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.scss'
import App from './App.tsx'
import SplashScreen from './components/layout/SplashScreen'
import { useAuthStore } from './store/useAuthStore'

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
