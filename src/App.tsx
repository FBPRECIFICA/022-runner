import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventsPage } from './pages/EventsPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { AthleteDashboard } from './pages/AthleteDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="cadastro" element={<RegisterPage />} />
            <Route path="evento/:slug" element={<EventDetailPage />} />
            <Route path="eventos" element={<EventsPage />} />
            <Route path="inscricao/:eventSlug" element={<RegistrationPage />} />
            <Route path="confirmacao/:registrationId" element={<ConfirmationPage />} />
            <Route path="atleta" element={
              <ProtectedRoute allowedRoles={['athlete', 'admin']}>
                <AthleteDashboard />
              </ProtectedRoute>
            } />
            <Route path="organizador" element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
