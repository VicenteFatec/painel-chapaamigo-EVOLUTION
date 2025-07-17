// src/pages/PlanosPage.jsx (Final com Documento do Pagador)

import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthContext } from '../context/AuthContext.jsx';
import { Loader2, Star, ShieldCheck, Gem } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import './PlanosPage.css';

const MERCADOPAGO_PUBLIC_KEY = "APP_USR-6454c285-7cb6-403c-ab24-112914e42994";

const DADOS_PLANOS = {
  essencial: {
    nome: 'Essencial', id: 'essencial', price: 0, displayPrice: 'Grátis', periodo: '', icone: <Star size={24} />, destaque: false,
    caracteristicas: [ '1 Loja', 'Até 20 veículos na frota', 'Até 3 usuários', 'Ordens de Serviço Ilimitadas', 'Suporte via Email' ]
  },
  profissional: {
    nome: 'Profissional', id: 'profissional', price: 199, displayPrice: 'R$ 199', periodo: '/mês', icone: <ShieldCheck size={24} />, destaque: true,
    caracteristicas: [ 'Até 10 Lojas', 'Até 100 veículos na frota', 'Até 50 usuários', 'Relatórios Básicos de Operação', 'Suporte Prioritário' ]
  },
  corporativo: {
    nome: 'Corporativo', id: 'corporativo', price: 499, displayPrice: 'R$ 499', periodo: '/mês', icone: <Gem size={24} />, destaque: false,
    caracteristicas: [ 'Até 50 Lojas', 'Até 1.000 veículos na frota', 'Até 250 usuários', 'Relatórios Avançados com IA', 'Suporte Dedicado' ]
  },
  master: {
      nome: 'Master', id: 'master', price: 0, displayPrice: 'Sob Consulta', periodo: '', icone: <Gem size={24} />, destaque: false,
      caracteristicas: [ 'Lojas Ilimitadas', 'Frota Ilimitada', 'Usuários Ilimitados', 'Acesso via API', 'Suporte Premium com SLA' ]
    }
};

function PlanosPage() {
  const { currentUser, authLoading } = useAuthContext();
  const [empresaData, setEmpresaData] = useState(null); // Armazena todos os dados da empresa
  const [isLoading, setIsLoading] = useState(true);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    if (!authLoading && currentUser) {
      const fetchEmpresaData = async () => {
        setIsLoading(true);
        const empresaDocRef = doc(db, 'empresas', currentUser.uid);
        const empresaDocSnap = await getDoc(empresaDocRef);
        if (empresaDocSnap.exists()) {
          setEmpresaData(empresaDocSnap.data()); // Salva todos os dados
        }
        setIsLoading(false);
      };
      fetchEmpresaData();
    }
  }, [currentUser, authLoading]);

  const handleUpgradeClick = (plan) => {
    if (plan.id === 'master') {
        window.location.href = "mailto:contato@chapaamigo.com.br?subject=Interesse no Plano Master";
        return;
    }
    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };

  if (isLoading || authLoading) {
    return <div className="loading-container-planos"><Loader2 className="animate-spin" /> Carregando informações...</div>;
  }
  
  if (MERCADOPAGO_PUBLIC_KEY.includes("SUA_PUBLIC_KEY")) {
      return <div className="payment-error-alert">Erro de configuração: A Public Key do Mercado Pago não foi definida.</div>
  }

  return (
    <>
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        plan={selectedPlan}
        publicKey={MERCADOPAGO_PUBLIC_KEY}
        userEmail={currentUser?.email}
        // ===== CORREÇÃO: Passando o CNPJ da empresa para o modal =====
        userDoc={empresaData?.cnpj}
      />

      <div className="planos-page-container">
        <div className="planos-header">
          <h1>Nossos Planos</h1>
          <p>Escolha o plano que melhor se adapta ao crescimento da sua empresa.</p>
        </div>

        <div className="planos-grid">
          {Object.entries(DADOS_PLANOS).map(([key, plano]) => (
            <div key={key} className={`plano-card ${plano.destaque ? 'destaque' : ''} ${empresaData?.plan === key ? 'plano-atual' : ''}`}>
              {plano.destaque && <div className="destaque-badge">Mais Popular</div>}
              {empresaData?.plan === key && <div className="plano-atual-badge">Seu Plano Atual</div>}
              
              <div className="plano-card-header">
                <div className="plano-icone">{plano.icone}</div>
                <h2>{plano.nome}</h2>
              </div>
              <div className="plano-preco">
                <span className="valor">{plano.displayPrice}</span>
                <span className="periodo">{plano.periodo}</span>
              </div>
              <ul className="plano-caracteristicas">
                {plano.caracteristicas.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <div className="plano-card-footer">
                {empresaData?.plan === key ? (
                  <button className="botao-plano" disabled>Ativo</button>
                ) : (
                  <button 
                    className="botao-plano upgrade" 
                    onClick={() => handleUpgradeClick(plano)}
                  >
                    {plano.nome === 'Master' ? 'Entrar em Contato' : 'Fazer Upgrade'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default PlanosPage;
