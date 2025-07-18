// src/pages/PlanosPage.jsx (Final com Documento do Pagador)

// ===== IMPORTAÇÕES =====
// Importa as dependências necessárias do React
import React, { useState, useEffect } from 'react';

// Importa configurações e funções do Firebase para banco de dados
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// Importa o contexto de autenticação personalizado
import { useAuthContext } from '../context/AuthContext.jsx';

// Importa ícones da biblioteca Lucide React
import { Loader2, Star, ShieldCheck, Gem } from 'lucide-react';

// Importa componentes personalizados
import PaymentModal from '../components/PaymentModal';

// Importa arquivo de estilos CSS
import './PlanosPage.css';

// ===== CONFIGURAÇÕES GLOBAIS =====
// Chave pública do Mercado Pago para processar pagamentos
const MERCADOPAGO_PUBLIC_KEY = "APP_USR-6454c285-7cb6-403c-ab24-112914e42994";

// ===== DADOS ESTÁTICOS DOS PLANOS =====
// Objeto que define todos os planos disponíveis e suas características
const DADOS_PLANOS = {
  // Plano gratuito básico
  essencial: {
    nome: 'Essencial', 
    id: 'essencial', 
    price: 0, 
    displayPrice: 'Grátis', 
    periodo: '', 
    icone: <Star size={24} />, 
    destaque: false,
    caracteristicas: [ 
      '1 Loja', 
      'Até 20 veículos na frota', 
      'Até 3 usuários', 
      'Ordens de Serviço Ilimitadas', 
      'Suporte via Email' 
    ]
  },
  // Plano intermediário - mais popular
  profissional: {
    nome: 'Profissional', 
    id: 'profissional', 
    price: 199, 
    displayPrice: 'R$ 199', 
    periodo: '/mês', 
    icone: <ShieldCheck size={24} />, 
    destaque: true, // Marcado como destaque
    caracteristicas: [ 
      'Até 10 Lojas', 
      'Até 100 veículos na frota', 
      'Até 50 usuários', 
      'Relatórios Básicos de Operação', 
      'Suporte Prioritário' 
    ]
  },
  // Plano avançado para empresas maiores
  corporativo: {
    nome: 'Corporativo', 
    id: 'corporativo', 
    price: 499, 
    displayPrice: 'R$ 499', 
    periodo: '/mês', 
    icone: <Gem size={24} />, 
    destaque: false,
    caracteristicas: [ 
      'Até 50 Lojas', 
      'Até 1.000 veículos na frota', 
      'Até 250 usuários', 
      'Relatórios Avançados com IA', 
      'Suporte Dedicado' 
    ]
  },
  // Plano enterprise personalizado
  master: {
    nome: 'Master', 
    id: 'master', 
    price: 0, 
    displayPrice: 'Sob Consulta', 
    periodo: '', 
    icone: <Gem size={24} />, 
    destaque: false,
    caracteristicas: [ 
      'Lojas Ilimitadas', 
      'Frota Ilimitada', 
      'Usuários Ilimitados', 
      'Acesso via API', 
      'Suporte Premium com SLA' 
    ]
  }
};

