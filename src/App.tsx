import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import MyBarzPage from './pages/MyBarzPage';
import FreestylePage from './pages/FreestylePage';
import LibraryPage from './pages/LibraryPage';
import DrillsPage from './pages/DrillsPage';
import SettingsPage from './pages/SettingsPage';
import { Agentation } from 'agentation';

import { SessionProvider } from './context/SessionContext';

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          {/* New Spotify-style layout */}
          <Route element={<AppLayout />}>
            <Route path="/barz" element={<MyBarzPage />} />
            <Route path="/freestyle" element={<FreestylePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/drills" element={<DrillsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Redirect root to barz */}
          <Route path="/" element={<Navigate to="/barz" replace />} />
          <Route path="*" element={<Navigate to="/barz" replace />} />
        </Routes>
      </SessionProvider>
      {import.meta.env.DEV && <Agentation />}
    </BrowserRouter>
  );
}

export default App;
