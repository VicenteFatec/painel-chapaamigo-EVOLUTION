// Conteúdo para o novo arquivo: src/pages/HistoricoPage.jsx
import React, { useState, useEffect } from 'react';
import './HistoricoPage.css'; // Criaremos este arquivo de estilo em breve
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

function HistoricoPage() {
    const [abaAtiva, setAbaAtiva] = useState('arquivados');
    const [servicosArquivados, setServicosArquivados] = useState([]);
    const [convitesRecusados, setConvitesRecusados] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Lógica para buscar os dados virá aqui dentro de um useEffect

    const renderConteudo = () => {
        if (isLoading) {
            return <p>Carregando dados da Central de Inteligência...</p>;
        }

        if (abaAtiva === 'arquivados') {
            return (
                <div>
                    <h2>Histórico de Serviços Finalizados</h2>
                    {/* Aqui vamos mapear e renderizar a lista de servicosArquivados */}
                    {servicosArquivados.length === 0 && <p>Nenhum serviço arquivado encontrado.</p>}
                </div>
            );
        }

        if (abaAtiva === 'recusados') {
            return (
                <div>
                    <h2>Relatório de Convites Recusados</h2>
                    {/* Aqui vamos mapear e renderizar a lista de convitesRecusados */}
                    {convitesRecusados.length === 0 && <p>Nenhum convite recusado registrado.</p>}
                </div>
            );
        }
    };

    return (
        <div className="historico-container">
            <div className="gestao-header">
                <h1 className="gestao-title">Central de Inteligência</h1>
                <p className="gestao-subtitle">Analise o histórico de operações e os motivos de recusa de convites.</p>
            </div>

            <div className="abas-container">
                <button
                    className={`aba-button ${abaAtiva === 'arquivados' ? 'active' : ''}`}
                    onClick={() => setAbaAtiva('arquivados')}
                >
                    Serviços Arquivados
                </button>
                <button
                    className={`aba-button ${abaAtiva === 'recusados' ? 'active' : ''}`}
                    onClick={() => setAbaAtiva('recusados')}
                >
                    Convites Recusados
                </button>
            </div>

            <div className="conteudo-abas">
                {renderConteudo()}
            </div>
        </div>
    );
}

export default HistoricoPage;