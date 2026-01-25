import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudioPage from './pages/StudioPage';
import LibraryPage from './pages/LibraryPage';
import NotebookPage from './pages/NotebookPage';

import { SessionProvider } from './context/SessionContext';

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <div className="min-h-screen bg-gray-950 font-sans text-gray-100">
          <Routes>
            <Route path="/" element={<StudioPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/notebook" element={<NotebookPage />} />
          </Routes>
        </div>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;

