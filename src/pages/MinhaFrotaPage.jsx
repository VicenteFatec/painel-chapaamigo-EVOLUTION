// ===================================================================
// ARQUIVO 100% COMPLETO E CORRIGIDO: src/pages/MinhaFrotaPage.jsx
// Aplicado o filtro de segurança na busca e o "carimbo" na criação.
// ===================================================================

import React, { useState, useEffect } from 'react';
import './MinhaFrotaPage.css';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { db, auth } from '../firebaseConfig'; // Importado 'auth'
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc, where } from 'firebase/firestore'; // Importado 'where'
import { PlusCircle, Edit, Trash2, Loader2, User, Truck, MapPin, Building } from 'lucide-react';
import axios from 'axios';

const ESTADO_INICIAL_FROTA = {
    nomeCompleto: '',
    cpf: '',
    rg: '',
    dataNascimento: '',
    cnh: '',
    telefone: '',
    veiculo: { modelo: '', placa: '' },
    enderecoMotorista: { cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '' },
    lojaId: '',
    ativo: true
};

function MinhaFrotaPage() {
    const [frotaList, setFrotaList] = useState([]);
    const [lojasList, setLojasList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState(ESTADO_INICIAL_FROTA);
    const [membroEmEdicaoId, setMembroEmEdicaoId] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [membroParaExcluir, setMembroParaExcluir] = useState(null);

    // EFEITO PARA BUSCAR A FROTA DA EMPRESA LOGADA
    useEffect(() => {
        if (!auth.currentUser) return;
        setIsLoading(true);
        const frotaCollectionRef = collection(db, "frota");
        const q = query(
            frotaCollectionRef, 
            where("empresaId", "==", auth.currentUser.uid), // Filtro de segurança
            orderBy("nomeCompleto")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const frota = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFrotaList(frota);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao buscar frota: ", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // EFEITO PARA BUSCAR AS LOJAS DA EMPRESA LOGADA
    useEffect(() => {
        if (!auth.currentUser) return;
        const lojasCollectionRef = collection(db, "lojas");
        const q = query(
            lojasCollectionRef,
            where("empresaId", "==", auth.currentUser.uid), // Filtro de segurança
            orderBy("nomeUnidade")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lojas = snapshot.docs.map(doc => ({ id: doc.id, nomeUnidade: doc.data().nomeUnidade }));
            setLojasList(lojas);
        });
        return () => unsubscribe();
    }, []);
    
    // Funções para manipular o formulário
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleVeiculoChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, veiculo: { ...prev.veiculo, [name]: value } }));
    };

    const handleEnderecoChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, enderecoMotorista: { ...prev.enderecoMotorista, [name]: value } }));
    };

    const handleCepChange = async (e) => {
        const cepValue = e.target.value.replace(/\D/g, '');
        const cepFormatado = cepValue.replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
        setFormData(prev => ({...prev, enderecoMotorista: {...prev.enderecoMotorista, cep: cepFormatado}}));
        if (cepValue.length === 8) {
            try {
                const { data } = await axios.get(`https://viacep.com.br/ws/${cepValue}/json/`);
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        enderecoMotorista: {
                            ...prev.enderecoMotorista,
                            rua: data.logradouro,
                            bairro: data.bairro,
                            cidade: data.localidade,
                            estado: data.uf,
                        }
                    }));
                }
            } catch (error) { console.error("Erro ao buscar CEP:", error); }
        }
    };

    // Funções para controlar os modais
    const abrirModalParaAdicionar = () => {
        setFormData(ESTADO_INICIAL_FROTA);
        setMembroEmEdicaoId(null);
        setIsModalOpen(true);
    };

    const abrirModalParaEditar = (membro) => {
        const dadosParaEdicao = {
            ...ESTADO_INICIAL_FROTA,
            ...membro,
            veiculo: { ...ESTADO_INICIAL_FROTA.veiculo, ...membro.veiculo },
            enderecoMotorista: { ...ESTADO_INICIAL_FROTA.enderecoMotorista, ...membro.enderecoMotorista },
        };
        setFormData(dadosParaEdicao);
        setMembroEmEdicaoId(membro.id);
        setIsModalOpen(true);
    };

    const fecharModal = () => {
        if (isSubmitting) return;
        setIsModalOpen(false);
    };

    const abrirModalConfirmacao = (membro) => {
        setMembroParaExcluir(membro);
        setIsConfirmModalOpen(true);
    };

    // FUNÇÃO DE SALVAR COM O "CARIMBO" DE EMPRESA
    const handleSalvarMembro = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) {
            alert("Erro de autenticação. Por favor, faça login novamente.");
            return;
        }
        setIsSubmitting(true);
        try {
            if (membroEmEdicaoId) {
                const membroDoc = doc(db, "frota", membroEmEdicaoId);
                await updateDoc(membroDoc, formData);
                alert("Membro da frota atualizado com sucesso!");
            } else {
                const dadosParaSalvar = {
                    ...formData,
                    empresaId: auth.currentUser.uid // O CARIMBO
                };
                await addDoc(collection(db, "frota"), dadosParaSalvar);
                alert("Novo membro adicionado à frota com sucesso!");
            }
            fecharModal();
        } catch (error) {
            console.error("Erro ao salvar membro: ", error);
            alert("Ocorreu um erro ao salvar. Verifique o console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmarExclusao = async () => {
        if (!membroParaExcluir) return;
        try {
            await deleteDoc(doc(db, "frota", membroParaExcluir.id));
            alert("Membro excluído com sucesso.");
        } catch (error) {
            console.error("Erro ao excluir membro: ", error);
            alert("Ocorreu um erro ao excluir.");
        } finally {
            setIsConfirmModalOpen(false);
            setMembroParaExcluir(null);
        }
    };

    const getNomeLoja = (lojaId) => {
        const loja = lojasList.find(l => l.id === lojaId);
        return loja ? loja.nomeUnidade : 'Não vinculada';
    };

    return (
        <div className="frota-container">
            <div className="frota-header">
                <h1 className="frota-title">Minha Frota</h1>
                <button className="add-button" onClick={abrirModalParaAdicionar}>
                    <PlusCircle size={20} />
                    Adicionar Motorista
                </button>
            </div>

            <div className="table-container">
                <table className="frota-table">
                    <thead>
                        <tr>
                            <th>Motorista</th>
                            <th>Veículo</th>
                            <th>Telefone</th>
                            <th>Loja Vinculada</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" className="table-message"><Loader2 className="animate-spin" /> Carregando frota...</td></tr>
                        ) : frotaList.length > 0 ? (
                            frotaList.map((membro) => (
                                <tr key={membro.id}>
                                    <td>{membro.nomeCompleto || membro.nome}</td>
                                    <td>{membro.veiculo?.modelo || 'N/A'} ({membro.veiculo?.placa || membro.placa})</td>
                                    <td>{membro.telefone}</td>
                                    <td>{getNomeLoja(membro.lojaId)}</td>
                                    <td className="actions-cell">
                                        <button title="Editar" className="action-button edit-button" onClick={() => abrirModalParaEditar(membro)}>
                                            <Edit size={16} />
                                        </button>
                                        <button title="Excluir" className="action-button delete-button" onClick={() => abrirModalConfirmacao(membro)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="table-message">Nenhum motorista cadastrado para esta empresa.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={fecharModal} title={membroEmEdicaoId ? 'Editar Motorista' : 'Adicionar Novo Motorista'}>
                <form onSubmit={handleSalvarMembro} className="modal-form-frota">
                    <h4 className="form-subtitle"><User size={16} /> Dados Pessoais</h4>
                    <div className="form-group"><label>Nome Completo</label><input name="nomeCompleto" value={formData.nomeCompleto} onChange={handleInputChange} required /></div>
                    <div className="form-row-2-col">
                        <div className="form-group"><label>CPF</label><input name="cpf" value={formData.cpf} onChange={handleInputChange} /></div>
                        <div className="form-group"><label>RG</label><input name="rg" value={formData.rg} onChange={handleInputChange} /></div>
                    </div>
                    <div className="form-row-2-col">
                        <div className="form-group"><label>Data de Nascimento</label><input name="dataNascimento" type="date" value={formData.dataNascimento} onChange={handleInputChange} /></div>
                        <div className="form-group"><label>CNH</label><input name="cnh" value={formData.cnh} onChange={handleInputChange} required /></div>
                    </div>
                    <div className="form-group"><label>Telefone</label><input name="telefone" type="tel" value={formData.telefone} onChange={handleInputChange} required /></div>
                    
                    <h4 className="form-subtitle"><Truck size={16} /> Dados do Veículo</h4>
                    <div className="form-row-2-col">
                        <div className="form-group"><label>Modelo</label><input name="modelo" value={formData.veiculo.modelo} onChange={handleVeiculoChange} placeholder="Ex: Scania R450"/></div>
                        <div className="form-group"><label>Placa</label><input name="placa" value={formData.veiculo.placa} onChange={handleVeiculoChange} required /></div>
                    </div>

                    <h4 className="form-subtitle"><MapPin size={16} /> Endereço do Motorista</h4>
                    <div className="form-group"><label>CEP</label><input name="cep" value={formData.enderecoMotorista.cep} onChange={handleCepChange} maxLength="9" /></div>
                    <div className="form-group"><label>Rua</label><input name="rua" value={formData.enderecoMotorista.rua} onChange={handleEnderecoChange} /></div>
                    <div className="form-row-2-col">
                        <div className="form-group"><label>Número</label><input name="numero" value={formData.enderecoMotorista.numero} onChange={handleEnderecoChange} /></div>
                        <div className="form-group"><label>Bairro</label><input name="bairro" value={formData.enderecoMotorista.bairro} onChange={handleEnderecoChange} /></div>
                    </div>
                    <div className="form-row-2-col">
                        <div className="form-group"><label>Cidade</label><input name="cidade" value={formData.enderecoMotorista.cidade} onChange={handleEnderecoChange} /></div>
                        <div className="form-group"><label>Estado</label><input name="estado" value={formData.enderecoMotorista.estado} onChange={handleEnderecoChange} maxLength="2" /></div>
                    </div>

                    <h4 className="form-subtitle"><Building size={16} /> Vínculo Operacional</h4>
                    <div className="form-group">
                        <label>Loja / Unidade</label>
                        <select name="lojaId" value={formData.lojaId} onChange={handleInputChange} required>
                            <option value="" disabled>-- Selecione uma loja --</option>
                            {lojasList.map(loja => (
                                <option key={loja.id} value={loja.id}>{loja.nomeUnidade}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={fecharModal} disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" className="add-button" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : (membroEmEdicaoId ? 'Salvar Alterações' : 'Adicionar Motorista')}
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
                <p>Você tem certeza que deseja excluir o membro da frota permanentemente?</p>
                {membroParaExcluir && <p className="membro-destaque">{membroParaExcluir.nomeCompleto || membroParaExcluir.nome}</p>}
            </ConfirmationModal>
        </div>
    );
}

export default MinhaFrotaPage;