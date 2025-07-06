// CÓDIGO ATUALIZADO PARA: src/components/MainLayout.jsx

import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, LogOut, Award, Archive, Building } from 'lucide-react';
import './MainLayout.css';

// A lógica do modal de Nova OS foi removida daqui para simplificar o componente.

const getPageTitle = (pathname) => {
    switch (pathname) {
        case '/dashboard': return 'Dashboard';
        case '/operacoes': return 'Mesa de Operações';
        case '/talentos': return 'Gestão de Trabalhadores';
        case '/frota': return 'Minha Frota';
        case '/historico': return 'Histórico';
        case '/lojas': return 'Gestão de Lojas'; // Título para a nova página
        default: return 'Painel';
    }
};

function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const userEmail = "teste@empresa.com"; 

    const handleLogout = () => { navigate('/login'); };

    return (
        <div className="main-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src="/images/logo.svg" alt="Chapa Amigo Empresas Logo" className="logo" />
                    <h1>Chapa Amigo Empresas</h1>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/dashboard" className="nav-link"><LayoutDashboard size={20} /><span>Dashboard</span></NavLink>
                    <NavLink to="/operacoes" className="nav-link"><ClipboardList size={20} /><span>Mesa de Operações</span></NavLink>
                    <NavLink to="/talentos" className="nav-link"><Award size={20} /><span>Gestão de Trabalhadores</span></NavLink>
                    <NavLink to="/frota" className="nav-link"><Users size={20} /><span>Minha Frota</span></NavLink>
                    {/* NOVO LINK DE NAVEGAÇÃO PARA LOJAS */}
                    <NavLink to="/lojas" className="nav-link"><Building size={20} /><span>Gestão de Lojas</span></NavLink>
                    <NavLink to="/historico" className="nav-link"><Archive size={20} /><span>Histórico</span></NavLink>
                </nav>
                <div className="sidebar-footer">
                    <div className="user-info"><span className="user-email">{userEmail}</span></div>
                    <button onClick={handleLogout} className="logout-button"><LogOut size={20} /><span>Sair</span></button>
                </div>
            </aside>
            
            <main className="content">
                <header className="content-header">
                    <h2 className="page-title">{getPageTitle(location.pathname)}</h2>
                    {/* O botão de "Criar Nova OS" foi removido do header geral. 
                        Ele pertencerá à página específica de "Mesa de Operações". */}
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>

            {/* O MODAL FOI REMOVIDO DAQUI E SERÁ MOVIDO PARA UM COMPONENTE PRÓPRIO */}
        </div>
    );
}

export default MainLayout;