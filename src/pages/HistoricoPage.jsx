import React, { useState, useEffect, useCallback } from 'react';
import './HistoricoPage.css';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Loader2, Archive, XCircle, FileText, Printer } from 'lucide-react';

import Modal from '../components/Modal';
import CartaoOS from '../components/CartaoOS';

// O import do CSS como 'raw' foi REMOVIDO daqui.

const HistoricoItem = ({ item, onVerDetalhes, onImprimir }) => (
    <tr>
        {/* ... (código do item da tabela, sem alterações) ... */}
        <td>
            <div className="cliente-info">
                <span className="cliente-nome">{item.cliente}</span>
                <span className="cliente-os-id">ID: {item.id}</span>
            </div>
        </td>
        <td>
            <div className="alocado-info">{item.chapaAlocadoNome || 'N/A'}</div>
        </td>
        <td>
            <div className="valor-info">R$ {item.valorServicoBruto ? item.valorServicoBruto.toFixed(2).replace('.', ',') : '0,00'}</div>
        </td>
        <td>
            <div className="data-info">{item.timestampFim ? item.timestampFim.toDate().toLocaleDateString('pt-BR') : 'Data Indisponível'}</div>
        </td>
        <td>
            <div className={`status-info status-${item.status}`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</div>
        </td>
        <td>
            <div className="acoes-historico">
                <button onClick={() => onVerDetalhes(item)} className="acao-btn ver-btn"><FileText size={16} /> Ver</button>
                <button onClick={() => onImprimir(item)} className="acao-btn imprimir-btn"><Printer size={16} /> Imprimir</button>
            </div>
        </td>
    </tr>
);

function HistoricoPage() {
    const [abaAtiva, setAbaAtiva] = useState('arquivados');
    const [servicosArquivados, setServicosArquivados] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
    const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);

    // fetchData e useEffect permanecem os mesmos...
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (abaAtiva === 'arquivados') {
                const solicitacoesRef = collection(db, "solicitacoes");
                const q = query(solicitacoesRef, where("status", "in", ["finalizado", "arquivado"]), orderBy("timestampFim", "desc"));
                const querySnapshot = await getDocs(q);
                const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setServicosArquivados(data);
            }
        } catch (error) {
            console.error("Erro ao buscar histórico! Verifique os índices do Firestore:", error);
        } finally {
            setIsLoading(false);
        }
    }, [abaAtiva]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleVerDetalhes = (solicitacao) => {
        setSolicitacaoSelecionada(solicitacao);
        setIsDetalhesModalOpen(true);
    };

    const fecharModal = () => {
        setIsDetalhesModalOpen(false);
        setSolicitacaoSelecionada(null);
    };
    
    // ===== A SOLUÇÃO FINAL - SEM MÁGICA, SÓ ENGENHARIA =====
    const handleImprimirDefinitivo = async (solicitacao) => {
        // Primeiro, buscamos o conteúdo do nosso CSS que está na pasta 'public'
        let cssContent = '';
        try {
            const response = await fetch('/CartaoOS.css'); // Busca o arquivo da pasta public
            if (response.ok) {
                cssContent = await response.text();
            } else {
                throw new Error('Falha ao carregar CSS de impressão.');
            }
        } catch (error) {
            console.error(error);
            alert('Não foi possível carregar os estilos para impressão. A impressão pode não sair como esperado.');
        }

        // Agora, o resto da lógica para renderizar o cartão e o iframe
        setSolicitacaoSelecionada(solicitacao);
        setIsDetalhesModalOpen(true);
    
        setTimeout(() => {
            const printContents = document.getElementById('cartao-os-para-exportar')?.outerHTML;
            if (!printContents) {
                fecharModal();
                return;
            }
    
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
    
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <html>
                    <head>
                        <title>Imprimir Ticket</title>
                        <style>
                            /* Injetamos os estilos que buscamos via fetch */
                            ${cssContent}
                            /* E adicionamos os controles de impressão aqui, com segurança */
                            @media print {
                                @page { size: A4; margin: 10mm; }
                                body { margin: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        ${printContents}
                    </body>
                </html>
            `);
            doc.close();
    
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            document.body.removeChild(iframe);
    
            fecharModal();
        }, 200);
    };

    // ... o resto do componente (renderConteudo, return) permanece igual
    const renderConteudo = () => {
        if (isLoading) {
            return (<div className="loading-container"><Loader2 className="animate-spin" size={32} /><p>Carregando dados...</p></div>);
        }
        if (abaAtiva === 'arquivados') {
            return (
                <div className="table-wrapper">
                    <table className="historico-table">
                         <thead>
                            <tr>
                                <th>Cliente / OS</th>
                                <th>Trabalhador</th>
                                <th>Valor Bruto</th>
                                <th>Finalização</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {servicosArquivados.length > 0 ? (
                                servicosArquivados.map(item => <HistoricoItem key={item.id} item={item} onVerDetalhes={handleVerDetalhes} onImprimir={handleImprimirDefinitivo} />)
                            ) : (
                                <tr><td colSpan="6" className="no-results">Nenhum serviço finalizado ou arquivado encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="historico-container">
            <div className="gestao-header">
                <h1 className="gestao-title">Central de Inteligência</h1>
                <p className="gestao-subtitle">Analise o histórico de operações e os motivos de recusa de convites.</p>
            </div>
            <div className="abas-container">
                <button className={`aba-button ${abaAtiva === 'arquivados' ? 'active' : ''}`} onClick={() => setAbaAtiva('arquivados')}><Archive size={16} /><span>Serviços Concluídos</span></button>
                <button className={`aba-button ${abaAtiva === 'recusados' ? 'active' : ''}`} onClick={() => setAbaAtiva('recusados')}><XCircle size={16} /><span>Convites Recusados</span></button>
            </div>
            <div className="conteudo-abas">{renderConteudo()}</div>

            <Modal isOpen={isDetalhesModalOpen} onClose={fecharModal} title="Detalhes do Serviço">
                {solicitacaoSelecionada && <CartaoOS solicitacao={solicitacaoSelecionada} />}
            </Modal>
        </div>
    );
}

export default HistoricoPage;