// ===================================================================
// ARQUIVO FINAL: src/pages/SolicitacoesPage.jsx
// Implementado sistema de busca de trabalhadores com filtros
// inteligentes de localização (cidade, estado, país).
// ===================================================================

import React, { useState, useEffect } from 'react';
import { db, functions } from '../firebaseConfig';
import { collection, query, where, orderBy, doc, getDoc, updateDoc, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { Clock, CheckCircle, XCircle, FileText, User, Ticket, Search, X, Loader2, Hourglass, Archive, Printer, Map, MapPin } from 'lucide-react';

import FormularioNovaOS from '../components/FormularioNovaOS'; 
import Modal from '../components/Modal';
import CartaoOS from '../components/CartaoOS';
import './SolicitacoesPage.css';

function SolicitacoesPage() {
    const [solicitacoes, setSolicitacoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
    const [trabalhadoresSugeridos, setTrabalhadoresSugeridos] = useState([]);
    const [isLoadingSugeridos, setIsLoadingSugeridos] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [trabalhadorSelecionado, setTrabalhadorSelecionado] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAlocando, setIsAlocando] = useState(false);

    // NOVO: Estado para controlar o escopo do filtro de busca
    const [filtroLocal, setFiltroLocal] = useState('cidade');

    const getStatusInfo = (status) => {
        switch (status) {
            case 'pendente': return { icon: <Clock size={16} />, text: 'Pendente', color: 'text-yellow-500' };
            case 'aguardando_resposta': return { icon: <Hourglass size={16} />, text: 'Aguardando Resposta', color: 'text-cyan-500' };
            case 'confirmado': return { icon: <CheckCircle size={16} />, text: 'Chapa Confirmado', color: 'text-green-500' };
            case 'finalizado': return { icon: <CheckCircle size={16} />, text: 'Serviço Finalizado', color: 'text-blue-500' };
            case 'cancelado': return { icon: <XCircle size={16} />, text: 'Cancelado', color: 'text-red-500' };
            case 'arquivado': return { icon: <Archive size={16} />, text: 'Arquivado', color: 'text-gray-400' };
            default: return { icon: <FileText size={16} />, text: 'Status Desconhecido', color: 'text-gray-500' };
        }
    };

    const enviarConvite = httpsCallable(functions, 'enviarConviteOS');
    
    useEffect(() => {
        setIsLoading(true);
        const solicitacoesCollectionRef = collection(db, "solicitacoes");
        const statusVisiveis = ["pendente", "aguardando_resposta", "confirmado", "finalizado", "cancelado"];
        const q = query(solicitacoesCollectionRef, where("status", "in", statusVisiveis), orderBy("dataSolicitacao", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const solicitacoesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSolicitacoes(solicitacoesList);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao escutar atualizações de solicitações: ", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    // FUNÇÃO DE BUSCA ATUALIZADA COM LÓGICA DE FILTROS
    const buscarTrabalhadores = async () => {
        if (!solicitacaoSelecionada) return;

        setIsLoadingSugeridos(true);
        setTrabalhadoresSugeridos([]);
        
        try {
            const chapasCollectionRef = collection(db, "chapas_b2b");
            let q = query(chapasCollectionRef, where("status", "==", "Disponível"));

            // Aplica filtros de localização dinamicamente
            if (filtroLocal === 'cidade' && solicitacaoSelecionada.endereco?.cidade) {
                q = query(q, where("cidade", "==", solicitacaoSelecionada.endereco.cidade));
            } else if (filtroLocal === 'estado' && solicitacaoSelecionada.endereco?.estado) {
                q = query(q, where("estado", "==", solicitacaoSelecionada.endereco.estado));
            }
            // Se filtroLocal for 'pais', não adiciona cláusula de local, busca todos.

            const data = await getDocs(q);
            let chapasDisponiveis = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            // Filtro por nome é aplicado no cliente, após a busca por localização
            if (searchTerm) {
                const termo = searchTerm.toLowerCase();
                chapasDisponiveis = chapasDisponiveis.filter(chapa =>
                    chapa.nomeCompleto && chapa.nomeCompleto.toLowerCase().includes(termo)
                );
            }
            
            setTrabalhadoresSugeridos(chapasDisponiveis);
        } catch (error) {
            console.error("Erro ao buscar trabalhadores:", error);
            alert("Ocorreu um erro ao buscar trabalhadores. Verifique se os índices do Firestore foram criados.");
        } finally {
            setIsLoadingSugeridos(false);
        }
    };

    // Efeito que re-executa a busca sempre que o filtro ou o termo de busca mudam
    useEffect(() => {
        if (isDetalhesModalOpen && solicitacaoSelecionada?.status === 'pendente') {
            buscarTrabalhadores();
        }
    }, [filtroLocal, searchTerm, isDetalhesModalOpen]);


    const handleVerDetalhes = (solicitacao) => {
        setFiltroLocal('cidade'); // Reseta o filtro para o padrão ao abrir
        setSearchTerm(''); // Limpa a busca
        setSolicitacaoSelecionada(solicitacao);
        setIsDetalhesModalOpen(true);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // ... (restante das funções handleVerTicket, fecharDetalhesModal, etc. permanecem iguais)

    const fecharDetalhesModal = () => {
        setIsDetalhesModalOpen(false);
        setSolicitacaoSelecionada(null);
        setTrabalhadoresSugeridos([]);
        setSearchTerm('');
    };
    
    const fecharTicketModal = () => {
        setIsTicketModalOpen(false);
        setSolicitacaoSelecionada(null);
        setTrabalhadorSelecionado(null);
    };

    const handleAlocarChapa = async (chapa) => {
        if (!solicitacaoSelecionada || !chapa) {
            alert("Erro: Solicitação ou trabalhador não selecionado.");
            return;
        }
        setIsAlocando(true);
        const solicitacaoRef = doc(db, "solicitacoes", solicitacaoSelecionada.id);
        try {
            await updateDoc(solicitacaoRef, { status: 'aguardando_resposta' });
            
            await enviarConvite({
                chapaId: chapa.id,
                nomeChapa: chapa.nomeCompleto,
                telefoneChapa: chapa.telefone,
                idOS: solicitacaoSelecionada.id,
                solicitacaoData: solicitacaoSelecionada 
            });
            alert(`Convite via WhatsApp enviado para ${chapa.nomeCompleto}!`);
            fecharDetalhesModal();
        } catch (error) {
            console.error("Erro ao enviar convite: ", error);
            alert(`Ocorreu um erro ao tentar enviar o convite: ${error.message}`);
            await updateDoc(solicitacaoRef, { status: 'pendente' });
        } finally {
            setIsAlocando(false);
        }
    };

    const handleFinalizarServico = async (solicitacao) => {
        if (!solicitacao.chapaAlocadoId) { return; }
        if (!window.confirm(`Tem certeza que deseja finalizar este serviço e liberar o trabalhador ${solicitacao.chapaAlocadoNome}?`)) { return; }
        try {
            const batch = writeBatch(db);
            const solicitacaoRef = doc(db, "solicitacoes", solicitacao.id);
            batch.update(solicitacaoRef, {
                status: 'finalizado',
                timestampFim: new Date()
            });
            const chapaRef = doc(db, "chapas_b2b", solicitacao.chapaAlocadoId);
            batch.update(chapaRef, { status: 'Disponível' });
            await batch.commit();
        } catch (error) {
            console.error("Erro ao finalizar serviço: ", error);
        }
    };
    
    const handleArquivarServico = async (solicitacaoId) => {
        if (!window.confirm("Tem certeza que deseja arquivar este serviço?")) {
            return;
        }
        try {
            const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
            await updateDoc(solicitacaoRef, { status: 'arquivado' });
        } catch (error) {
            console.error("Erro ao arquivar serviço:", error);
            alert("Ocorreu um erro ao tentar arquivar o serviço.");
        }
    };
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            {/* Header e Tabela de Solicitações (sem alterações) */}
            <div className="solicitacoes-header">
                <div>
                    <h1 className="solicitacoes-title">Mesa de Operações</h1>
                    <p className="solicitacoes-subtitle">Visão geral de todas as solicitações de serviço dos clientes.</p>
                </div>
                <button className="new-os-button" onClick={() => setIsFormModalOpen(true)}>
                    + Criar Nova Ordem de Serviço
                </button>
            </div>
            <div className="table-container">
                <table className="solicitacoes-table">
                    <thead>
                        <tr>
                            <th>Cliente / Trabalhador</th>
                            <th>Datas</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="4" className="text-center p-8"><Loader2 size={24} className="animate-spin inline-block mr-2" /> Carregando...</td></tr>
                        ) : solicitacoes.length > 0 ? (
                            solicitacoes.map((solicitacao) => {
                                const statusInfo = getStatusInfo(solicitacao.status);
                                return (
                                    <tr key={solicitacao.id}>
                                        <td>
                                            <div className="font-semibold">{solicitacao.cliente}</div>
                                            {solicitacao.chapaAlocadoNome && (<div className="text-sm text-gray-600 mt-1"><span className="font-medium">Alocado:</span> {solicitacao.chapaAlocadoNome}</div>)}
                                        </td>
                                        <td>
                                            <div className="datas-cell">
                                                {solicitacao.dataServico?.toDate && <span><strong>Serviço:</strong> {solicitacao.dataServico.toDate().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</span>}
                                                {solicitacao.timestampFim?.toDate && <span><strong>Finalizado:</strong> {solicitacao.timestampFim.toDate().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`status-cell ${statusInfo.color}`}>{statusInfo.icon}<span>{statusInfo.text}</span></div>
                                        </td>
                                        <td>
                                            <div className="acoes-cell">
                                                {solicitacao.status === 'pendente' && (<button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Encontrar Chapa </button>)}
                                                {solicitacao.status === 'aguardando_resposta' && (<button className="view-details-button-disabled" disabled> Aguardando... </button>)}
                                                {solicitacao.status === 'confirmado' && (<> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)}> <Ticket size={16} /> Ver Ticket </button> <button className="finish-button" onClick={() => handleFinalizarServico(solicitacao)}> Finalizar </button> </>)}
                                                {solicitacao.status === 'finalizado' && ( <> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)}> <Ticket size={16} /> Ver Ticket </button> <button className="archive-button" onClick={() => handleArquivarServico(solicitacao.id)}> <Archive size={16} /> Arquivar </button> </> )}
                                                {solicitacao.status === 'cancelado' && ( <> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="archive-button" onClick={() => handleArquivarServico(solicitacao.id)}> <Archive size={16} /> Arquivar </button> </> )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="4" className="text-center p-8">Nenhuma solicitação ativa encontrada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title="Criar Nova Ordem de Serviço">
                <FormularioNovaOS onClose={() => setIsFormModalOpen(false)} />
            </Modal>

            {/* MODAL DE DETALHES ATUALIZADO COM OS FILTROS */}
            <Modal isOpen={isDetalhesModalOpen} onClose={fecharDetalhesModal} title={solicitacaoSelecionada?.status === 'pendente' ? 'Encontrar Trabalhador' : 'Detalhes do Serviço'}>
                 {solicitacaoSelecionada?.status !== 'pendente' ? (
                    <div>
                        {/* ... (código de detalhes do serviço permanece igual) ... */}
                    </div>
                ) : (
                    <div className="curadoria-container">
                        <div className="curadoria-coluna">
                            <h3>Buscar Trabalhadores</h3>
                            {/* NOVA SEÇÃO DE FILTROS */}
                            <div className="search-filters">
                                <label className="filter-label"><MapPin size={14}/> Filtrar por:</label>
                                <div className="filter-options">
                                    <button onClick={() => setFiltroLocal('cidade')} className={filtroLocal === 'cidade' ? 'active' : ''}>Mesma Cidade</button>
                                    <button onClick={() => setFiltroLocal('estado')} className={filtroLocal === 'estado' ? 'active' : ''}>Mesmo Estado</button>
                                    <button onClick={() => setFiltroLocal('pais')} className={filtroLocal === 'pais' ? 'active' : ''}>Todo Brasil</button>
                                </div>
                            </div>
                            <div className="search-container">
                                <div className="search-input-wrapper">
                                    <Search size={18} className="search-icon" />
                                    <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={handleSearchChange} />
                                </div>
                            </div>
                            {isLoadingSugeridos ? (<div className="loading-sugeridos"><Loader2 size={20} className="animate-spin" /> Carregando...</div>) : (
                                <div className="lista-sugeridos">
                                    {trabalhadoresSugeridos.length > 0 ? (
                                        trabalhadoresSugeridos.map(chapa => (
                                            <div key={chapa.id} className="sugerido-item">
                                                <div className="sugerido-info">
                                                    {chapa.fotoURL ? <img src={chapa.fotoURL} alt={chapa.nomeCompleto} className="sugerido-avatar" /> : <div className="user-avatar" style={{ width: '40px', height: '40px' }}><User size={18} /></div>}
                                                    <div>
                                                        <span className="sugerido-nome">{chapa.nomeCompleto}</span>
                                                        <span className="sugerido-regiao">{chapa.cidade}, {chapa.estado}</span>
                                                    </div>
                                                </div>
                                                <button className="alocar-btn" onClick={() => handleAlocarChapa(chapa)} disabled={isAlocando}>{isAlocando ? <Loader2 size={16} className="animate-spin" /> : 'Alocar'}</button>
                                            </div>
                                        ))
                                    ) : (<p style={{ textAlign: 'center', padding: '1rem' }}>Nenhum trabalhador encontrado para os filtros selecionados.</p>)}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isTicketModalOpen} onClose={fecharTicketModal} title="Ticket de Serviço">
                <CartaoOS solicitacao={solicitacaoSelecionada} trabalhador={trabalhadorSelecionado} />
            </Modal>
        </div>
    );
}

export default SolicitacoesPage;
