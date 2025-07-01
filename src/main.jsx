import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Nossos componentes
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MinhaFrotaPage from './pages/MinhaFrotaPage.jsx'; // 1. Importar a nova página
import MainLayout from './components/MainLayout.jsx';
import 'leaflet/dist/leaflet.css';
import './index.css'

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "frota", // 2. Adicionar a nova rota
        element: <MinhaFrotaPage />,
      },
    ]
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)