// ===================================================================
// ARQUIVO ATUALIZADO: src/pages/GestaoDeLojasPage.jsx
// Funcionalidade de ADICIONAR e VISUALIZAR lojas.
// Adicionada a busca em tempo real e a renderização em tabela.
// ===================================================================

import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
// CORREÇÃO: Adicionado onSnapshot, query, orderBy e updateDoc
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { PlusCircle, Loader2, Edit, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import axios from 'axios';
import './GestaoDeLojasPage.css';

const ESTADO_INICIAL_LOJA = {
    nomeUnidade: '',
    responsavel: '',
    telefone: '',
    tipoOperacao: '',
    endereco: {
        cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '',
    },
};

function GestaoDeLojasPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(ESTADO_INICIAL_LOJA);
    
    // NOVOS ESTADOS para listar as lojas
    const [lojasList, setLojasList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // EFEITO PARA BUSCAR AS LOJAS EM TEMPO REAL
    useEffect(() => {
        setIsLoading(true);
        const lojasCollectionRef = collection(db, "lojas");
        const q = query(lojasCollectionRef, orderBy("nomeUnidade")); // Ordena por nome

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const lojas = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLojasList(lojas);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar lojas: ", error);
            alert("Não foi possível carregar a lista de lojas.");
            setIsLoading(false);
        });

        // Limpa o listener ao desmontar o componente
        return () => unsubscribe();
    }, []);


    const handleOpenModal = () => {
        setFormData(ESTADO_INICIAL_LOJA);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        if (isSubmitting) return;
        setIsModalOpen(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEnderecoChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            endereco: { ...prev.endereco, [name]: value }
        }));
    };

    const handleCepChange = async (e) => {
        const cepValue = e.target.value;
        handleEnderecoChange(e);

        const cep = cepValue.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        endereco: {
                            ...prev.endereco,
                            rua: data.logradouro,
                            bairro: data.bairro,
                            cidade: data.localidade,
                            estado: data.uf,
                        }
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
                alert("Não foi possível buscar o CEP. Por favor, preencha o endereço manualmente.");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const lojasCollectionRef = collection(db, "lojas");
            // Salva os dados iniciais
            const docRef = await addDoc(lojasCollectionRef, formData);
            
            // Cria o código curto e atualiza o documento recém-criado
            const codigoCurto = docRef.id.substring(0, 6).toUpperCase();
            await updateDoc(docRef, { codigoCurto: codigoCurto });

            alert(`Loja "${formData.nomeUnidade}" criada com sucesso!`);
            handleCloseModal();
        } catch (error) {
            console.error("Erro ao criar loja: ", error);
            alert("Falha ao criar a loja. Verifique o console para mais detalhes.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="gestao-lojas-container">
            <div className="page-header">
                <h1>Gestão de Lojas e Unidades</h1>
                <button className="add-button" onClick={handleOpenModal}>
                    <PlusCircle size={20} />
                    <span>Adicionar Nova Loja</span>
                </button>
            </div>
            
            <div className="content-area">
              {/* ÁREA DE CONTEÚDO ATUALIZADA COM A TABELA */}
              <table className="lojas-table">
                <thead>
                    <tr>
                        <th>Cód.</th>
                        <th>Nome da Unidade</th>
                        <th>Responsável</th>
                        <th>Cidade/UF</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr><td colSpan="5" className="table-message"><Loader2 className="animate-spin" /> Carregando lojas...</td></tr>
                    ) : lojasList.length > 0 ? (
                        lojasList.map(loja => (
                            <tr key={loja.id}>
                                <td><span className="codigo-loja">{loja.codigoCurto || 'N/A'}</span></td>
                                <td>{loja.nomeUnidade}</td>
                                <td>{loja.responsavel}</td>
                                <td>{loja.endereco.cidade} / {loja.endereco.estado}</td>
                                <td className="actions-cell">
                                    <button className="action-button edit-button" title="Editar Loja (em breve)">
                                        <Edit size={16} />
                                    </button>
                                    <button className="action-button delete-button" title="Excluir Loja (em breve)">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="5" className="table-message">Nenhuma loja cadastrada. Clique em "Adicionar Nova Loja" para começar.</td></tr>
                    )}
                </tbody>
              </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Adicionar Nova Loja">
                <form onSubmit={handleSubmit} className="modal-form-loja">
                    <div className="form-group">
                        <label htmlFor="nomeUnidade">Nome da Unidade / Loja</label>
                        <input id="nomeUnidade" name="nomeUnidade" type="text" value={formData.nomeUnidade} onChange={handleInputChange} required placeholder="Ex: Centro de Distribuição SP" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="responsavel">Nome do Responsável</label>
                        <input id="responsavel" name="responsavel" type="text" value={formData.responsavel} onChange={handleInputChange} required placeholder="Ex: João da Silva" />
                    </div>
                     <div className="form-group">
                        <label htmlFor="telefone">Telefone de Contato</label>
                        <input id="telefone" name="telefone" type="tel" value={formData.telefone} onChange={handleInputChange} placeholder="(11) 99999-9999" />
                    </div>
                     <div className="form-group">
                        <label htmlFor="tipoOperacao">Tipo de Operação Principal</label>
                        <input id="tipoOperacao" name="tipoOperacao" type="text" value={formData.tipoOperacao} onChange={handleInputChange} placeholder="Ex: Grãos, Cargas refrigeradas, etc." />
                    </div>

                    <h4 className="form-subtitle">Endereço da Loja</h4>
                    <div className="form-group">
                        <label htmlFor="cep">CEP</label>
                        <input id="cep" name="cep" type="text" value={formData.endereco.cep} onChange={handleCepChange} maxLength="9" placeholder="Digite o CEP para buscar" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="rua">Rua / Logradouro</label>
                        <input id="rua" name="rua" type="text" value={formData.endereco.rua} onChange={handleEnderecoChange} required />
                    </div>
                    <div className="form-row-2-col">
                        <div className="form-group">
                            <label htmlFor="numero">Número</label>
                            <input id="numero" name="numero" type="text" value={formData.endereco.numero} onChange={handleEnderecoChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="bairro">Bairro</label>
                            <input id="bairro" name="bairro" type="text" value={formData.endereco.bairro} onChange={handleEnderecoChange} required />
                        </div>
                    </div>
                     <div className="form-row-2-col">
                        <div className="form-group">
                            <label htmlFor="cidade">Cidade</label>
                            <input id="cidade" name="cidade" type="text" value={formData.endereco.cidade} onChange={handleEnderecoChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="estado">Estado</label>
                            <input id="estado" name="estado" type="text" value={formData.endereco.estado} onChange={handleEnderecoChange} required maxLength="2" />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={handleCloseModal} disabled={isSubmitting}>
                            Cancelar
                        </button>
                        <button type="submit" className="add-button" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Salvar Loja'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default GestaoDeLojasPage;
