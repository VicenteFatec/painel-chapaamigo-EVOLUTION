import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Firebase
import { auth } from './firebaseConfig'; // <-- Importa nosso serviço de auth
import { onAuthStateChanged } from "firebase/auth"; // <-- Importa o "ouvinte" de auth

// Componentes e Páginas
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MinhaFrotaPage from './pages/MinhaFrotaPage';
import SolicitacoesPage from './pages/SolicitacoesPage';
import GestaoDeTalentosPage from './pages/GestaoDeTalentosPage';
import { Loader2 } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Este hook fica "ouvindo" o status de autenticação do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });

    // Limpa o "ouvinte" quando o componente é desmontado
    return () => unsubscribe();
  }, []);

  // Mostra um carregador enquanto o Firebase verifica o login
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
        {/* Se não houver usuário, a única rota é /login */}
        {!user && <Route path="*" element={<LoginPage />} />}
        
        {/* Se houver um usuário, as rotas do painel são liberadas */}
        {user && (
          <Route path="/" element={<MainLayout />}>
            {/* Redireciona a raiz "/" para o dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="frota" element={<MinhaFrotaPage />} />
            <Route path="operacoes" element={<SolicitacoesPage />} />
            <Route path="talentos" element={<GestaoDeTalentosPage />} />
            {/* Qualquer outra rota dentro do painel redireciona para o dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        )}
      </Routes>
    </Router>
  );
}

export default App;