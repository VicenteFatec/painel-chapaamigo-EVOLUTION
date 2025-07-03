import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Importa a configuração do Firestore
import { Loader2 } from 'lucide-react'; // Reutilizando seu ícone de loading

const ConvitePage = () => {
  // O hook useParams pega os parâmetros da URL, no nosso caso o :osId
  const { osId } = useParams(); 
  
  const [osData, setOsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Função para buscar os dados da OS no Firestore
    const fetchOsData = async () => {
      if (!osId) return; // Se não houver ID, não faz nada
      
      try {
        setIsLoading(true);
        const osDocRef = doc(db, 'solicitacoes', osId); // Referência ao documento
        const osDocSnap = await getDoc(osDocRef); // Busca o documento

        if (osDocSnap.exists()) {
          // Se o documento existe, guardamos os dados no estado
          setOsData(osDocSnap.data());
        } else {
          // Se não existe, definimos um erro
          setError('Convite não encontrado ou inválido.');
        }
      } catch (err) {
        console.error("Erro ao buscar convite:", err);
        setError('Ocorreu um erro ao carregar as informações.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOsData();
  }, [osId]); // O hook executa sempre que o osId da URL mudar

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <Loader2 size={48} className="animate-spin" />
        <p>Carregando informações do serviço...</p>
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: '50px' }}>{error}</div>;
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>Convite de Serviço</h1>
      {osData && (
        <div>
          <h2>{osData.cliente}</h2>
          <p><strong>Descrição:</strong> {osData.descricaoServico}</p>
          <p><strong>Valor:</strong> R$ {osData.valorServicoBruto}</p>
          <p><strong>Período:</strong> {osData.periodo}</p>
          
          <hr />

          <h3>Endereço do Serviço:</h3>
          {/* Acessando os campos aninhados do endereço corretamente */}
          <p>{osData.endereco.logradouro}, {osData.endereco.numero}</p>
          <p>{osData.endereco.bairro}, {osData.endereco.cidade} - {osData.endereco.estado}</p>
          <p>CEP: {osData.endereco.cep}</p>
          <p>Complemento: {osData.endereco.complemento}</p>

          <hr />

          <p><strong>Requisitos:</strong> {osData.requisitos}</p>
          <p><strong>Advertências:</strong> {osData.advertencias}</p>

          {/* Aqui adicionaremos os botões de Aceitar/Rejeitar */}
          <div style={{ marginTop: '30px' }}>
            <button style={{ padding: '10px 20px', backgroundColor: 'green', color: 'white', border: 'none', marginRight: '10px' }}>
              ACEITAR
            </button>
            <button style={{ padding: '10px 20px', backgroundColor: 'red', color: 'white', border: 'none' }}>
              REJEITAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConvitePage;