// ===================================================================
// ARQUIVO ATUALIZADO: src/pages/MinhaFrotaPage.jsx
// Versão modernizada com formulário completo, integração com lojas
// e visualização de dados em tempo real.
// ===================================================================

import React, { useState, useEffect } from 'react';
import './MinhaFrotaPage.css';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';
import { PlusCircle, Edit, Trash2, Loader2, User, Truck, MapPin, Building } from 'lucide-react';
import axios from 'axios';

// Novo estado inicial, refletindo a estrutura de dados completa
const ESTADO_INICIAL_FROTA = {
    nomeCompleto: '',
    cpf: '',
    rg: '',
    dataNascimento: '',
    cnh: '',
    telefone: '',
    veiculo: {
        modelo: '',
        placa: ''
    },
    enderecoMotorista: {
        cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: ''
    },
    lojaId: '', // Campo para vincular à loja
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

    // Efeito para buscar a frota em tempo real
    useEffect(() => {
        setIsLoading(true);
        const frotaCollectionRef = collection(db, "frota");
        const q = query(frotaCollectionRef, orderBy("nomeCompleto"));
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

    // Efeito para buscar as lojas para o formulário
    useEffect(() => {
        const lojasCollectionRef = collection(db, "lojas");
        const q = query(lojasCollectionRef, orderBy("nomeUnidade"));
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
        const cepValue = e.target.value;
        handleEnderecoChange(e);
        const cep = cepValue.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
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
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            }
        }
    };

    // Funções para controlar os modais
    const abrirModalParaAdicionar = () => {
        setFormData(ESTADO_INICIAL_FROTA);
        setMembroEmEdicaoId(null);
        setIsModalOpen(true);
    };

    const abrirModalParaEditar = (membro) => {
        // Garante que todos os campos, incluindo os aninhados, existam
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

    // Funções de CRUD (Create, Read, Update, Delete)
    const handleSalvarMembro = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (membroEmEdicaoId) {
                const membroDoc = doc(db, "frota", membroEmEdicaoId);
                await updateDoc(membroDoc, formData);
                alert("Membro da frota atualizado com sucesso!");
            } else {
                await addDoc(collection(db, "frota"), formData);
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
                            <tr><td colSpan="5" className="table-message">Nenhum motorista cadastrado.</td></tr>
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
