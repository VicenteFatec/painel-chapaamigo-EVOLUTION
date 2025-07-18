// ===================================================================
// COMPONENTE PAYMENTMODAL.JSX - VERSÃO FINAL (Correção de Payload)
// Esta versão corrige a captura dos dados do formulário no onSubmit.
// ===================================================================

// ===================================================================
// SEÇÃO 1: IMPORTAÇÕES E DEPENDÊNCIAS
// ===================================================================
// Importa todas as bibliotecas necessárias para funcionamento do componente

import React, { useEffect, useState, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Modal from './Modal';
import { Loader2 } from 'lucide-react';
import './PaymentModal.css';

// ===================================================================
// SEÇÃO 2: COMPONENTE PAYMENTFORM - FORMULÁRIO DE PAGAMENTO
// ===================================================================
// Este componente é responsável por renderizar o formulário de pagamento
// utilizando o SDK do Mercado Pago (Brick) para capturar dados do cartão

const PaymentForm = ({ publicKey, plan, onSuccess, onError }) => {
    // ESTADOS DO COMPONENTE
    // Controla o carregamento e status do formulário
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState({ scriptLoaded: false, brickReady: false });
    const brickControllerRef = useRef(null); // Referência para controlar o Brick

    // ===================================================================
    // SEÇÃO 2.1: CARREGAMENTO CONTROLADO DO SDK MERCADO PAGO
    // ===================================================================
    // Este useEffect gerencia o carregamento do script do Mercado Pago
    // Evita carregar múltiplas vezes e trata erros de carregamento
    
    useEffect(() => {
        // VERIFICAÇÃO SE O SCRIPT JÁ EXISTE
        // Evita carregar o mesmo script múltiplas vezes
        const existingScript = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
        if (existingScript) {
            setStatus(prev => ({ ...prev, scriptLoaded: true }));
            return;
        }

        // CRIAÇÃO E INJEÇÃO DO SCRIPT DO SDK
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        
        // CALLBACK DE SUCESSO NO CARREGAMENTO
        script.onload = () => {
            console.log('✅ SDK do Mercado Pago injetado e carregado com sucesso.');
            setStatus(prev => ({ ...prev, scriptLoaded: true }));
        };
        
        // CALLBACK DE ERRO NO CARREGAMENTO
        script.onerror = () => {
            console.error('❌ Falha ao carregar o script do Mercado Pago.');
            onError('Não foi possível carregar o SDK de pagamento.');
        };
        
        // ADICIONA O SCRIPT AO DOM
        document.body.appendChild(script);
        
        // CLEANUP FUNCTION - Remove o script quando o componente é desmontado
        return () => {
            const scriptTag = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
            if (scriptTag) {
                document.body.removeChild(scriptTag);
            }
        };
    }, [onError]);

    // ===================================================================
    // SEÇÃO 2.2: INICIALIZAÇÃO DO BRICK (FORMULÁRIO DE PAGAMENTO)
    // ===================================================================
    // Este useEffect inicializa o Brick do Mercado Pago após o SDK carregar
    // O Brick é o componente visual que captura os dados do cartão
    
    useEffect(() => {
        // VALIDAÇÕES INICIAIS
        // Verifica se todas as condições estão prontas antes de inicializar
        if (!status.scriptLoaded || !plan || brickControllerRef.current) {
            return;
        }

        // TIMER PARA AGUARDAR CARREGAMENTO COMPLETO
        // Aguarda um pouco para garantir que o SDK está totalmente carregado
        const timer = setTimeout(() => {
            initializeBrick();
        }, 100);

        // FUNÇÃO DE INICIALIZAÇÃO DO BRICK
        const initializeBrick = async () => {
            try {
                // VERIFICAÇÃO DA DISPONIBILIDADE DO MERCADOPAGO
                if (!window.MercadoPago) {
                    console.error('❌ MercadoPago não está disponível no window');
                    onError('SDK do MercadoPago não foi carregado corretamente.');
                    return;
                }

                // INICIALIZAÇÃO DO CLIENTE MERCADOPAGO
                const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });

                // VERIFICAÇÃO DO CONTÊINER DO BRICK
                const container = document.getElementById('cardPaymentBrick_container');
                if (!container) {
                    console.error('❌ Contêiner do Brick não encontrado no DOM.');
                    onError('Contêiner do formulário não encontrado.');
                    return;
                }

                // LIMPEZA DO CONTÊINER
                // Limpa o contêiner antes de criar o novo brick
                container.innerHTML = '';
                
                // CRIAÇÃO DO BUILDER DE BRICKS
                const bricksBuilder = mp.bricks();
                
                // VERIFICAÇÃO DO MÉTODO CREATE
                if (!bricksBuilder || typeof bricksBuilder.create !== 'function') {
                    console.error('❌ Método create não encontrado no bricksBuilder:', bricksBuilder);
                    onError('Erro na inicialização do formulário de pagamento.');
                    return;
                }

                // CONFIGURAÇÃO E CRIAÇÃO DO BRICK
                const controller = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
                    // CONFIGURAÇÕES INICIAIS
                    initialization: {
                        amount: parseFloat(plan.price), // Valor do plano
                        payer: {
                            email: 'test_user_12345@test.com', // Email do pagador
                        },
                    },
                    
                    // CUSTOMIZAÇÕES VISUAIS E FUNCIONAIS
                    customization: {
                        visual: { 
                            style: { 
                                theme: 'default' // Tema padrão do formulário
                            } 
                        },
                        paymentMethods: { 
                            maxInstallments: 1, // Apenas pagamento à vista
                            types: { 
                                included: ["credit_card"] // Apenas cartão de crédito
                            } 
                        }
                    },
                    
                    // CALLBACKS DE EVENTOS
                    callbacks: {
                        // CALLBACK QUANDO O BRICK ESTÁ PRONTO
                        onReady: () => {
                            console.log('✅ Brick pronto para uso.');
                            setStatus(prev => ({ ...prev, brickReady: true }));
                        },
                        
                        // CALLBACK DE ERRO DO BRICK
                        onError: (error) => {
                            console.error('❌ Erro completo do Brick:', JSON.stringify(error, null, 2));
                            onError(`Erro no formulário: ${error.message || 'Causa desconhecida'}`);
                        },
                        
                        // CALLBACK DE SUBMISSÃO DO FORMULÁRIO
                        // Esta é a função mais importante - processa os dados do cartão
                        onSubmit: async (formData) => {
                            console.log('📝 Dados brutos recebidos do formulário. Enviando para o backend...', formData);
                            setIsLoading(true);
                            
                            try {
                                // VALIDAÇÃO DOS DADOS DO FORMULÁRIO
                                if (!formData || !formData.token) {
                                    console.error('❌ Dados do formulário inválidos:', formData);
                                    throw new Error('Dados do cartão inválidos. Tente novamente.');
                                }

                                // PREPARAÇÃO PARA CHAMADA DO BACKEND
                                const functions = getFunctions();
                                const createSubscriptionFunction = httpsCallable(functions, 'createSubscription');
                                
                                // CHAMADA DA CLOUD FUNCTION
                                const result = await createSubscriptionFunction({
                                    planId: plan.id,
                                    cardData: {
                                        token: formData.token,
                                        // Incluir outros dados opcionais se disponíveis
                                        ...(formData.payment_method_id && { payment_method_id: formData.payment_method_id }),
                                        ...(formData.issuer_id && { issuer_id: formData.issuer_id }),
                                        ...(formData.installments && { installments: formData.installments })
                                    }
                                });

                                console.log('📊 Resposta do backend:', result);

                                // PROCESSAMENTO DA RESPOSTA
                                if (result.data && result.data.success) {
                                    console.log('✅ Assinatura criada com sucesso pelo backend!');
                                    onSuccess(result.data.subscriptionId);
                                } else {
                                    throw new Error(result.data?.error || 'Falha no backend.');
                                }
                            } catch (err) {
                                // TRATAMENTO DE ERROS
                                console.error('❌ Erro ao chamar a Cloud Function:', err);
                                onError(err.message || 'Não foi possível completar a assinatura.');
                                setIsLoading(false);
                            }
                        },
                    },
                });
                
                // ARMAZENAMENTO DA REFERÊNCIA DO CONTROLLER
                brickControllerRef.current = controller;
                console.log('✅ Brick inicializado com sucesso:', controller);
                
            } catch (error) {
                // TRATAMENTO DE ERROS CRÍTICOS
                console.error("❌ Erro CRÍTICO ao inicializar o Brick:", error);
                onError("Não foi possível carregar o formulário de pagamento.");
            }
        };

        // CLEANUP FUNCTION
        return () => {
            clearTimeout(timer);
            if (brickControllerRef.current) {
                try {
                    brickControllerRef.current.unmount();
                } catch (e) {
                    console.warn('Erro ao desmontar brick:', e);
                }
                brickControllerRef.current = null;
            }
        };
    }, [status.scriptLoaded, plan, publicKey, onError, onSuccess]);

    // ===================================================================
    // SEÇÃO 2.3: RENDERIZAÇÃO DO COMPONENTE PAYMENTFORM
    // ===================================================================
    // Renderiza o formulário com overlay de carregamento

    return (
        <div className="payment-form-container">
            {/* OVERLAY DE CARREGAMENTO */}
            {/* Exibe spinner enquanto carrega ou processa pagamento */}
            {(!status.brickReady || isLoading) && (
                <div className="payment-overlay">
                    <Loader2 className="animate-spin" size={48} />
                    <p>
                        {isLoading 
                            ? 'Processando sua assinatura...' 
                            : 'Carregando formulário de pagamento seguro...'}
                    </p>
                </div>
            )}
            
            {/* CONTÊINER DO BRICK */}
            {/* Aqui será injetado o formulário do Mercado Pago */}
            <div id="cardPaymentBrick_container"></div>
        </div>
    );
};

