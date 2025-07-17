// src/App.jsx (Completo com a Rota de Planos)

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from './context/AuthContext.jsx';

// Importação das páginas
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SolicitacoesPage from './pages/SolicitacoesPage';
import GestaoDeTalentosPage from './pages/GestaoDeTalentosPage';
import MinhaFrotaPage from './pages/MinhaFrotaPage';
import GestaoDeLojasPage from './pages/GestaoDeLojasPage';
import HistoricoPage from './pages/HistoricoPage';
import PlanosPage from './pages/PlanosPage'; // <-- NOVA PÁGINA IMPORTADA
import MainLayout from './components/MainLayout';
import { Loader2 } from 'lucide-react';

// Componente para proteger rotas que exigem autenticação
function ProtectedRoute({ children }) {
    const { currentUser, loading } = useAuthContext();

    if (loading) {
        // Exibe um loader enquanto a autenticação está sendo verificada
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Loader2 size={48} className="animate-spin" />
            </div>
        );
    }

    if (!currentUser) {
        // Se não houver usuário após o carregamento, redireciona para o login
        return <Navigate to="/login" replace />;
    }

    // Se houver usuário, renderiza o conteúdo da rota protegida
    return children;
}

function App() {
    return (
        <Router>
            <Routes>
                {/* Rotas Públicas */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Rotas Protegidas dentro do MainLayout */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* A rota inicial '/' redireciona para o dashboard */}
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="operacoes" element={<SolicitacoesPage />} />
                    <Route path="talentos" element={<GestaoDeTalentosPage />} />
                    <Route path="frota" element={<MinhaFrotaPage />} />
                    <Route path="lojas" element={<GestaoDeLojasPage />} />
                    <Route path="historico" element={<HistoricoPage />} />
                    <Route path="planos" element={<PlanosPage />} /> {/* <-- NOVA ROTA ADICIONADA */}
                </Route>

                {/* Rota de fallback para qualquer caminho não encontrado */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
