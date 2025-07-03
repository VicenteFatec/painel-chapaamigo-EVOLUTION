// ARQUIVO COMPLETO: A VERSÃO CORRIGIDA E BEM ESTRUTURADA de src/pages/SolicitacoesPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import './SolicitacoesPage.css';
import Modal from '../components/Modal';
import CartaoOS from '../components/CartaoOS';
import { Clock, CheckCircle, XCircle, FileText, User, Ticket, Search, X, Loader2, Hourglass, Archive, Printer } from 'lucide-react';
import { db, functions } from '../firebaseConfig';
import { collection, query, where, orderBy, doc, Timestamp, getDoc, updateDoc, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
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
    
    useEffect(() => {
        setIsLoading(true);
        const solicitacoesCollectionRef = collection(db, "solicitacoes");
        const statusVisiveis = ["pendente", "aguardando_resposta", "confirmado", "finalizado", "cancelado"];
        const q = query(solicitacoesCollectionRef, where("status", "in", statusVisiveis), orderBy("dataSolicitacao", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const solicitacoesList = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setSolicitacoes(solicitacoesList);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao escutar atualizações de solicitações: ", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
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
        setSolicitacaoSelecionada(solicitacao);
        setIsDetalhesModalOpen(true);
        if (solicitacao.status === 'pendente') {
            buscarTrabalhadores(solicitacao.regiao);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        buscarTrabalhadores(null, searchTerm);
    };

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
                localServico: `${solicitacaoSelecionada.endereco.logradouro}, ${solicitacaoSelecionada.endereco.numero}`,
                valorServicoBruto: solicitacaoSelecionada.valorServicoBruto,
                tipoCarga: solicitacaoSelecionada.descricaoServico,
            };
            await enviarConvite(dadosParaEnvio);
            alert(`Convite via WhatsApp enviado para ${chapa.nomeCompleto}!`);
            fecharDetalhesModal();
        } catch (error) {
            console.error("Erro ao enviar convite: ", error);
            alert(`Ocorreu um erro ao tentar enviar o convite: ${error.message}`);
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
            <div className="solicitacoes-header">
                <h1 className="solicitacoes-title">Mesa de Operações</h1>
                <p className="solicitacoes-subtitle">Visão geral de todas as solicitações de serviço dos clientes.</p>
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
                        {isLoading ? (<tr> <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}> <Loader2 size={24} className="animate-spin inline-block mr-2" /> Carregando...</td> </tr>) : solicitacoes.length > 0 ? (
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
                                                {solicitacao.status === 'confirmado' && (<> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)}> <Ticket size={16} /> Ver Ticket </button> <button className="finish-button" onClick={() => handleFinalizarServico(solicitacao)}> Finalizar </button> </>)}
                                                {solicitacao.status === 'finalizado' && ( <> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)}> <Ticket size={16} /> Ver Ticket </button> <button className="archive-button" onClick={() => handleArquivarServico(solicitacao.id)}> <Archive size={16} /> Arquivar </button> </> )}
                                                {solicitacao.status === 'cancelado' && ( <> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="archive-button" onClick={() => handleArquivarServico(solicitacao.id)}> <Archive size={16} /> Arquivar </button> </> )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (<tr> <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Nenhuma solicitação ativa encontrada.</td> </tr>)}
                    </tbody>
                </table>
            </div>
            
            <Modal isOpen={isDetalhesModalOpen} onClose={fecharDetalhesModal} title={solicitacaoSelecionada?.status === 'pendente' ? 'Encontrar Trabalhador' : ''} hideHeader={solicitacaoSelecionada?.status !== 'pendente'}>
                {solicitacaoSelecionada?.status !== 'pendente' ? (
                    <div>
                        <div className="printable-area documento-gala-container">
                            <header className="gala-header">
                                <img src="/images/logochapa.svg" alt="Chapa Amigo Empresas" className="gala-logo" />
                                <div className="gala-title">
                                    <h2>Documento de Serviço</h2>
                                    <p>OS #{solicitacaoSelecionada?.id.substring(0, 8).toUpperCase()}</p>
                                </div>
                            </header>
                            <section className="gala-section">
                                <h3 className="gala-section-title">Detalhes da Operação</h3>
                                <div className="gala-item"><span className="gala-label">Cliente:</span><span className="gala-dado">{solicitacaoSelecionada?.cliente}</span></div>
                                <div className="gala-item"><span className="gala-label">Local:</span><span className="gala-dado">{`${solicitacaoSelecionada?.endereco?.logradouro}, ${solicitacaoSelecionada?.endereco?.numero} - ${solicitacaoSelecionada?.endereco?.bairro}, ${solicitacaoSelecionada?.endereco?.cidade}-${solicitacaoSelecionada?.endereco?.estado}`}</span></div>
                                {solicitacaoSelecionada?.chapaAlocadoNome && (<div className="gala-item"><span className="gala-label">Trabalhador:</span><span className="gala-dado alocado">{solicitacaoSelecionada?.chapaAlocadoNome}</span></div>)}
                            </section>
                            <section className="gala-section">
                                <h3 className="gala-section-title">Escopo do Serviço</h3>
                                <div className="gala-item"><span className="gala-label">Descrição:</span><span className="gala-dado descricao">{solicitacaoSelecionada?.descricaoServico}</span></div>
                                {solicitacaoSelecionada?.requisitos && (<div className="gala-item"><span className="gala-label">Requisitos:</span><span className="gala-dado">{solicitacaoSelecionada?.requisitos}</span></div>)}
                                {solicitacaoSelecionada?.advertencias && (<div className="gala-item"><span className="gala-label">Advertências:</span><span className="gala-dado">{solicitacaoSelecionada?.advertencias}</span></div>)}
                            </section>
                            <section className="gala-section">
                                <h3 className="gala-section-title">Informações Financeiras e Temporais</h3>
                                <div className="gala-item"><span className="gala-label">Valor Ofertado:</span><span className="gala-dado">R$ {solicitacaoSelecionada?.valorServicoBruto?.toFixed(2).replace('.', ',')}</span></div>
                                <div className="gala-item"><span className="gala-label">Pagamento:</span><span className="gala-dado">{solicitacaoSelecionada?.formaPagamento}</span></div>
                                <div className="gala-item"><span className="gala-label">Solicitado em:</span><span className="gala-dado">{solicitacaoSelecionada?.dataSolicitacao.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                                {solicitacaoSelecionada?.timestampFim && (<div className="gala-item"><span className="gala-label">Fim do Serviço:</span><span className="gala-dado">{solicitacaoSelecionada?.timestampFim.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div>)}
                            </section>
                            <footer className="gala-footer">Documento gerado por Chapa Amigo Empresas</footer>
                        </div>
                        <div className="modal-footer-actions" style={{justifyContent: 'flex-end', paddingTop: '1rem'}}>
                            <button onClick={handlePrint} className="print-button"><Printer size={16} /> Imprimir / Salvar PDF</button>
                        </div>
                    </div>
                ) : (
                    <div className="curadoria-container">
                        <div className="curadoria-coluna">
                            <h3>Buscar Trabalhadores</h3>
                            <div className="search-container">
                                <form onSubmit={handleSearchSubmit} className="search-form"><div className="search-input-wrapper"><Search size={18} className="search-icon" /><input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={handleSearchChange} /></div><button type="submit">Buscar</button></form>
                                <button onClick={clearSearch} className="clear-search-button"><X size={14} /> Limpar e ver sugestões</button>
                            </div>
                            {isLoadingSugeridos ? (<p style={{ textAlign: 'center', flexGrow: 1 }}>Buscando...</p>) : (
                                <div className="lista-sugeridos">
                                    {trabalhadoresSugeridos.length > 0 ? (
                                        trabalhadoresSugeridos.map(chapa => (
                                            <div key={chapa.id} className="sugerido-item">
                                                <div className="sugerido-info">{chapa.fotoURL ? <img src={chapa.fotoURL} alt={chapa.nomeCompleto} className="sugerido-avatar" /> : <div className="user-avatar" style={{ width: '40px', height: '40px' }}><User size={18} /></div>}<div><span className="sugerido-nome">{chapa.nomeCompleto}</span><span className="sugerido-regiao">{chapa.regiao}</span></div></div>
                                                <button className="alocar-btn" onClick={() => handleAlocarChapa(chapa)} disabled={isAlocando}>{isAlocando ? <Loader2 size={16} className="animate-spin" /> : 'Alocar'}</button>
                                            </div>
                                        ))
                                    ) : (<p style={{ textAlign: 'center', padding: '1rem' }}>Nenhum trabalhador encontrado.</p>)}
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