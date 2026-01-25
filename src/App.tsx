/**
 * RapCap - Main App Component
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import HomePage from './pages/HomePage'
import FreestylePage from './pages/FreestylePage'
import LibraryPage from './pages/LibraryPage'
import DrillsPage from './pages/DrillsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/freestyle" element={<FreestylePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/drills" element={<DrillsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
