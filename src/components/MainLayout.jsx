// CÓDIGO CORRIGIDO E FINALIZADO PARA: src/components/MainLayout.jsx

import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, LogOut, Award, Archive, Building } from 'lucide-react';
import './MainLayout.css';

// ===== IMPORTAÇÕES NECESSÁRIAS PARA O LOGOUT =====
import { auth } from '../firebaseConfig'; // Importa a instância do auth
import { signOut } from 'firebase/auth'; // Importa a função signOut

const getPageTitle = (pathname) => {
    // ... (nenhuma alteração nesta função)
    switch (pathname) {
        case '/dashboard': return 'Dashboard';
        case '/operacoes': return 'Mesa de Operações';
        case '/talentos': return 'Gestão de Trabalhadores';
        case '/frota': return 'Minha Frota';
        case '/historico': return 'Histórico';
        case '/lojas': return 'Gestão de Lojas';
        default: return 'Painel';
    }
};

function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ===== OBTER DADOS DO USUÁRIO LOGADO =====
    // O objeto auth.currentUser está disponível aqui porque este componente
    // só é renderizado para usuários autenticados (graças ao ProtectedRoute).
    const userEmail = auth.currentUser ? auth.currentUser.email : 'Usuário';

    // ===== FUNÇÃO DE LOGOUT CORRIGIDA =====
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Após o signOut bem-sucedido, o onAuthStateChanged no App.jsx
            // irá detectar a mudança e redirecionar para /login automaticamente.
            // A navegação explícita abaixo é um reforço.
            navigate('/login');
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            // Opcional: Adicionar um alerta para o usuário em caso de falha no logout
            alert("Não foi possível sair. Por favor, tente novamente.");
        }
    };

    return (
        <div className="main-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src="/images/branca.svg" alt="Chapa Amigo Empresas Logo" className="logo" />
                    <h1>Chapa Amigo Empresas</h1>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/dashboard" className="nav-link"><LayoutDashboard size={20} /><span>Dashboard</span></NavLink>
                    <NavLink to="/operacoes" className="nav-link"><ClipboardList size={20} /><span>Mesa de Operações</span></NavLink>
                    <NavLink to="/talentos" className="nav-link"><Award size={20} /><span>Gestão de Trabalhadores</span></NavLink>
                    <NavLink to="/frota" className="nav-link"><Users size={20} /><span>Minha Frota</span></NavLink>
                    <NavLink to="/lojas" className="nav-link"><Building size={20} /><span>Gestão de Lojas</span></NavLink>
                    <NavLink to="/historico" className="nav-link"><Archive size={20} /><span>Histórico</span></NavLink>
                </nav>
                <div className="sidebar-footer">
                    {/* Exibe o e-mail do usuário real */}
                    <div className="user-info">
                        <span className="user-email">{userEmail}</span>
                    </div>
                    {/* O botão agora chama a função de logout correta */}
                    <button onClick={handleLogout} className="logout-button">
                        <LogOut size={20} /><span>Sair</span>
                    </button>
                </div>
            </aside>
            
            <main className="content">
                <header className="content-header">
                    <h2 className="page-title">{getPageTitle(location.pathname)}</h2>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default MainLayout;