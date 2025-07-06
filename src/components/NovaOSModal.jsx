// CÓDIGO NOVO PARA CRIAR EM: src/components/NovaOSModal.jsx
// Todo o código do seu modal de Nova OS agora vive aqui, de forma organizada.

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import { Building, Info, MapPin, Calendar, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';

const estadosBrasileiros = [ "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO" ];

const VALORES_INICIAIS_OS = {
    frotaId: '', 
    descricaoServico: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP',
    dataServico: '', periodoInicio: '',
    valorOfertado: '', formaPagamento: 'PIX',
    requisitos: '', advertencias: '',
    necessitaAutorizacao: false,
};

function NovaOSModal({ isOpen, onClose }) {
    const [frota, setFrota] = useState([]);
    const [newOrderData, setNewOrderData] = useState(VALORES_INICIAIS_OS);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCepLoading, setIsCepLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const fetchFrota = async () => {
                const frotaCollectionRef = collection(db, "frota");
                const data = await getDocs(frotaCollectionRef);
                const frotaList = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setFrota(frotaList);
            };
            fetchFrota();
        }
    }, [isOpen]);

    const closeAndResetModal = () => {
        if (isSubmitting) return;
        setNewOrderData(VALORES_INICIAIS_OS);
        onClose(); 
    };
    
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewOrderData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCepSearch = async (cep) => {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;
        setIsCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            if (!response.ok) throw new Error('CEP não encontrado.');
            const data = await response.json();
            if (data.erro) throw new Error('CEP inválido.');
            setNewOrderData(prevState => ({
                ...prevState,
                logradouro: data.logradouro,
                bairro: data.bairro,
                cidade: data.localidade,
                estado: data.uf,
            }));
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            alert(error.message);
        } finally {
            setIsCepLoading(false);
        }
    };

    useEffect(() => {
        const cepLimpo = newOrderData.cep.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
            handleCepSearch(cepLimpo);
        }
    }, [newOrderData.cep]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const membroDaFrotaSelecionado = frota.find(m => m.id === newOrderData.frotaId);
            if (!membroDaFrotaSelecionado) {
                alert("Por favor, selecione um cliente/veículo da frota.");
                setIsSubmitting(false);
                return;
            }

            const dataToSave = {
                descricaoServico: newOrderData.descricaoServico,
                endereco: {
                    cep: newOrderData.cep, logradouro: newOrderData.logradouro,
                    numero: newOrderData.numero, complemento: newOrderData.complemento,
                    bairro: newOrderData.bairro, cidade: newOrderData.cidade, estado: newOrderData.estado,
                },
                dataServico: Timestamp.fromDate(new Date(newOrderData.dataServico + 'T00:00:00')),
                periodo: newOrderData.periodoInicio,
                valorServicoBruto: Number(newOrderData.valorOfertado),
                formaPagamento: newOrderData.formaPagamento,
                requisitos: newOrderData.requisitos,
                advertencias: newOrderData.advertencias,
                necessitaAutorizacao: newOrderData.necessitaAutorizacao,
                status: 'pendente',
                dataSolicitacao: Timestamp.now(),
                cliente: membroDaFrotaSelecionado.nome,
                frotaId: membroDaFrotaSelecionado.id,
            };
            const docRef = await addDoc(collection(db, "solicitacoes"), dataToSave);
            alert(`Ordem de Serviço criada com sucesso para '${membroDaFrotaSelecionado.nome}'!`);
            
            window.dispatchEvent(new CustomEvent('os-criada'));
            closeAndResetModal();
        } catch (error) {
            console.error("Erro ao criar Ordem de Serviço: ", error);
            alert("Ocorreu um erro ao criar a OS. Verifique o console para mais detalhes.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={closeAndResetModal} title="Criar Nova Ordem de Serviço">
            <form onSubmit={handleSubmit} className="modal-form">
                {/* AQUI VAI TODO O CONTEÚDO (JSX) DO SEU FORMULÁRIO QUE ESTAVA NO MAINLAYOUT */}
                {/* ... cole todo o <div className="form-section"> ... </div> até o <div className="form-actions"> ... </div> aqui ... */}
            </form>
        </Modal>
    );
}

export default NovaOSModal;