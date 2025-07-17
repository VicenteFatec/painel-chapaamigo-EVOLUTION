// src/components/MainLayout.jsx (Completo com o Link de Planos)

import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, LogOut, Award, Archive, Building, CreditCard } from 'lucide-react'; // <-- ÍCONE DO CARTÃO ADICIONADO
import './MainLayout.css';
import { getAuth, signOut } from 'firebase/auth';
import { useAuthContext } from '../context/AuthContext.jsx';

const getPageTitle = (pathname) => {
    switch (pathname) {
        case '/dashboard': return 'Dashboard';
        case '/operacoes': return 'Mesa de Operações';
        case '/talentos': return 'Gestão de Trabalhadores';
        case '/frota': return 'Minha Frota';
        case '/historico': return 'Histórico';
        case '/lojas': return 'Gestão de Lojas';
        case '/planos': return 'Meu Plano e Assinatura'; // <-- TÍTULO DA NOVA PÁGINA
        default: return 'Painel';
    }
};

function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, userRole, loading } = useAuthContext();
    
    const userEmail = currentUser ? currentUser.email : 'Carregando...';

    const handleLogout = async () => {
        const auth = getAuth();
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
        }
    };

    if (loading) {
        return <div className="loading-container">Carregando Painel...</div>;
    }

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
                    
                    {userRole === 'superAdmin' && (
                        <NavLink to="/talentos" className="nav-link"><Award size={20} /><span>Gestão de Trabalhadores</span></NavLink>
                    )}

                    <NavLink to="/frota" className="nav-link"><Users size={20} /><span>Minha Frota</span></NavLink>
                    <NavLink to="/lojas" className="nav-link"><Building size={20} /><span>Gestão de Lojas</span></NavLink>
                    <NavLink to="/historico" className="nav-link"><Archive size={20} /><span>Histórico</span></NavLink>
                    <NavLink to="/planos" className="nav-link"><CreditCard size={20} /><span>Meu Plano</span></NavLink> {/* <-- NOVO LINK ADICIONADO */}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-info">
                        <span className="user-email">{userEmail}</span>
                    </div>
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
