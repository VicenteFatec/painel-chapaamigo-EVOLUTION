import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Nossos componentes e páginas
import App from './App.jsx'; // Importamos o App, pois ele pode conter lógica útil
import MainLayout from './components/MainLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MinhaFrotaPage from './pages/MinhaFrotaPage.jsx';
import SolicitacoesPage from './pages/SolicitacoesPage.jsx';
import GestaoDeTalentosPage from './pages/GestaoDeTalentosPage.jsx';

// CSS
import 'leaflet/dist/leaflet.css';
import './index.css';

// Aqui definimos todas as rotas da aplicação
const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <MainLayout />,
    // Este é o "errorElement" que a mensagem de erro sugeria.
    // Ele garante que, mesmo em caso de erro, a página não fique em branco.
    errorElement: <div className="error-page">Ocorreu um erro inesperado.</div>,
    children: [
      // Quando o usuário for para "/", ele será redirecionado para o dashboard.
      { index: true, element: <DashboardPage /> },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "frota",
        element: <MinhaFrotaPage />,
      },
      {
        // ROTA CORRIGIDA: Adicionamos a página de operações
        path: "operacoes",
        element: <SolicitacoesPage />,
      },
      {
        // ROTA CORRIGIDA: Adicionamos a página de talentos
        path: "talentos",
        element: <GestaoDeTalentosPage />,
      },
    ]
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);