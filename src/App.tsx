// .\src\App.tsx
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Meetings from './pages/Meetings';
import MeetingDetailsPage from './pages/MeetingDetailsPage';
import Automations from './pages/Automations';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import { GlobalProvider } from './contexts/GlobalContext';

function App() {
  return (
    <Router>
      <GlobalProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Meetings />} />
            <Route path="/meetings/:id" element={<MeetingDetailsPage />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </MainLayout>
      </GlobalProvider>
    </Router>
  );
}

export default App;
