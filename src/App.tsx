/**
 * RapCap - Main App Component
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import AppLayout from './layouts/AppLayout'
import ReloadPrompt from './components/ReloadPrompt'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { PageLoader } from './components/shared/PageLoader'
import { seedDatabase } from './db/db'

// Lazy-loaded pages
const HomePage = lazy(() => import('./pages/HomePage'))
const RecordPage = lazy(() => import('./pages/RecordPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const DrillsPage = lazy(() => import('./pages/DrillsPage'))
const ObjectWritingPage = lazy(() => import('./pages/ObjectWritingPage'))
const RhymeChainsPage = lazy(() => import('./pages/RhymeChainsPage'))
const SessionDetailsPage = lazy(() => import('./pages/SessionDetailsPage'))
const WordAssociationPage = lazy(() => import('./pages/WordAssociationPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const FlowPatternsPage = lazy(() => import('./pages/FlowPatternsPage'))
const RhymeLibraryPage = lazy(() => import('./pages/RhymeLibraryPage'))
const RhymeEditorPage = lazy(() => import('./pages/RhymeEditorPage'))
const WritingSessionPage = lazy(() => import('./pages/WritingSessionPage'))
// const VerseEditorPage = lazy(() => import('./pages/VerseEditorPage'))
const VerseEditorPage = lazy(() => import('./pages/VerseEditorPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const StudioPage = lazy(() => import('./pages/StudioPage'))

import { Agentation } from 'agentation'

export default function App() {
  // Initialize DB with seed data
  useEffect(() => {
    console.log('[RapCap] 🚀 App mounted. Starting DB seed...');
    seedDatabase()
      .then(() => console.log('[RapCap] ✅ DB Seed completed successfully.'))
      .catch(err => console.error('[RapCap] ❌ DB Seed failed:', err));

    console.log("RapCap started. Build:", typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : "Development");
  }, [])

  return (
    <ToastProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <OnboardingWizard />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/studio/:id?" element={<StudioPage />} />
                <Route path="/rhyme-library/session/:id?" element={<WritingSessionPage />} />
                <Route element={<AppLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/record" element={<RecordPage />} />
                  <Route path="/freestyle" element={<Navigate to="/record?mode=freestyle" replace />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/drills" element={<DrillsPage />} />
                  <Route path="/drills/object-writing" element={<ObjectWritingPage />} />
                  <Route path="/drills/rhyme-chains" element={<RhymeChainsPage />} />
                  <Route path="/drills/word-association" element={<WordAssociationPage />} />
                  <Route path="/drills/flow-patterns" element={<FlowPatternsPage />} />
                  <Route path="/rhyme-library" element={<RhymeLibraryPage />} />
                  <Route path="/rhyme-library/new" element={<RhymeEditorPage />} />
                  <Route path="/rhyme-library/:id" element={<RhymeEditorPage />} />
                  <Route path="/library/:id" element={<SessionDetailsPage />} />
                  <Route path="/verse-editor/:id?" element={<VerseEditorPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
      {import.meta.env.DEV && <Agentation />}
      <ReloadPrompt />
    </ToastProvider>
  )
}
