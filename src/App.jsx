import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MinhaFrotaPage from './pages/MinhaFrotaPage';
import SolicitacoesPage from './pages/SolicitacoesPage';
import GestaoDeTalentosPage from './pages/GestaoDeTalentosPage'; // <-- VERIFIQUE SE ESTA LINHA EXISTE

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
          <Route path="operacoes" element={<SolicitacoesPage />} />
          <Route path="talentos" element={<GestaoDeTalentosPage />} /> {/* <-- E VERIFIQUE SE ESTA LINHA EXISTE */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;