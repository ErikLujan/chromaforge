import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PublicRoute from './components/layout/PublicRoute';
import ScrollRestoration from './components/layout/ScrollRestoration';
import RouteTransition from './components/layout/RouteTransition';
import { Toaster } from './components/ui/Toaster';
import { useBrandStore } from './store/useBrandStore';
import Home from './pages/Home/Home';
import AuthPage from './pages/Auth/AuthPage';
import ForgotPassword from './pages/Auth/ForgotPassword';
import UpdatePassword from './pages/Auth/UpdatePassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Brands from './pages/Brands/Brands';
import QuizWizard from './pages/Quiz/QuizWizard';
import Profile from './pages/Profile/Profile';
import LegalPage from './pages/Legal/LegalPage';
import NotFound from './pages/NotFound/NotFound';

// ===========================================================================
// Application Root — Router, Layout Shell & Global Feedback
//
// Route map:
//   /          → public landing page
//   /auth      → public auth card (redirects signed-in visitors to the
//                workspace — see PublicRoute)
//   /forgot-password → public recovery request (same boundary as /auth)
//   /update-password → protected new-password form (the recovery link
//                establishes the session first, so the guard holds;
//                header/footer withheld — standalone surface)
//   /dashboard → protected workspace (redirects to /auth when signed out)
//   /quiz      → protected wizard-style brand intake (abstract questionnaire)
//   /brands    → protected brand library (saved identities, delete + preview)
//   /profile   → protected account configuration (internal sidebar layout)
//   /privacy   → public markdown-driven legal document (Privacy)
//   /terms     → public markdown-driven legal document (Terms)
//   /cookies   → public markdown-driven legal document (Cookies)
//   /docs      → public markdown-driven documentation index
//   *          → any unmatched path renders the dedicated 404 error stage
//                (NotFound) inside the same shell, with the header/footer
//                navigation intact so the visitor can leave the dead end.
//
// Shell: `#root` is a min-height 100dvh flex column (globals.scss). The header
// is an in-flow sticky bar (`position: sticky; top: 0`), `<main>` is a flex
// column that grows with flex: 1 so its full-bleed section (hero fold or
// centered auth canvas) fills the visible band below the nav bar, and the
// footer is a content-sized flex item pinned to the bottom by the column — on
// short pages it hugs the fold, on long pages it follows the content.
// ===========================================================================

// ===========================================================================
// WorkspaceReset — Unsaved Identity Cleanup
//
// The Results Workspace lives at `/dashboard` (the generated palette replaces
// the Bento Grid in place, never as a separate route). Leaving that surface —
// the logo, a header link, or the browser's back button — must discard any
// unsaved generated palette so a later visit starts clean. Saved identities
// in `savedBrands` are never touched; only the in-memory active palette is
// cleared.
// ===========================================================================

function WorkspaceReset() {
  const location = useLocation();
  const clearActivePalette = useBrandStore((state) => state.clearActivePalette);

  useEffect(() => {
    if (location.pathname !== '/dashboard') {
      clearActivePalette();
    }
  }, [location.pathname, clearActivePalette]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

// ===========================================================================
// Shell — Layout Chrome with Bare-Route Isolation
//
// `/forgot-password` and `/update-password` render as focused standalone
// instrument surfaces: the header and footer are withheld on those paths so
// no navigation reveals the user's state. Every other route keeps the
// standard shell.
// ===========================================================================

function Shell() {
  const location = useLocation();
  const isBareRoute =
    location.pathname === '/forgot-password' || location.pathname === '/update-password';

  return (
    <>
      <ScrollRestoration />
      <WorkspaceReset />
      {!isBareRoute && <Header />}
      <main>
        <RouteTransition>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/update-password"
              element={
                <ProtectedRoute>
                  <UpdatePassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <ProtectedRoute>
                  <QuizWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brands"
              element={
                <ProtectedRoute>
                  <Brands />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            {/* Public markdown-driven documents — reachable from the footer
                on every surface, so they must never sit behind auth. */}
            <Route path="/privacy" element={<LegalPage slug="privacy" />} />
            <Route path="/terms" element={<LegalPage slug="terms" />} />
            <Route path="/cookies" element={<LegalPage slug="cookies" />} />
            <Route path="/docs" element={<LegalPage slug="docs" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RouteTransition>
      </main>
      {!isBareRoute && <Footer />}
      <Toaster />
    </>
  );
}

export default App;