// ===== COMPONENTE PRINCIPAL =====
function PlanosPage() {
  // ===== HOOKS DE CONTEXTO =====
  // Obtém dados do usuário autenticado e status de carregamento
  const { currentUser, authLoading } = useAuthContext();

  // ===== ESTADOS DO COMPONENTE =====
  // Armazena todos os dados da empresa do usuário logado
  const [empresaData, setEmpresaData] = useState(null);
  
  // Controla o estado de carregamento da página
  const [isLoading, setIsLoading] = useState(true);
  
  // Controla a abertura/fechamento do modal de pagamento
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Armazena o plano selecionado pelo usuário
  const [selectedPlan, setSelectedPlan] = useState(null);

  // ===== EFEITO PARA BUSCAR DADOS DA EMPRESA =====
  // Executa quando o usuário está autenticado e não está carregando
  useEffect(() => {
    if (!authLoading && currentUser) {
      // Função assíncrona para buscar dados da empresa no Firebase
      const fetchEmpresaData = async () => {
        setIsLoading(true); // Inicia o carregamento
        
        // Cria referência para o documento da empresa usando o UID do usuário
        const empresaDocRef = doc(db, 'empresas', currentUser.uid);
        
        // Busca o documento no Firestore
        const empresaDocSnap = await getDoc(empresaDocRef);
        
        // Verifica se o documento existe e salva os dados
        if (empresaDocSnap.exists()) {
          setEmpresaData(empresaDocSnap.data()); // Salva todos os dados da empresa
        }
        
        setIsLoading(false); // Finaliza o carregamento
      };
      
      // Executa a função de busca
      fetchEmpresaData();
    }
  }, [currentUser, authLoading]); // Dependências do useEffect

  // ===== FUNÇÃO PARA LIDAR COM UPGRADE DE PLANO =====
  // Executada quando o usuário clica em "Fazer Upgrade" ou "Entrar em Contato"
  const handleUpgradeClick = (plan) => {
    // Caso especial: Plano Master redireciona para email
    if (plan.id === 'master') {
        window.location.href = "mailto:contato@chapaamigo.com.br?subject=Interesse no Plano Master";
        return;
    }
    
    // Para outros planos, abre o modal de pagamento
    setSelectedPlan(plan); // Define o plano selecionado
    setIsPaymentModalOpen(true); // Abre o modal
  };

  // ===== RENDERIZAÇÃO CONDICIONAL - ESTADO DE CARREGAMENTO =====
  // Mostra tela de carregamento enquanto busca dados
  if (isLoading || authLoading) {
    return (
      <div className="loading-container-planos">
        <Loader2 className="animate-spin" /> 
        Carregando informações...
      </div>
    );
  }
  
  // ===== RENDERIZAÇÃO CONDICIONAL - ERRO DE CONFIGURAÇÃO =====
  // Verifica se a chave do Mercado Pago está configurada corretamente
  if (MERCADOPAGO_PUBLIC_KEY.includes("SUA_PUBLIC_KEY")) {
    return (
      <div className="payment-error-alert">
        Erro de configuração: A Public Key do Mercado Pago não foi definida.
      </div>
    );
  }

  // ===== RENDERIZAÇÃO PRINCIPAL =====
  return (
    <>
      {/* ===== MODAL DE PAGAMENTO ===== */}
      {/* Componente que gerencia o processo de pagamento */}
      <PaymentModal 
        isOpen={isPaymentModalOpen} // Controla se o modal está aberto
        onClose={() => setIsPaymentModalOpen(false)} // Função para fechar o modal
        plan={selectedPlan} // Plano selecionado pelo usuário
        publicKey={MERCADOPAGO_PUBLIC_KEY} // Chave pública do Mercado Pago
        userEmail={currentUser?.email} // Email do usuário logado
        // ===== CORREÇÃO: Passando o CNPJ da empresa para o modal =====
        userDoc={empresaData?.cnpj} // CNPJ da empresa para documentação
      />

      {/* ===== CONTAINER PRINCIPAL DA PÁGINA ===== */}
      <div className="planos-page-container">
        
        {/* ===== CABEÇALHO DA PÁGINA ===== */}
        <div className="planos-header">
          <h1>Nossos Planos</h1>
          <p>Escolha o plano que melhor se adapta ao crescimento da sua empresa.</p>
        </div>

        {/* ===== GRID DE PLANOS ===== */}
        <div className="planos-grid">
          {/* Mapeia todos os planos disponíveis para criar os cards */}
          {Object.entries(DADOS_PLANOS).map(([key, plano]) => (
            <div 
              key={key} 
              className={`plano-card ${plano.destaque ? 'destaque' : ''} ${empresaData?.plan === key ? 'plano-atual' : ''}`}
            >
              {/* ===== BADGES DE DESTAQUE ===== */}
              {/* Mostra badge "Mais Popular" se o plano tem destaque */}
              {plano.destaque && <div className="destaque-badge">Mais Popular</div>}
              
              {/* Mostra badge "Seu Plano Atual" se é o plano ativo do usuário */}
              {empresaData?.plan === key && <div className="plano-atual-badge">Seu Plano Atual</div>}
              
              {/* ===== CABEÇALHO DO CARD ===== */}
              <div className="plano-card-header">
                <div className="plano-icone">{plano.icone}</div>
                <h2>{plano.nome}</h2>
              </div>
              
              {/* ===== PREÇO DO PLANO ===== */}
              <div className="plano-preco">
                <span className="valor">{plano.displayPrice}</span>
                <span className="periodo">{plano.periodo}</span>
              </div>
              
              {/* ===== LISTA DE CARACTERÍSTICAS ===== */}
              <ul className="plano-caracteristicas">
                {plano.caracteristicas.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              
              {/* ===== RODAPÉ DO CARD COM BOTÃO DE AÇÃO ===== */}
              <div className="plano-card-footer">
                {/* Renderização condicional do botão baseada no plano atual */}
                {empresaData?.plan === key ? (
                  // Se é o plano atual, mostra botão desabilitado
                  <button className="botao-plano" disabled>Ativo</button>
                ) : (
                  // Se não é o plano atual, mostra botão de upgrade
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

// ===== EXPORTAÇÃO DO COMPONENTE =====
export default PlanosPage;