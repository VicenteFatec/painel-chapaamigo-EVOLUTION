// src/pages/PlanosPage.jsx (VERSÃO REFORÇADA E MAIS SEGURA)

// ===== IMPORTAÇÕES =====
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useAuthContext } from '../context/AuthContext.jsx';
import { Loader2, Star, ShieldCheck, Gem } from 'lucide-react';
import PaymentModal from '../components/PaymentModal';
import './PlanosPage.css';

// ===== CONFIGURAÇÕES GLOBAIS =====
const MERCADOPAGO_PUBLIC_KEY = "APP_USR-6454c285-7cb6-403c-ab24-112914e42994";

// ===== DADOS ESTRUTURAIS DOS PLANOS (PREÇOS SERÃO SOBRESCRITOS) =====
const DADOS_PLANOS_BASE = {
  essencial: {
    nome: 'Essencial', 
    id: 'essencial', 
    price: 0, 
    displayPrice: 'Grátis', 
    periodo: '', 
    icone: <Star size={24} />, 
    destaque: false,
    caracteristicas: [ '1 Loja', 'Até 20 veículos na frota', 'Até 3 usuários', 'Ordens de Serviço Ilimitadas', 'Suporte via Email' ]
  },
  profissional: {
    nome: 'Profissional', 
    id: 'profissional', 
    price: 0, 
    displayPrice: 'Carregando...', 
    periodo: '/mês', 
    icone: <ShieldCheck size={24} />, 
    destaque: true,
    caracteristicas: [ 'Até 10 Lojas', 'Até 100 veículos na frota', 'Até 50 usuários', 'Relatórios Básicos de Operação', 'Suporte Prioritário' ]
  },
  corporativo: {
    nome: 'Corporativo', 
    id: 'corporativo', 
    price: 0, 
    displayPrice: 'Carregando...', 
    periodo: '/mês', 
    icone: <Gem size={24} />, 
    destaque: false,
    caracteristicas: [ 'Até 50 Lojas', 'Até 1.000 veículos na frota', 'Até 250 usuários', 'Relatórios Avançados com IA', 'Suporte Dedicado' ]
  },
  master: {
    nome: 'Master', 
    id: 'master', 
    price: 0, 
    displayPrice: 'Sob Consulta', 
    periodo: '', 
    icone: <Gem size={24} />, 
    destaque: false,
    caracteristicas: [ 'Lojas Ilimitadas', 'Frota Ilimitada', 'Usuários Ilimitados', 'Acesso via API', 'Suporte Premium com SLA' ]
  }
};

// ===== COMPONENTE PRINCIPAL =====
function PlanosPage() {
  const { currentUser, authLoading } = useAuthContext();
  const [empresaData, setEmpresaData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planos, setPlanos] = useState(DADOS_PLANOS_BASE);

  // ===== SUBSTITUA O SEU BLOCO `useEffect` POR ESTE =====
useEffect(() => {
    const fetchPrecos = async () => {
      try {
        const precosDocRef = doc(db, 'configuracoes', 'precosPlanos');
        const precosDocSnap = await getDoc(precosDocRef);

        if (precosDocSnap.exists()) {
          const precosData = precosDocSnap.data();
          
          // ===== CORREÇÃO DEFINITIVA: Criando uma cópia profunda sem destruir os ícones =====
          const planosAtualizados = {
            essencial: { ...DADOS_PLANOS_BASE.essencial },
            profissional: { ...DADOS_PLANOS_BASE.profissional },
            corporativo: { ...DADOS_PLANOS_BASE.corporativo },
            master: { ...DADOS_PLANOS_BASE.master },
          };

          const formatadorDeMoeda = (valor, moeda) => 
            valor.toLocaleString('pt-BR', { style: 'currency', currency: moeda || 'BRL' });

          // Verifica e atualiza o preço do plano Profissional
          if (typeof precosData.precoProfissional === 'number') {
            planosAtualizados.profissional.price = precosData.precoProfissional;
            planosAtualizados.profissional.displayPrice = formatadorDeMoeda(precosData.precoProfissional, precosData.moeda);
          } else {
             console.warn("Preço do plano 'Profissional' não encontrado ou não é um número.");
             planosAtualizados.profissional.displayPrice = "Indisponível";
          }
          
          // Verifica e atualiza o preço do plano Corporativo
          if (typeof precosData.precoCorporativo === 'number') {
            planosAtualizados.corporativo.price = precosData.precoCorporativo;
            planosAtualizados.corporativo.displayPrice = formatadorDeMoeda(precosData.precoCorporativo, precosData.moeda);
          } else {
            console.warn("Preço do plano 'Corporativo' não encontrado ou não é um número.");
            planosAtualizados.corporativo.displayPrice = "Indisponível";
          }
          
          setPlanos(planosAtualizados);
        } else {
          console.error("Documento de preços 'precosPlanos' não encontrado!");
        }
      } catch (error) {
        console.error("Erro CRÍTICO ao buscar preços dos planos:", error);
      }
    };
    
    const fetchEmpresaData = async () => {
      if (currentUser) {
        try {
            const empresaDocRef = doc(db, 'empresas', currentUser.uid);
            const empresaDocSnap = await getDoc(empresaDocRef);
            if (empresaDocSnap.exists()) {
              setEmpresaData(empresaDocSnap.data());
            }
        } catch(error){
            console.error("Erro CRÍTICO ao buscar dados da empresa:", error)
        }
      }
    };

    const carregarDados = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchPrecos(), fetchEmpresaData()]);
      } catch (error) {
          console.error("Falha na execução paralela de buscas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      carregarDados();
    }
}, [currentUser, authLoading]);

  const handleUpgradeClick = (plan) => {
    if (plan.id === 'master' || plan.displayPrice === "Indisponível") {
      window.location.href = "mailto:contato@chapaamigo.com.br?subject=Interesse em Plano";
      return;
    }
    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };

  if (isLoading || authLoading) {
    return (
      <div className="loading-container-planos">
        <Loader2 className="animate-spin" /> 
        Carregando informações...
      </div>
    );
  }
  
  return (
    <>
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        plan={selectedPlan}
        publicKey={MERCADOPAGO_PUBLIC_KEY}
        userEmail={currentUser?.email}
        userDoc={empresaData?.cnpj}
      />
      <div className="planos-page-container">
        <div className="planos-header">
          <h1>Nossos Planos</h1>
          <p>Escolha o plano que melhor se adapta ao crescimento da sua empresa.</p>
        </div>
        <div className="planos-grid">
          {Object.entries(planos).map(([key, plano]) => (
            <div 
              key={key} 
              className={`plano-card ${plano.destaque ? 'destaque' : ''} ${empresaData?.plan === key ? 'plano-atual' : ''}`}
            >
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
                    disabled={plano.displayPrice === "Indisponível"}
                  >
                    {plano.id === 'master' ? 'Entrar em Contato' : 'Fazer Upgrade'}
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