import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventsPage } from './pages/EventsPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { ConfirmationPage } from './pages/ConfirmationPage';
import { PaymentPage } from './pages/PaymentPage';
import { CertificatePage } from './pages/CertificatePage';
import { AthleteDashboard } from './pages/AthleteDashboard';
import { AthleteProfilePage } from './pages/AthleteProfilePage';
import { RankingPage } from './pages/RankingPage';
import { CheckinPage } from './pages/CheckinPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <HelmetProvider>
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
              <Route path="pagamento/:registrationId" element={<PaymentPage />} />
              <Route path="certificado/:registrationId" element={<CertificatePage />} />
              <Route path="ranking" element={<RankingPage />} />
              <Route path="atleta/:userId" element={<AthleteProfilePage />} />
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
              <Route path="checkin/:eventSlug" element={
                <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                  <CheckinPage />
                </ProtectedRoute>
              } />
              <Route path="admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
