import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import QRCode from 'react-qr-code';
import './TicketPage.css';
import { Loader2, AlertTriangle } from 'lucide-react';

function TicketPage() {
  const { osId } = useParams();
  const [osData, setOsData] = useState(null);
  const [chapaData, setChapaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!osId) {
        setError('ID do Ticket não fornecido na URL.');
        setLoading(false);
        return;
      }
      try {
        const osDocRef = doc(db, 'solicitacoes', osId);
        const osDoc = await getDoc(osDocRef);

        if (!osDoc.exists()) {
          setError('Ticket de Serviço não encontrado. Verifique o ID.');
          setLoading(false);
          return;
        }
        
        const data = osDoc.data();
        setOsData(data);

        if (data.chapaAlocadoId) {
          const chapaDocRef = doc(db, 'chapas_b2b', data.chapaAlocadoId);
          const chapaDoc = await getDoc(chapaDocRef);

          if (chapaDoc.exists()) {
            setChapaData(chapaDoc.data());
          } else {
            setChapaData({ nome: data.chapaAlocadoNome || 'Nome não encontrado' });
          }
        } else {
            setError('Nenhum trabalhador foi alocado para este serviço ainda.');
        }

      } catch (err) {
        console.error("Erro detalhado ao buscar ticket:", err);
        setError('Ocorreu um erro inesperado ao carregar os dados do ticket.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [osId]);

  if (loading) {
    return (
      <div className="ticket-page-container" style={{ textAlign: 'center' }}>
        <Loader2 className="animate-spin" size={48} color="#2c3e50" />
        <p style={{ marginTop: '1rem', color: '#2c3e50', fontWeight: 500 }}>Carregando Ticket...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ticket-page-container" style={{ textAlign: 'center' }}>
        <AlertTriangle size={48} color="#d32f2f" />
        <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>
      </div>
    );
  }

  const formatarEndereco = (endereco) => {
    if (!endereco) return "Não informado";
    return `${endereco.logradouro || ''}, ${endereco.numero || ''} - ${endereco.bairro || ''}, ${endereco.cidade || ''} / ${endereco.estado || ''}`;
  };

  const formatarData = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Data não informada';
    return timestamp.toDate().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="ticket-page-container">
      <div className="ticket-modal">
        <header className="ticket-header">
          <h2>TICKET DE SERVIÇO</h2>
          <span className="ticket-id">#{osId}</span>
        </header>

        <section className="ticket-section">
          <p className="ticket-label">SOLICITADO POR</p>
          <p className="ticket-value-large">{osData?.cliente}</p>
        </section>

        <section className="ticket-section">
            <div>
                <p className="ticket-label">TRABALHADOR ALOCADO</p>
                <p className="ticket-value-large">{chapaData?.nome}</p>
                <p className="ticket-value-small">
                    CPF: {chapaData?.cpf || 'Não informado'}
                </p>
            </div>
        </section>
        
        <section className="ticket-section">
            <p className="ticket-label">DATA E HORA DO SERVIÇO</p>
            <p className="ticket-value">{formatarData(osData?.dataSolicitacao)}</p>
        </section>

        <section className="ticket-section">
            <div className='details-grid'>
                <p className="ticket-label-small">LOCAL DE APRESENTAÇÃO</p>
                <p className="ticket-value">{formatarEndereco(osData?.endereco)}</p>
                
                <p className="ticket-label-small">DESCRIÇÃO DO SERVIÇO</p>
                <p className="ticket-value">{osData?.descricaoServico}</p>
                
                <p className="ticket-label-small">REQUISITOS E ADVERTÊNCIAS</p>
                <p className="ticket-value">{osData?.requisitos || 'Nenhum requisito específico'}</p>
            </div>
        </section>

        <footer className="ticket-footer">
            <div className="qr-code-container">
               <QRCode value={window.location.href} size={80} bgColor="#FFFFFF" fgColor="#000000" />
            </div>
            <div className="footer-text">
                <p>Operação gerenciada pela</p>
                <strong>Plataforma Chapa Amigo</strong>
            </div>
        </footer>
      </div>
    </div>
  );
}

export default TicketPage;
