/**
 * RapCap - Main App Component
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// import { useEffect } from 'react'
import AppLayout from './layouts/AppLayout'
import ReloadPrompt from './components/ReloadPrompt'
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import HomePage from './pages/HomePage'
import FreestylePage from './pages/FreestylePage'
import LibraryPage from './pages/LibraryPage'
import DrillsPage from './pages/DrillsPage'
import ObjectWritingPage from './pages/ObjectWritingPage'
import RhymeChainsPage from './pages/RhymeChainsPage'
import WordAssociationPage from './pages/WordAssociationPage'
import SettingsPage from './pages/SettingsPage'
import FlowPatternsPage from './pages/FlowPatternsPage'
import RhymeLibraryPage from './pages/RhymeLibraryPage'
import RhymeEditorPage from './pages/RhymeEditorPage'
import AuthPage from './pages/AuthPage'
import { AuthProvider } from './contexts/AuthContext'
import { useEffect } from 'react'
import { seedDatabase } from './db/db'





import { Agentation } from 'agentation'


export default function App() {
  // Request mic permission on app load
  // Request mic permission on app load - REMOVED to prevent race conditions

  // Initialize DB with seed data
  useEffect(() => {
    seedDatabase().catch(console.error)
  }, [])

  return (
    <>
      <BrowserRouter>
        <AuthProvider>
          <OnboardingWizard />
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/freestyle" element={<FreestylePage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/drills" element={<DrillsPage />} />
              <Route path="/drills/object-writing" element={<ObjectWritingPage />} />
              <Route path="/drills/rhyme-chains" element={<RhymeChainsPage />} />
              <Route path="/drills/word-association" element={<WordAssociationPage />} />
              <Route path="/drills/flow-patterns" element={<FlowPatternsPage />} />

              <Route path="/rhyme-library" element={<RhymeLibraryPage />} />
              <Route path="/rhyme-library/new" element={<RhymeEditorPage />} />
              <Route path="/rhyme-library/:id" element={<RhymeEditorPage />} />

              <Route path="/settings" element={<SettingsPage />} />

            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      {import.meta.env.DEV && <Agentation />}
      <ReloadPrompt />
    </>
  )
}
