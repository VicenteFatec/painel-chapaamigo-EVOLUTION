import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import './DashboardPage.css'; // Importa o estilo do Dashboard
import MapDisplay from '../components/MapDisplay'; // Importa nosso novo componente de Mapa

// Importando os ícones que vamos usar para os KPIs
import { Briefcase, BarChart2, Star } from 'lucide-react';

function DashboardPage() {
  const [userEmail, setUserEmail] = useState('');

  // Este efeito roda quando a página carrega para buscar o usuário logado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Se encontrou um usuário, guarda o e-mail dele no nosso "estado"
        setUserEmail(user.email);
      } else {
        // Se não, limpa o e-mail
        setUserEmail('');
      }
    });
    // Limpa o "ouvinte" quando a página é fechada para não gastar memória
    return () => unsubscribe();
  }, []); // O array vazio [] garante que isso rode apenas uma vez

  return (
    <div className="dashboard-container">
      {/* Seção do Cabeçalho de Boas-vindas */}
      <header className="dashboard-header">
        <h1 className="dashboard-welcome">
          Olá, {userEmail || 'Gestor'}!
        </h1>
        <p>Aqui está um resumo da sua operação hoje.</p>
      </header>

      {/* Seção da Grade de KPIs */}
      <div className="kpi-grid">
        {/* Card 1: Serviços em Andamento */}
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#e0f2fe' }}>
            <Briefcase size={24} color="#0ea5e9" />
          </div>
          <div className="kpi-info">
            <div className="kpi-value">12</div>
            <div className="kpi-title">Serviços em Andamento</div>
          </div>
        </div>

        {/* Card 2: Custo com Mão de Obra */}
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#dcfce7' }}>
            <BarChart2 size={24} color="#22c55e" />
          </div>
          <div className="kpi-info">
            <div className="kpi-value">R$ 3.450</div>
            <div className="kpi-title">Custo (Mês Atual)</div>
          </div>
        </div>

        {/* Card 3: Avaliação Média */}
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Star size={24} color="#f59e0b" />
          </div>
          <div className="kpi-info">
            <div className="kpi-value">4.8</div>
            <div className="kpi-title">Avaliação Média da Frota</div>
          </div>
        </div>
      </div>

      {/* Seção do Mapa de Operações */}
      <div style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#333' }}>
          Mapa de Operações
        </h2>
        <MapDisplay />
      </div>

    </div>
  );
}

export default DashboardPage;