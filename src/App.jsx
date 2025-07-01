import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MinhaFrotaPage from './pages/MinhaFrotaPage';
import SolicitacoesPage from './pages/SolicitacoesPage';

const isAuthenticated = true; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route 
          path="/" 
          element={
            isAuthenticated ? <MainLayout /> : <Navigate to="/login" />
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="frota" element={<MinhaFrotaPage />} />
          {/* AQUI ESTÁ A MUDANÇA: RENOMEAMOS A ROTA */}
          <Route path="operacoes" element={<SolicitacoesPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;