// ===================================================================
// SEÇÃO 3: COMPONENTE PRINCIPAL - PAYMENTMODAL
// ===================================================================
// Este é o componente modal que gerencia o fluxo completo de pagamento
// Controla os diferentes estados: formulário, sucesso, erro

function PaymentModal({ isOpen, onClose, plan, publicKey }) {
    // ESTADOS DO MODAL
    const [step, setStep] = useState('form'); // Controla qual tela mostrar
    const [subscriptionId, setSubscriptionId] = useState(''); // ID da assinatura criada
    const [errorMessage, setErrorMessage] = useState(''); // Mensagens de erro

    // ===================================================================
    // SEÇÃO 3.1: HANDLERS DE EVENTOS
    // ===================================================================
    // Funções que lidam com os diferentes eventos do modal

    // HANDLER DE SUCESSO
    // Chamado quando a assinatura é criada com sucesso
    const handleSuccess = (subId) => {
        setSubscriptionId(subId);
        setStep('success'); // Muda para tela de sucesso
    };

    // HANDLER DE ERRO
    // Chamado quando ocorre algum erro no processo
    const handleError = (errorMsg) => {
        console.error('❌ Erro no PaymentModal:', errorMsg);
        setErrorMessage(errorMsg);
    };
    
    // HANDLER DE FECHAMENTO
    // Reseta o estado e fecha o modal
    const handleClose = () => {
        setStep('form');
        setErrorMessage('');
        setSubscriptionId('');
        onClose();
    }
    
    // HANDLER DE FECHAMENTO COM SUCESSO
    // Fecha o modal e recarrega a página após sucesso
    const handleSuccessClose = () => {
        handleClose();
        window.location.reload(); // Recarrega para atualizar status da assinatura
    }

    // VERIFICAÇÃO SE O MODAL DEVE SER RENDERIZADO
    if (!isOpen) return null;

    // ===================================================================
    // SEÇÃO 3.2: RENDERIZAÇÃO DO MODAL
    // ===================================================================
    // Renderiza diferentes telas baseadas no estado atual

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Assinar Plano ${plan?.nome}`}>
            {/* TELA DO FORMULÁRIO DE PAGAMENTO */}
            {step === 'form' && (
                <>
                    {/* EXIBIÇÃO DE MENSAGENS DE ERRO */}
                    {errorMessage && <p className="payment-error-modal">{errorMessage}</p>}
                    
                    {/* COMPONENTE DO FORMULÁRIO DE PAGAMENTO */}
                    <PaymentForm 
                        key={`${plan.id}-${Date.now()}`} // Chave única para forçar re-render
                        publicKey={publicKey} 
                        plan={plan}
                        onSuccess={handleSuccess}
                        onError={handleError}
                    />
                </>
            )}
            
            {/* TELA DE SUCESSO */}
            {step === 'success' && (
                <div className="payment-success-container">
                    <h2>Assinatura Realizada com Sucesso!</h2>
                    <p>Bem-vindo ao Plano {plan.nome}.</p>
                    <p>ID da sua assinatura: <strong>{subscriptionId}</strong></p>
                    <button onClick={handleSuccessClose} className="botao-plano upgrade">
                        Fechar
                    </button>
                </div>
            )}
        </Modal>
    );
}

// ===================================================================
// SEÇÃO 4: EXPORTAÇÃO DO COMPONENTE
// ===================================================================
// Exporta o componente para uso em outras partes da aplicação

export default PaymentModal;