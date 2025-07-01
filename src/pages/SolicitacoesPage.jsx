import React, { useState, useEffect } from 'react';
import './SolicitacoesPage.css';
import Modal from '../components/Modal';
import CartaoOS from '../components/CartaoOS'; 
import { Clock, CheckCircle, XCircle, FileText, User, Eye, Ticket, Search, X } from 'lucide-react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy, doc, writeBatch, Timestamp, getDoc } from 'firebase/firestore';

const getStatusInfo = (status) => {
    switch (status) {
        case 'pendente': return { icon: <Clock size={16} />, text: 'Pendente', color: 'text-yellow-500' };
        case 'confirmado': return { icon: <CheckCircle size={16} />, text: 'Chapa Confirmado', color: 'text-green-500' };
        case 'finalizado': return { icon: <CheckCircle size={16} />, text: 'Serviço Finalizado', color: 'text-blue-500' };
        case 'cancelado': return { icon: <XCircle size={16} />, text: 'Cancelado', color: 'text-red-500' };
        default: return { icon: <FileText size={16} />, text: 'Status Desconhecido', color: 'text-gray-500' };
    }
};

// O nosso "Tradutor" inteligente de regiões
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

    const fetchSolicitacoes = async () => {
        setIsLoading(true);
        try {
            const solicitacoesCollectionRef = collection(db, "solicitacoes");
            const q = query(solicitacoesCollectionRef, orderBy("dataSolicitacao", "desc"));
            const data = await getDocs(q);
            const solicitacoesList = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setSolicitacoes(solicitacoesList);
        } catch (error) { console.error("Erro ao buscar solicitações: ", error); } 
        finally { setIsLoading(false); }
    };

    useEffect(() => { fetchSolicitacoes(); }, []);

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
        if (!solicitacaoSelecionada || !chapa) { return; }
        try {
            const batch = writeBatch(db);
            const solicitacaoRef = doc(db, "solicitacoes", solicitacaoSelecionada.id);
            batch.update(solicitacaoRef, { 
                status: 'confirmado', 
                chapaAlocadoId: chapa.id, 
                chapaAlocadoNome: chapa.nomeCompleto,
                timestampInicio: Timestamp.now()
            });
            const chapaRef = doc(db, "chapas_b2b", chapa.id);
            batch.update(chapaRef, { status: 'Em Serviço' });
            await batch.commit();
            fecharDetalhesModal();
            fetchSolicitacoes();
        } catch (error) { console.error("Erro ao alocar trabalhador: ", error); }
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

    let tableContent;
    if (isLoading) {
        tableContent = ( <tr> <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Carregando solicitações...</td> </tr> );
    } else if (solicitacoes.length > 0) {
        tableContent = solicitacoes.map((solicitacao) => {
            const statusInfo = getStatusInfo(solicitacao.status);
            return (
                <tr key={solicitacao.id}>
                    <td>
                        <div style={{fontWeight: 600}}>{solicitacao.cliente}</div>
                        {solicitacao.chapaAlocadoNome && ( <div style={{fontSize: '0.8rem', color: '#6b7280', marginTop: '4px'}}> <span style={{fontWeight: 500}}>Alocado:</span> {solicitacao.chapaAlocadoNome} </div> )}
                    </td>
                    <td>
                        <div className="datas-cell">
                            <span><strong>Solicitado:</strong> {solicitacao.dataSolicitacao.toDate().toLocaleDateString('pt-BR')}</span>
                            {solicitacao.timestampFim && ( <span><strong>Finalizado:</strong> {solicitacao.timestampFim.toDate().toLocaleDateString('pt-BR')}</span> )}
                        </div>
                    </td>
                    <td>
                        <div className={`status-cell ${statusInfo.color}`}> {statusInfo.icon} <span>{statusInfo.text}</span> </div>
                    </td>
                    <td>
                        <div className="acoes-cell">
                            {solicitacao.status === 'pendente' && ( <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Encontrar Chapa </button> )}
                            {solicitacao.status === 'confirmado' && ( <> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)} title="Ver Ticket de Serviço"> <Ticket size={16}/> Ver Ticket </button> <button className="finish-button" onClick={() => handleFinalizarServico(solicitacao)}> Finalizar Serviço </button> </> )}
                            {solicitacao.status === 'finalizado' && ( <> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)} title="Ver Ticket de Serviço"> <Ticket size={16}/> Ver Ticket </button> </> )}
                            {solicitacao.status === 'cancelado' && ( <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> )}
                        </div>
                    </td>
                </tr>
            );
        });
    } else {
        tableContent = ( <tr> <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma solicitação encontrada.</td> </tr> );
    }
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
                    <tbody>{tableContent}</tbody>
                </table>
            </div>

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
                                   <p style={{fontWeight: 'bold', color: '#16a34a'}}>{solicitacaoSelecionada?.chapaAlocadoNome}</p>
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

                            {isLoadingSugeridos ? ( <p style={{textAlign: 'center', flexGrow: 1}}>Buscando...</p> ) : (
                                <div className="lista-sugeridos">
                                    {trabalhadoresSugeridos.length > 0 ? (
                                        trabalhadoresSugeridos.map(chapa => (
                                            <div key={chapa.id} className="sugerido-item">
                                                <div className="sugerido-info">
                                                    {chapa.fotoURL ? <img src={chapa.fotoURL} alt={chapa.nomeCompleto} className="sugerido-avatar" /> : <div className="user-avatar" style={{width: '40px', height: '40px'}}><User size={18} /></div> }
                                                    <div>
                                                        <span className="sugerido-nome">{chapa.nomeCompleto}</span>
                                                        <span className="sugerido-regiao">{chapa.regiao}</span>
                                                    </div>
                                                </div>
                                                <button className="alocar-btn" onClick={() => handleAlocarChapa(chapa)}>Alocar</button>
                                            </div>
                                        ))
                                    ) : ( <p style={{textAlign: 'center', padding: '1rem'}}>Nenhum trabalhador encontrado.</p> )}
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