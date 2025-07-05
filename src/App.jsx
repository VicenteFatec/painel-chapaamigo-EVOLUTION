import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Firebase
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from "firebase/auth";

// Componentes e Páginas
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MinhaFrotaPage from './pages/MinhaFrotaPage';
import SolicitacoesPage from './pages/SolicitacoesPage';
import GestaoDeTalentosPage from './pages/GestaoDeTalentosPage';
import HistoricoPage from './pages/HistoricoPage';
import TicketPage from './pages/TicketPage';
import { Loader2 } from 'lucide-react';

// Componente auxiliar para proteger rotas
const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* ================================================================== */}
        {/* ROTAS PÚBLICAS - Acessíveis por qualquer pessoa, a qualquer momento */}
        {/* ================================================================== */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/ticket/:osId" element={<TicketPage />} />

        {/* ================================================================== */}
        {/* ROTAS PROTEGIDAS - Envelopadas pelo MainLayout e ProtectedRoute    */}
        {/* ================================================================== */}
        <Route
          path="/"
          element={
            <ProtectedRoute user={user}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="frota" element={<MinhaFrotaPage />} />
          <Route path="operacoes" element={<SolicitacoesPage />} />
          <Route path="talentos" element={<GestaoDeTalentosPage />} />
          <Route path="historico" element={<HistoricoPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
