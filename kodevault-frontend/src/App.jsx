import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import RepoDetailPage from './pages/RepoDetailPage';
import RepoGraphPage from './pages/RepoGraphPage';
import PRListPage from './pages/PRListPage';
import PRDetailPage from './pages/PRDetailPage';
import IssuesPage from './pages/IssuesPage';
import CommitPage from './pages/CommitPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/repos/:repoId" element={<ProtectedRoute><RepoDetailPage /></ProtectedRoute>} />
          <Route path="/repos/:repoId/graph" element={<ProtectedRoute><RepoGraphPage /></ProtectedRoute>} />
          <Route path="/repos/:repoId/prs" element={<ProtectedRoute><PRListPage /></ProtectedRoute>} />
          <Route path="/repos/:repoId/prs/:prId" element={<ProtectedRoute><PRDetailPage /></ProtectedRoute>} />
          <Route path="/repos/:repoId/issues" element={<ProtectedRoute><IssuesPage /></ProtectedRoute>} />
          <Route path="/repos/:repoId/commit" element={<ProtectedRoute><CommitPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}