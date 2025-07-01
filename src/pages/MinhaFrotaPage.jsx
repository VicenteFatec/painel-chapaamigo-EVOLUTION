import React, { useState, useEffect } from 'react';
import './MinhaFrotaPage.css';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal'; // NOVO: Importando o modal de confirmação

import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from 'firebase/firestore';

import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const VALORES_INICIAIS_FORM = {
    nome: '',
    cnh: '',
    telefone: '',
    placa: '',
};

function MinhaFrotaPage() {
    const [frota, setFrota] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(VALORES_INICIAIS_FORM);
    const [membroEmEdicaoId, setMembroEmEdicaoId] = useState(null);

    // NOVO: Estados para o modal de confirmação de exclusão
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [membroParaExcluir, setMembroParaExcluir] = useState(null);


    const frotaCollectionRef = collection(db, "frota");

    const fetchFrota = async () => {
        const data = await getDocs(frotaCollectionRef);
        const frotaList = data.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));
        setFrota(frotaList);
    };

    useEffect(() => {
        fetchFrota();
    }, []);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prevState => ({ ...prevState, [id]: value }));
    };
    
    const abrirModalParaAdicionar = () => {
        setFormData(VALORES_INICIAIS_FORM);
        setMembroEmEdicaoId(null);
        setIsModalOpen(true);
    };

    const abrirModalParaEditar = (membro) => {
        setFormData({
            nome: membro.nome,
            cnh: membro.cnh,
            telefone: membro.telefone,
            placa: membro.placa,
        });
        setMembroEmEdicaoId(membro.id);
        setIsModalOpen(true);
    };

    const handleSalvarMembro = async (e) => {
        e.preventDefault();
        if (membroEmEdicaoId) {
            const membroDoc = doc(db, "frota", membroEmEdicaoId);
            await updateDoc(membroDoc, formData);
        } else {
            await addDoc(frotaCollectionRef, formData);
        }
        fetchFrota();
        setIsModalOpen(false);
    };

    // NOVO: Função para ABRIR o modal de confirmação
    const abrirModalConfirmacao = (membro) => {
        setMembroParaExcluir(membro);
        setIsConfirmModalOpen(true);
    };

    // ALTERADO: A lógica de exclusão agora é chamada pelo modal de confirmação
    const handleConfirmarExclusao = async () => {
        if (membroParaExcluir) {
            const membroDoc = doc(db, "frota", membroParaExcluir.id);
            await deleteDoc(membroDoc);
            fetchFrota();
            setIsConfirmModalOpen(false);
            setMembroParaExcluir(null);
        }
    };
    
    const fecharModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div>
            <div className="frota-header">
                <h1 className="frota-title">Minha Frota</h1>
                <button className="add-button" onClick={abrirModalParaAdicionar}>
                    <PlusCircle size={20} />
                    Adicionar Membro
                </button>
            </div>

            <div className="table-container">
                <table className="frota-table">
                    <thead>
                        <tr>
                            <th>Motorista</th>
                            <th>CNH</th>
                            <th>Telefone</th>
                            <th>Placa do Veículo</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {frota.map((membro) => (
                            <tr key={membro.id}>
                                <td>{membro.nome}</td>
                                <td>{membro.cnh}</td>
                                <td>{membro.telefone}</td>
                                <td>{membro.placa}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button title="Editar" onClick={() => abrirModalParaEditar(membro)}>
                                            <Edit size={18} color="#0056b3" />
                                        </button>
                                        {/* ALTERADO: O botão de excluir agora abre nosso novo modal */}
                                        <button title="Excluir" onClick={() => abrirModalConfirmacao(membro)}>
                                            <Trash2 size={18} color="#dc3545" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={fecharModal} title={membroEmEdicaoId ? 'Editar Membro' : 'Adicionar Novo Membro'}>
                <form onSubmit={handleSalvarMembro} className="modal-form">
                    {/* ... campos do formulário ... */}
                    <div className="input-group"> <label htmlFor="nome">Nome Completo</label> <input id="nome" type="text" value={formData.nome} onChange={handleInputChange} required /> </div>
                    <div className="input-group"> <label htmlFor="cnh">CNH</label> <input id="cnh" type="text" value={formData.cnh} onChange={handleInputChange} required /> </div>
                    <div className="input-group"> <label htmlFor="telefone">Telefone</label> <input id="telefone" type="text" value={formData.telefone} onChange={handleInputChange} required /> </div>
                    <div className="input-group"> <label htmlFor="placa">Placa do Veículo</label> <input id="placa" type="text" value={formData.placa} onChange={handleInputChange} required /> </div>
                    <div style={{ marginTop: '1rem', textAlign: 'right' }}> <button type="submit" className="add-button"> {membroEmEdicaoId ? 'Salvar Alterações' : 'Adicionar Membro'} </button> </div>
                </form>
            </Modal>
            
            {/* NOVO: Renderizando o modal de confirmação */}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmarExclusao}
                title="Confirmar Exclusão"
            >
                <p>Você tem certeza que deseja excluir o membro da frota permanentemente?</p>
                {membroParaExcluir && <p className="membro-destaque">{membroParaExcluir.nome}</p>}
            </ConfirmationModal>
        </div>
    );
}

export default MinhaFrotaPage;