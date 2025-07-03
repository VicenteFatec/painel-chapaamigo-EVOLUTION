import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import './DashboardPage.css';
import MapDisplay from '../components/MapDisplay';

import { Briefcase, BarChart2, Star, Loader2 } from 'lucide-react';
import { collection, query, where, onSnapshot } from "firebase/firestore";

function DashboardPage() {
  const [userEmail, setUserEmail] = useState('');
  const [solicitacoesAtivas, setSolicitacoesAtivas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [custoMesAtual, setCustoMesAtual] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
      } else {
        setUserEmail('');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const statusAtivos = ["pendente", "aguardando_resposta", "confirmado"];
    const solicitacoesRef = collection(db, "solicitacoes");
    const q = query(solicitacoesRef, where("status", "in", statusAtivos));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ativas = [];
      let custoDoMes = 0;
      const hoje = new Date();
      const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      querySnapshot.forEach((doc) => {
        const os = { ...doc.data(), id: doc.id };
        ativas.push(os);

        if (os.dataSolicitacao && typeof os.dataSolicitacao.toDate === 'function') {
          const dataSolicitacao = os.dataSolicitacao.toDate();
          if (dataSolicitacao >= primeiroDiaDoMes) {
            if (typeof os.valorServicoBruto === 'number') {
              custoDoMes += os.valorServicoBruto;
            }
          }
        }
      });
      
      setSolicitacoesAtivas(ativas);
      setCustoMesAtual(custoDoMes);
      setIsLoading(false);
    }, (error) => {
      console.error("Erro ao buscar dados do dashboard: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);


  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-welcome">
          Olá, {userEmail || 'Gestor'}!
        </h1>
        <p>Aqui está um resumo da sua operação hoje.</p>
      </header>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px' }}>
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: '#e0f2fe' }}>
                <Briefcase size={24} color="#0ea5e9" />
              </div>
              <div className="kpi-info">
                <div className="kpi-value">{solicitacoesAtivas.length}</div>
                <div className="kpi-title">Serviços Ativos</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: '#dcfce7' }}>
                <BarChart2 size={24} color="#22c55e" />
              </div>
              <div className="kpi-info">
                <div className="kpi-value">
                  {custoMesAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="kpi-title">Custo (Mês Atual)</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: '#fef3c7' }}>
                <Star size={24} color="#f59e0b" />
              </div>
              <div className="kpi-info">
                <div className="kpi-value">4.8</div>
                <div className="kpi-title">Avaliação Média</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#333' }}>
              Mapa de Operações
            </h2>

            <div className="map-legend" style={{ display: 'flex', gap: '20px', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ height: '15px', width: '15px', backgroundColor: '#f97316', borderRadius: '50%' }}></span>
                <span>Pendente</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ height: '15px', width: '15px', backgroundColor: '#3b82f6', borderRadius: '50%' }}></span>
                <span>Aguardando Resposta</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ height: '15px', width: '15px', backgroundColor: '#22c55e', borderRadius: '50%' }}></span>
                <span>Confirmado</span>
              </div>
            </div>
            
            <MapDisplay solicitacoes={solicitacoesAtivas} />
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardPage;