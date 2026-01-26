/**
 * RapCap - Main App Component
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import FreestylePage from './pages/FreestylePage'
import LibraryPage from './pages/LibraryPage'
import DrillsPage from './pages/DrillsPage'
import ObjectWritingPage from './pages/ObjectWritingPage'
import RhymeChainsPage from './pages/RhymeChainsPage'
import WordAssociationPage from './pages/WordAssociationPage'
import SettingsPage from './pages/SettingsPage'
import FlowPatternsPage from './pages/FlowPatternsPage'





import { Agentation } from 'agentation'

export default function App() {
  // Request mic permission on app load
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        console.log('Microphone permission granted')
        // We can stop the tracks immediately; we just wanted the permission grant
        stream.getTracks().forEach(track => track.stop())
      })
      .catch(err => {
        console.warn('Microphone permission denied or ignored', err)
      })
  }, [])

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/freestyle" element={<FreestylePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/drills" element={<DrillsPage />} />
            <Route path="/drills/object-writing" element={<ObjectWritingPage />} />
            <Route path="/drills/rhyme-chains" element={<RhymeChainsPage />} />
            <Route path="/drills/word-association" element={<WordAssociationPage />} />
            <Route path="/drills/flow-patterns" element={<FlowPatternsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      {import.meta.env.DEV && <Agentation />}
    </>
  )
}
