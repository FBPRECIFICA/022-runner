import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

const HomePage           = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const LoginPage          = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage       = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const EventDetailPage    = lazy(() => import('./pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })));
const EventsPage         = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const SearchPage         = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const RegistrationPage   = lazy(() => import('./pages/RegistrationPage').then(m => ({ default: m.RegistrationPage })));
const ConfirmationPage   = lazy(() => import('./pages/ConfirmationPage').then(m => ({ default: m.ConfirmationPage })));
const PaymentPage        = lazy(() => import('./pages/PaymentPage').then(m => ({ default: m.PaymentPage })));
const CertificatePage    = lazy(() => import('./pages/CertificatePage').then(m => ({ default: m.CertificatePage })));
const RankingPage        = lazy(() => import('./pages/RankingPage').then(m => ({ default: m.RankingPage })));
const AthleteProfilePage = lazy(() => import('./pages/AthleteProfilePage').then(m => ({ default: m.AthleteProfilePage })));
const AthleteDashboard   = lazy(() => import('./pages/AthleteDashboard').then(m => ({ default: m.AthleteDashboard })));
const OrganizerDashboard = lazy(() => import('./pages/OrganizerDashboard').then(m => ({ default: m.OrganizerDashboard })));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const CheckinPage           = lazy(() => import('./pages/CheckinPage').then(m => ({ default: m.CheckinPage })));
const ProfilePage           = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const TeamsPage             = lazy(() => import('./pages/TeamsPage').then(m => ({ default: m.TeamsPage })));
const SocialGeneratorPage   = lazy(() => import('./pages/SocialGeneratorPage').then(m => ({ default: m.SocialGeneratorPage })));

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#111111' }}>
      <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent' }} />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="cadastro" element={<RegisterPage />} />
                <Route path="evento/:slug" element={<EventDetailPage />} />
                <Route path="eventos" element={<EventsPage />} />
                <Route path="buscar" element={<SearchPage />} />
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
                <Route path="perfil" element={
                  <ProtectedRoute allowedRoles={['athlete', 'organizer', 'admin']}>
                    <ProfilePage />
                  </ProtectedRoute>
                } />
                <Route path="equipes" element={<TeamsPage />} />
                <Route path="gerador-social" element={
                  <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                    <SocialGeneratorPage />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}

export default App;
