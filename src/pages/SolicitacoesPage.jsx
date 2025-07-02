import React, { useState, useEffect } from 'react';
import './SolicitacoesPage.css';
import Modal from '../components/Modal';
import CartaoOS from '../components/CartaoOS';
import { Clock, CheckCircle, XCircle, FileText, User, Eye, Ticket, Search, X, Loader2, Hourglass, Archive } from 'lucide-react';

// Firebase
import { db, functions } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy, doc, writeBatch, Timestamp, getDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";

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

const regioesSinonimos = {
    'São Paulo (Capital)': ['SP (Capital)'],
    'SP (Capital)': ['São Paulo (Capital)'],
};

function SolicitacoesPage() {
    const [solicitacoes, setSolicitacoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
    const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
    const [trabalhadoresSugeridos, setTrabalhadoresSugeridos] = useState([]);
    const [isLoadingSugeridos, setIsLoadingSugeridos] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [trabalhadorSelecionado, setTrabalhadorSelecionado] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAlocando, setIsAlocando] = useState(false);

    const enviarConvite = httpsCallable(functions, 'enviarConviteOS');

    const fetchSolicitacoes = async () => {
        setIsLoading(true);
        try {
            const solicitacoesCollectionRef = collection(db, "solicitacoes");
            const statusVisiveis = ["pendente", "aguardando_resposta", "confirmado", "finalizado", "cancelado"];
            const q = query(solicitacoesCollectionRef,
                where("status", "in", statusVisiveis),
                orderBy("dataSolicitacao", "desc")
            );
            const data = await getDocs(q);
            const solicitacoesList = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setSolicitacoes(solicitacoesList);
        } catch (error) { console.error("Erro ao buscar solicitações: ", error); }
        finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchSolicitacoes();
        const handleOsCriada = () => {
            console.log("Sinal 'os-criada' recebido! Atualizando a lista...");
            fetchSolicitacoes();
        };
        window.addEventListener('os-criada', handleOsCriada);
        return () => {
            window.removeEventListener('os-criada', handleOsCriada);
        };
    }, []);

    const buscarTrabalhadores = async (regiao = null, termoBusca = '') => {
        setIsLoadingSugeridos(true);
        setTrabalhadoresSugeridos([]);
        try {
            const chapasCollectionRef = collection(db, "chapas_b2b");
            const q = query(chapasCollectionRef, where("status", "==", "Disponível"));
            const data = await getDocs(q);
            const todosOsChapasDisponiveis = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            let chapasFiltrados = [];
            if (termoBusca) {
                const termo = termoBusca.toLowerCase();
                chapasFiltrados = todosOsChapasDisponiveis.filter(chapa =>
                    chapa.nomeCompleto.toLowerCase().includes(termo)
                );
            } else if (regiao) {
                const regioesValidas = [regiao, ...(regioesSinonimos[regiao] || [])];
                chapasFiltrados = todosOsChapasDisponiveis.filter(chapa =>
                    regioesValidas.includes(chapa.regiao?.trim())
                );
            } else {
                chapasFiltrados = todosOsChapasDisponiveis;
            }
            setTrabalhadoresSugeridos(chapasFiltrados);
        } catch (error) {
            console.error("Erro ao buscar trabalhadores:", error);
        } finally {
            setIsLoadingSugeridos(false);
        }
    };

    const handleVerDetalhes = (solicitacao) => {
        console.log('1. Botão clicado. A função handleVerDetalhes foi chamada para a OS com ID:', solicitacao.id);
        setSolicitacaoSelecionada(solicitacao);
        setIsDetalhesModalOpen(true);
        if (solicitacao.status === 'pendente') {
            buscarTrabalhadores(solicitacao.regiao);
        }
    };

    const handleSearchChange = (e) => { setSearchTerm(e.target.value); };
    const handleSearchSubmit = (e) => { e.preventDefault(); buscarTrabalhadores(null, searchTerm); };
    const clearSearch = () => {
        setSearchTerm('');
        if (solicitacaoSelecionada) {
            buscarTrabalhadores(solicitacaoSelecionada.regiao);
        }
    };
    const handleVerTicket = async (solicitacao) => {
        if (!solicitacao.chapaAlocadoId) return;
        setTrabalhadorSelecionado(null);
        console.log('Botão Ver Ticket clicado para a OS:', solicitacao.id);
        const trabalhadorRef = doc(db, "chapas_b2b", solicitacao.chapaAlocadoId);
        const trabalhadorDoc = await getDoc(trabalhadorRef);
        if (trabalhadorDoc.exists()) {
            setTrabalhadorSelecionado(trabalhadorDoc.data());
            setSolicitacaoSelecionada(solicitacao);
            setIsTicketModalOpen(true);
        } else {
            alert("Não foi possível encontrar os dados do trabalhador alocado.");
        }
    };
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
        try {
            const solicitacaoRef = doc(db, "solicitacoes", solicitacaoSelecionada.id);
            await updateDoc(solicitacaoRef, { status: 'aguardando_resposta' });
            const dadosParaEnvio = {
                chapaId: chapa.id,
                nomeChapa: chapa.nomeCompleto,
                telefoneChapa: chapa.telefone,
                idOS: solicitacaoSelecionada.id,
                nomeEmpresa: solicitacaoSelecionada.cliente,
                localServico: solicitacaoSelecionada.local,
                valorServicoBruto: solicitacaoSelecionada.valorProposto,
                tipoCarga: solicitacaoSelecionada.tipoCarga,
            };
            const resultado = await enviarConvite(dadosParaEnvio);
            alert(`Convite via WhatsApp enviado para ${chapa.nomeCompleto}!`);
            console.log("Resultado do convite:", resultado.data);
            fetchSolicitacoes();
            fecharDetalhesModal();
        } catch (error) {
            console.error("Erro ao enviar convite: ", error);
            alert(`Ocorreu um erro ao tentar enviar o convite. Verifique o console.\n\nDetalhe: ${error.message}`);
            const solicitacaoRef = doc(db, "solicitacoes", solicitacaoSelecionada.id);
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
                timestampFim: Timestamp.now()
            });
            const chapaRef = doc(db, "chapas_b2b", solicitacao.chapaAlocadoId);
            batch.update(chapaRef, { status: 'Disponível' });
            await batch.commit();
            fetchSolicitacoes();
        } catch (error) { console.error("Erro ao finalizar serviço: ", error); }
    };
    
    const handleArquivarServico = async (solicitacaoId) => {
        if (!window.confirm("Tem certeza que deseja arquivar este serviço? Ele sairá da sua mesa de operações, mas continuará no seu histórico para consultas.")) {
            return;
        }
        try {
            const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
            await updateDoc(solicitacaoRef, { status: 'arquivado' });
            fetchSolicitacoes();
        } catch (error) {
            console.error("Erro ao arquivar serviço:", error);
            alert("Ocorreu um erro ao tentar arquivar o serviço.");
        }
    };

    return (
        <div>
            <div className="solicitacoes-header">
                <h1 className="solicitacoes-title">Mesa de Operações</h1>
                <p className="solicitacoes-subtitle">Visão geral de todas as solicitações de serviço dos clientes.</p>
            </div>
            <div className="table-container">
                <table className="solicitacoes-table">
                    <thead>
                        <tr>
                            <th>Cliente / Trabalhador Alocado</th>
                            <th>Datas</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (<tr> <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Carregando solicitações...</td> </tr>) : solicitacoes.length > 0 ? (
                            solicitacoes.map((solicitacao) => {
                                const statusInfo = getStatusInfo(solicitacao.status);
                                return (
                                    <tr key={solicitacao.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{solicitacao.cliente}</div>
                                            {solicitacao.chapaAlocadoNome && (<div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}> <span style={{ fontWeight: 500 }}>Alocado:</span> {solicitacao.chapaAlocadoNome} </div>)}
                                        </td>
                                        <td>
                                            <div className="datas-cell">
                                                <span><strong>Solicitado:</strong> {solicitacao.dataSolicitacao.toDate().toLocaleDateString('pt-BR')}</span>
                                                {solicitacao.timestampFim && (<span><strong>Finalizado:</strong> {solicitacao.timestampFim.toDate().toLocaleDateString('pt-BR')}</span>)}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`status-cell ${statusInfo.color}`}> {statusInfo.icon} <span>{statusInfo.text}</span> </div>
                                        </td>
                                        <td>
                                            <div className="acoes-cell">
                                                {solicitacao.status === 'pendente' && (<button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Encontrar Chapa </button>)}
                                                {solicitacao.status === 'aguardando_resposta' && (<button className="view-details-button-disabled" disabled> Aguardando... </button>)}
                                                {solicitacao.status === 'confirmado' && (<> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)} title="Ver Ticket de Serviço"> <Ticket size={16} /> Ver Ticket </button> <button className="finish-button" onClick={() => handleFinalizarServico(solicitacao)}> Finalizar Serviço </button> </>)}
                                                {solicitacao.status === 'finalizado' && (
                                                    <>
                                                        <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button>
                                                        <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)} title="Ver Ticket de Serviço"> <Ticket size={16} /> Ver Ticket </button>
                                                        <button className="archive-button" onClick={() => handleArquivarServico(solicitacao.id)} title="Arquivar Serviço">
                                                            <Archive size={16} /> Arquivar
                                                        </button>
                                                    </>
                                                )}
                                                {solicitacao.status === 'cancelado' && (
                                                    <>
                                                        <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button>
                                                        <button className="archive-button" onClick={() => handleArquivarServico(solicitacao.id)} title="Arquivar Serviço">
                                                            <Archive size={16} /> Arquivar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (<tr> <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma solicitação ativa encontrada.</td> </tr>)}
                    </tbody>
                </table>
            </div>

            {console.log('2. Página renderizada. O modal de detalhes deveria estar aberto?', isDetalhesModalOpen)}
            
            <Modal isOpen={isDetalhesModalOpen} onClose={fecharDetalhesModal} title={solicitacaoSelecionada?.status === 'pendente' ? `Encontrar Trabalhador para: ${solicitacaoSelecionada?.cliente}` : `Resumo da Operação: ${solicitacaoSelecionada?.cliente}`}>
                <div className="curadoria-container">
                    <div className="curadoria-coluna">
                        <h3>{solicitacaoSelecionada?.status === 'pendente' ? 'Detalhes do Pedido' : 'Resumo da Operação'}</h3>
                        <div className="detalhes-solicitacao">
                            <div className="detalhe-item">
                                <strong>Cliente:</strong>
                                <p>{solicitacaoSelecionada?.cliente}</p>
                            </div>
                            <div className="detalhe-item">
                                <strong>Local:</strong>
                                <p>{solicitacaoSelecionada?.local}</p>
                            </div>
                            {solicitacaoSelecionada?.observacoes && (
                                <div className="detalhe-item">
                                    <strong>Observações:</strong>
                                    <p>{solicitacaoSelecionada?.observacoes}</p>
                                </div>
                            )}
                            {solicitacaoSelecionada?.chapaAlocadoNome && (
                                <div className="detalhe-item">
                                    <strong>Trabalhador Alocado:</strong>
                                    <p style={{ fontWeight: 'bold', color: '#16a34a' }}>{solicitacaoSelecionada?.chapaAlocadoNome}</p>
                                </div>
                            )}
                            <hr className="detalhes-divisor" />
                            <div className="detalhe-item">
                                <strong>Solicitado em:</strong>
                                <p>{solicitacaoSelecionada?.dataSolicitacao.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                            </div>
                            {solicitacaoSelecionada?.timestampInicio && (
                                <div className="detalhe-item">
                                    <strong>Início do Serviço:</strong>
                                    <p>{solicitacaoSelecionada?.timestampInicio.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                                </div>
                            )}
                            {solicitacaoSelecionada?.timestampFim && (
                                <div className="detalhe-item">
                                    <strong>Fim do Serviço:</strong>
                                    <p>{solicitacaoSelecionada?.timestampFim.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {solicitacaoSelecionada?.status === 'pendente' && (
                        <div className="curadoria-coluna">
                            <h3>Buscar Trabalhadores</h3>
                            <div className="search-container">
                                <form onSubmit={handleSearchSubmit} className="search-form">
                                    <div className="search-input-wrapper">
                                        <Search size={18} className="search-icon" />
                                        <input type="text" placeholder="Buscar por nome em toda a base..." value={searchTerm} onChange={handleSearchChange} />
                                    </div>
                                    <button type="submit">Buscar</button>
                                </form>
                                <button onClick={clearSearch} className="clear-search-button">
                                    <X size={14} /> Limpar e ver sugestões
                                </button>
                            </div>
                            {isLoadingSugeridos ? (<p style={{ textAlign: 'center', flexGrow: 1 }}>Buscando...</p>) : (
                                <div className="lista-sugeridos">
                                    {trabalhadoresSugeridos.length > 0 ? (
                                        trabalhadoresSugeridos.map(chapa => (
                                            <div key={chapa.id} className="sugerido-item">
                                                <div className="sugerido-info">
                                                    {chapa.fotoURL ? <img src={chapa.fotoURL} alt={chapa.nomeCompleto} className="sugerido-avatar" /> : <div className="user-avatar" style={{ width: '40px', height: '40px' }}><User size={18} /></div>}
                                                    <div>
                                                        <span className="sugerido-nome">{chapa.nomeCompleto}</span>
                                                        <span className="sugerido-regiao">{chapa.regiao}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    className="alocar-btn"
                                                    onClick={() => handleAlocarChapa(chapa)}
                                                    disabled={isAlocando}
                                                >
                                                    {isAlocando ? <Loader2 size={16} className="animate-spin" /> : 'Alocar'}
                                                </button>
                                            </div>
                                        ))
                                    ) : (<p style={{ textAlign: 'center', padding: '1rem' }}>Nenhum trabalhador encontrado.</p>)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Modal>

            <Modal isOpen={isTicketModalOpen} onClose={fecharTicketModal} title="Ticket de Serviço">
                <CartaoOS solicitacao={solicitacaoSelecionada} trabalhador={trabalhadorSelecionado} />
            </Modal>
        </div>
    );
}

export default SolicitacoesPage;