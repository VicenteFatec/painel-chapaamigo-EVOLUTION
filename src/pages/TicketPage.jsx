import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Nosso acesso ao Firestore
import QRCode from 'react-qr-code'; // Biblioteca para gerar o QR Code
import './TicketPage.css'; // Nosso novo arquivo de estilo

function TicketPage() {
  const { osId } = useParams(); // Pega o ID da OS da URL (ex: /ticket/OS-5UFIIM)
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!osId) {
        setError('ID do Ticket não fornecido.');
        setLoading(false);
        return;
      }
      try {
        const ticketDocRef = doc(db, 'solicitacoes', osId);
        const ticketDoc = await getDoc(ticketDocRef);

        if (ticketDoc.exists()) {
          setTicketData(ticketDoc.data());
        } else {
          setError('Ticket de Serviço não encontrado.');
        }
      } catch (err) {
        console.error("Erro ao buscar ticket:", err);
        setError('Ocorreu um erro ao carregar os dados do ticket.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [osId]);

  if (loading) {
    return <div className="ticket-page-container"><p>Carregando Ticket...</p></div>;
  }

  if (error) {
    return <div className="ticket-page-container"><p className="error-message">{error}</p></div>;
  }
  
  // Formata o endereço para exibição
  const formatarEndereco = (endereco) => {
    if (!endereco) return "Não informado";
    return `${endereco.logradouro || ''}, ${endereco.numero || ''} - ${endereco.bairro || ''}, ${endereco.cidade || ''} / ${endereco.estado || ''}`;
  }

  return (
    <div className="ticket-page-container">
      <div className="ticket-modal">
        <header className="ticket-header">
          <h2>TICKET DE SERVIÇO</h2>
          <span className="ticket-id">#{osId}</span>
        </header>

        <section className="ticket-section">
          <p className="ticket-label">SOLICITADO POR</p>
          <p className="ticket-value-large">{ticketData?.cliente}</p>
        </section>

        <section className="ticket-section worker-section">
            <div className='worker-info'>
                <p className="ticket-label">TRABALHADOR</p>
                <p className="ticket-value-large">{ticketData?.chapa?.nome}</p>
                <p className="ticket-value-small">
                    CPF: {ticketData?.chapa?.cpf || 'Não informado'} | RG: {ticketData?.chapa?.rg || 'Não informado'}
                </p>
            </div>
        </section>

        <section className="ticket-section">
            <p className="ticket-label">DETALHES DA OPERAÇÃO</p>
            <div className='details-grid'>
                <p className="ticket-label-small">LOCAL DE APRESENTAÇÃO</p>
                <p className="ticket-value">{formatarEndereco(ticketData?.endereco)}</p>
                
                <p className="ticket-label-small">DESCRIÇÃO DO SERVIÇO</p>
                <p className="ticket-value">{ticketData?.descricaoServico}</p>
                
                <p className="ticket-label-small">REQUISITOS E EQUIPAMENTOS (EPIS)</p>
                <p className="ticket-value">{ticketData?.requisitos || 'Nenhum requisito específico'}</p>
            </div>
        </section>

        <footer className="ticket-footer">
            <div className="qr-code-container">
               <QRCode value={window.location.href} size={80} />
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