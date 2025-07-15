// ===================================================================
// ARQUIVO 100% COMPLETO E CORRIGIDO (v2): src/pages/GestaoDeLojasPage.jsx
// Corrigido o erro de referência ao ícone 'MapPin'.
// ===================================================================

import React, { useState, useEffect } from 'react';
import './GestaoDeLojasPage.css';
import { db, auth } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, where, updateDoc } from 'firebase/firestore';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
// ===== CORREÇÃO: Ícone 'MapPin' adicionado à lista de importação =====
import { PlusCircle, Edit, Trash2, Loader2, Home, User, Mail, Phone, MapPin } from 'lucide-react';
import axios from 'axios';

const ESTADO_INICIAL_LOJA = {
    nomeUnidade: '',
    cnpj: '',
    endereco: { rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' },
    responsavel: { nome: '', email: '', telefone: '' },
    ativo: true
};

function GestaoDeLojasPage() {
    const [lojasList, setLojasList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(ESTADO_INICIAL_LOJA);
    const [lojaEmEdicaoId, setLojaEmEdicaoId] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [lojaParaExcluir, setLojaParaExcluir] = useState(null);

    useEffect(() => {
        if (!auth.currentUser) {
            setIsLoading(false);
            return;
        };
        
        setIsLoading(true);
        const lojasCollectionRef = collection(db, "lojas");
        const q = query(
            lojasCollectionRef,
            where("empresaId", "==", auth.currentUser.uid),
            orderBy("nomeUnidade")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lojas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLojasList(lojas);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar lojas: ", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleInputChange = (e, section = null) => {
        const { name, value } = e.target;
        if (section) {
            setFormData(prev => ({
                ...prev,
                [section]: { ...prev[section], [name]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const abrirModalParaAdicionar = () => {
        setFormData(ESTADO_INICIAL_LOJA);
        setLojaEmEdicaoId(null);
        setIsModalOpen(true);
    };

    const abrirModalParaEditar = (loja) => {
        const dadosParaEdicao = { ...ESTADO_INICIAL_LOJA, ...loja };
        // Garante que os objetos aninhados não sejam undefined
        dadosParaEdicao.endereco = { ...ESTADO_INICIAL_LOJA.endereco, ...loja.endereco };
        dadosParaEdicao.responsavel = { ...ESTADO_INICIAL_LOJA.responsavel, ...loja.responsavel };
        
        setFormData(dadosParaEdicao);
        setLojaEmEdicaoId(loja.id);
        setIsModalOpen(true);
    };

    const fecharModal = () => {
        if (isSubmitting) return;
        setIsModalOpen(false);
    };

    const abrirModalConfirmacao = (loja) => {
        setLojaParaExcluir(loja);
        setIsConfirmModalOpen(true);
    };

    const handleSalvarLoja = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) {
            alert("Erro de autenticação. Por favor, faça login novamente.");
            return;
        }
        setIsSubmitting(true);
        try {
            if (lojaEmEdicaoId) {
                const lojaDoc = doc(db, "lojas", lojaEmEdicaoId);
                await updateDoc(lojaDoc, formData);
                alert("Loja atualizada com sucesso!");
            } else {
                const dadosParaSalvar = {
                    ...formData,
                    empresaId: auth.currentUser.uid
                };
                await addDoc(collection(db, "lojas"), dadosParaSalvar);
                alert("Nova loja adicionada com sucesso!");
            }
            fecharModal();
        } catch (error) {
            console.error("Erro ao salvar loja: ", error);
            alert("Ocorreu um erro ao salvar a loja.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmarExclusao = async () => {
        if (!lojaParaExcluir) return;
        try {
            await deleteDoc(doc(db, "lojas", lojaParaExcluir.id));
            alert("Loja excluída com sucesso.");
        } catch (error) {
            console.error("Erro ao excluir loja: ", error);
            alert("Ocorreu um erro ao excluir a loja.");
        } finally {
            setIsConfirmModalOpen(false);
            setLojaParaExcluir(null);
        }
    };

    return (
        <div className="gestao-lojas-container">
            <div className="gestao-header">
                <h1 className="gestao-title">Gestão de Lojas</h1>
                <button className="add-button" onClick={abrirModalParaAdicionar}>
                    <PlusCircle size={20} />
                    Adicionar Loja
                </button>
            </div>
            <div className="table-container">
                <table className="lojas-table">
                    <thead>
                        <tr>
                            <th>Nome da Unidade</th>
                            <th>CNPJ</th>
                            <th>Cidade/Estado</th>
                            <th>Responsável</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" className="table-message"><Loader2 className="animate-spin" /> Carregando lojas...</td></tr>
                        ) : lojasList.length > 0 ? (
                            lojasList.map((loja) => (
                                <tr key={loja.id}>
                                    <td>{loja.nomeUnidade}</td>
                                    <td>{loja.cnpj}</td>
                                    <td>{loja.endereco?.cidade}/{loja.endereco?.estado}</td>
                                    <td>{loja.responsavel?.nome}</td>
                                    <td className="actions-cell">
                                        <button title="Editar" className="action-button edit-button" onClick={() => abrirModalParaEditar(loja)}><Edit size={16} /></button>
                                        <button title="Excluir" className="action-button delete-button" onClick={() => abrirModalConfirmacao(loja)}><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="table-message">Nenhuma loja cadastrada para esta empresa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={fecharModal} title={lojaEmEdicaoId ? 'Editar Loja' : 'Adicionar Nova Loja'}>
                <form onSubmit={handleSalvarLoja} className="modal-form-frota">
                    <h4 className="form-subtitle"><Home size={16} /> Dados da Loja</h4>
                    <div className="form-group"><label>Nome da Unidade</label><input name="nomeUnidade" value={formData.nomeUnidade} onChange={handleInputChange} required /></div>
                    <div className="form-group"><label>CNPJ da Unidade</label><input name="cnpj" value={formData.cnpj} onChange={handleInputChange} /></div>

                    <h4 className="form-subtitle"><MapPin size={16} /> Endereço</h4>
                    <div className="form-group"><label>CEP</label><input name="cep" value={formData.endereco.cep} onChange={(e) => handleInputChange(e, 'endereco')} maxLength="9" /></div>
                    <div className="form-group"><label>Rua</label><input name="rua" value={formData.endereco.rua} onChange={(e) => handleInputChange(e, 'endereco')} /></div>
                    <div className="form-row-2-col">
                        <div className="form-group"><label>Número</label><input name="numero" value={formData.endereco.numero} onChange={(e) => handleInputChange(e, 'endereco')} /></div>
                        <div className="form-group"><label>Bairro</label><input name="bairro" value={formData.endereco.bairro} onChange={(e) => handleInputChange(e, 'endereco')} /></div>
                    </div>
                    <div className="form-row-2-col">
                        <div className="form-group"><label>Cidade</label><input name="cidade" value={formData.endereco.cidade} onChange={(e) => handleInputChange(e, 'endereco')} /></div>
                        <div className="form-group"><label>Estado</label><input name="estado" value={formData.endereco.estado} onChange={(e) => handleInputChange(e, 'endereco')} maxLength="2" /></div>
                    </div>

                    <h4 className="form-subtitle"><User size={16} /> Contato Responsável</h4>
                    <div className="form-group"><label>Nome do Responsável</label><input name="nome" value={formData.responsavel.nome} onChange={(e) => handleInputChange(e, 'responsavel')} /></div>
                    <div className="form-row-2-col">
                        <div className="form-group"><label>Email</label><input name="email" type="email" value={formData.responsavel.email} onChange={(e) => handleInputChange(e, 'responsavel')} /></div>
                        <div className="form-group"><label>Telefone</label><input name="telefone" type="tel" value={formData.responsavel.telefone} onChange={(e) => handleInputChange(e, 'responsavel')} /></div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={fecharModal} disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" className="add-button" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : (lojaEmEdicaoId ? 'Salvar Alterações' : 'Adicionar Loja')}
                        </button>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmarExclusao}
                title="Confirmar Exclusão"
            >
                <p>Você tem certeza que deseja excluir esta loja permanentemente?</p>
                {lojaParaExcluir && <p className="item-destaque">{lojaParaExcluir.nomeUnidade}</p>}
            </ConfirmationModal>
        </div>
    );
}

export default GestaoDeLojasPage;