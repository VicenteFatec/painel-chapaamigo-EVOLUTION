// src/components/PaymentModal.jsx - VERSÃO FINAL (Correção de Payload)
// Esta versão corrige a captura dos dados do formulário no onSubmit.

import React, { useEffect, useState, useRef } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Modal from './Modal';
import { Loader2 } from 'lucide-react';
import './PaymentModal.css';

// --- Componente do formulário de pagamento ---
const PaymentForm = ({ publicKey, plan, onSuccess, onError }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState({ scriptLoaded: false, brickReady: false });
    const brickControllerRef = useRef(null);

    // Carregamento controlado do SDK
    useEffect(() => {
        const existingScript = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
        if (existingScript) {
            setStatus(prev => ({ ...prev, scriptLoaded: true }));
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
            console.log('✅ SDK do Mercado Pago injetado e carregado com sucesso.');
            setStatus(prev => ({ ...prev, scriptLoaded: true }));
        };
        script.onerror = () => {
            console.error('❌ Falha ao carregar o script do Mercado Pago.');
            onError('Não foi possível carregar o SDK de pagamento.');
        };
        document.body.appendChild(script);
        return () => {
            const scriptTag = document.querySelector('script[src="https://sdk.mercadopago.com/js/v2"]');
            if (scriptTag) {
                document.body.removeChild(scriptTag);
            }
        };
    }, [onError]);

    // Inicialização do Brick
    useEffect(() => {
        if (!status.scriptLoaded || !plan || brickControllerRef.current) {
            return;
        }

        // Aguardar um pouco para garantir que o SDK está totalmente carregado
        const timer = setTimeout(() => {
            initializeBrick();
        }, 100);

        const initializeBrick = async () => {
            try {
                // Verificar se o MercadoPago está disponível globalmente
                if (!window.MercadoPago) {
                    console.error('❌ MercadoPago não está disponível no window');
                    onError('SDK do MercadoPago não foi carregado corretamente.');
                    return;
                }

                const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });

                const container = document.getElementById('cardPaymentBrick_container');
                if (!container) {
                    console.error('❌ Contêiner do Brick não encontrado no DOM.');
                    onError('Contêiner do formulário não encontrado.');
                    return;
                }

                // Limpar o contêiner antes de criar o novo brick
                container.innerHTML = '';
                
                const bricksBuilder = mp.bricks();
                
                // Verificar se o método create existe
                if (!bricksBuilder || typeof bricksBuilder.create !== 'function') {
                    console.error('❌ Método create não encontrado no bricksBuilder:', bricksBuilder);
                    onError('Erro na inicialização do formulário de pagamento.');
                    return;
                }

                const controller = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
                    initialization: {
                        amount: parseFloat(plan.price),
                        payer: {
                            email: 'test_user_12345@test.com',
                        },
                    },
                    customization: {
                        visual: { 
                            style: { 
                                theme: 'default' 
                            } 
                        },
                        paymentMethods: { 
                            maxInstallments: 1, 
                            types: { 
                                included: ["credit_card"] 
                            } 
                        }
                    },
                    callbacks: {
                        onReady: () => {
                            console.log('✅ Brick pronto para uso.');
                            setStatus(prev => ({ ...prev, brickReady: true }));
                        },
                        onError: (error) => {
                            console.error('❌ Erro completo do Brick:', JSON.stringify(error, null, 2));
                            onError(`Erro no formulário: ${error.message || 'Causa desconhecida'}`);
                        },
                        onSubmit: async (formData) => {
                            console.log('📝 Dados brutos recebidos do formulário. Enviando para o backend...', formData);
                            setIsLoading(true);
                            
                            try {
                                // Verificar se formData tem a estrutura esperada
                                if (!formData || !formData.token) {
                                    console.error('❌ Dados do formulário inválidos:', formData);
                                    throw new Error('Dados do cartão inválidos. Tente novamente.');
                                }

                                const functions = getFunctions();
                                const createSubscriptionFunction = httpsCallable(functions, 'createSubscription');
                                
                                const result = await createSubscriptionFunction({
                                    planId: plan.id,
                                    cardData: {
                                        token: formData.token,
                                        // Incluir outros dados se necessário
                                        ...(formData.payment_method_id && { payment_method_id: formData.payment_method_id }),
                                        ...(formData.issuer_id && { issuer_id: formData.issuer_id }),
                                        ...(formData.installments && { installments: formData.installments })
                                    }
                                });

                                console.log('📊 Resposta do backend:', result);

                                if (result.data && result.data.success) {
                                    console.log('✅ Assinatura criada com sucesso pelo backend!');
                                    onSuccess(result.data.subscriptionId);
                                } else {
                                    throw new Error(result.data?.error || 'Falha no backend.');
                                }
                            } catch (err) {
                                console.error('❌ Erro ao chamar a Cloud Function:', err);
                                onError(err.message || 'Não foi possível completar a assinatura.');
                                setIsLoading(false);
                            }
                        },
                    },
                });
                
                brickControllerRef.current = controller;
                console.log('✅ Brick inicializado com sucesso:', controller);
                
            } catch (error) {
                console.error("❌ Erro CRÍTICO ao inicializar o Brick:", error);
                onError("Não foi possível carregar o formulário de pagamento.");
            }
        };

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

    return (
        <div className="payment-form-container">
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
            <div id="cardPaymentBrick_container"></div>
        </div>
    );
};

// --- Componente principal do Modal ---
function PaymentModal({ isOpen, onClose, plan, publicKey }) {
    const [step, setStep] = useState('form');
    const [subscriptionId, setSubscriptionId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSuccess = (subId) => {
        setSubscriptionId(subId);
        setStep('success');
    };

    const handleError = (errorMsg) => {
        console.error('❌ Erro no PaymentModal:', errorMsg);
        setErrorMessage(errorMsg);
    };
    
    const handleClose = () => {
        setStep('form');
        setErrorMessage('');
        setSubscriptionId('');
        onClose();
    }
    
    const handleSuccessClose = () => {
        handleClose();
        window.location.reload(); 
    }

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Assinar Plano ${plan?.nome}`}>
            {step === 'form' && (
                <>
                    {errorMessage && <p className="payment-error-modal">{errorMessage}</p>}
                    <PaymentForm 
                        key={`${plan.id}-${Date.now()}`} // Chave única para forçar re-render
                        publicKey={publicKey} 
                        plan={plan}
                        onSuccess={handleSuccess}
                        onError={handleError}
                    />
                </>
            )}
            {step === 'success' && (
                <div className="payment-success-container">
                    <h2>Assinatura Realizada com Sucesso!</h2>
                    <p>Bem-vindo ao Plano {plan.nome}.</p>
                    <p>ID da sua assinatura: <strong>{subscriptionId}</strong></p>
                    <button onClick={handleSuccessClose} className="botao-plano upgrade">Fechar</button>
                </div>
            )}
        </Modal>
    );
}

export default PaymentModal;