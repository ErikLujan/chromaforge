import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import LandingLayout from './components/layout/LandingLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PublicRoute from './components/layout/PublicRoute';
import ScrollRestoration from './components/layout/ScrollRestoration';
import AuthVeil from './components/layout/AuthVeil';
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
// Application Root — Router, Layout Split & Global Feedback
//
// Layout architecture (Batch 2 — one chrome per visitor intent):
//   LandingLayout   → public persuasion surfaces: `/`, `/privacy`, `/terms`,
//                     `/cookies`, `/docs` and `*`. Slim conversion header,
//                     fixed static wash, minimal single-row footer.
//   DashboardLayout → authenticated workspace: `/dashboard`, `/quiz`,
//                     `/brands`, `/profile`. Full header with avatar menu,
//                     footer-free so every pixel belongs to the task.
//   Layout-free     → `/auth` (standalone split-screen with its own brand
//                     link home), `/forgot-password` and `/update-password`
//                     (focused standalone instrument surfaces).
//
// Each layout owns its `<main>` and wraps its `<Outlet />` in
// RouteTransition, so route crossfades survive the split. ScrollRestoration,
// WorkspaceReset and the global Toaster stay at the shell level above all
// layouts.
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

function Shell() {
  return (
    <>
      <ScrollRestoration />
      <WorkspaceReset />
      <AuthVeil />
      <Routes>
        <Route element={<LandingLayout />}>
          <Route path="/" element={<Home />} />
          {/* Public markdown-driven documents — reachable from the minimal
              landing footer, so they must never sit behind auth. */}
          <Route path="/privacy" element={<LegalPage slug="privacy" />} />
          <Route path="/terms" element={<LegalPage slug="terms" />} />
          <Route path="/cookies" element={<LegalPage slug="cookies" />} />
          <Route path="/docs" element={<LegalPage slug="docs" />} />
          {/* Unmatched paths render the dedicated 404 stage inside landing
              chrome, so the visitor keeps a way back. */}
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<DashboardLayout />}>
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
        </Route>

        {/* Layout-free: the auth split-screen owns its own brand link home,
            so no shell chrome surrounds it. */}
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
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
