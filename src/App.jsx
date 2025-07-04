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
import ConvitePage from './pages/ConvitePage';
import HistoricoPage from './pages/HistoricoPage';
import TicketPage from './pages/TicketPage'; // <<< PASSO 1: Importar a página do Ticket
import { Loader2 } from 'lucide-react';

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
        {/* === ROTAS PÚBLICAS === */}
        {/* Rota pública para a página de Convite */}
        <Route path="/convite/:osId" element={<ConvitePage />} />
        
        {/* Rota pública para a página do Ticket de Serviço */}
        <Route path="/ticket/:osId" element={<TicketPage />} /> {/* <<< PASSO 2: Adicionar a nova rota pública */}

        {/* === ROTAS PROTEGIDAS (Usuário Logado) === */}
        {user && (
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="frota" element={<MinhaFrotaPage />} />
            <Route path="operacoes" element={<SolicitacoesPage />} />
            <Route path="talentos" element={<GestaoDeTalentosPage />} />
            <Route path="historico" element={<HistoricoPage />} />
            {/* Redireciona qualquer outra rota protegida para o dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        )}

        {/* === ROTA DE FALLBACK (Usuário Deslogado) === */}
        {/* Se não há usuário, qualquer tentativa de acesso leva ao Login */}
        {!user && <Route path="*" element={<LoginPage />} />}
      </Routes>
    </Router>
  );
}

export default App;