import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig'; // Atenção ao caminho, pode precisar de ajuste
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import './ParametrosPage.css'; // Criaremos este arquivo em breve

const ParametrosPage = () => {
  // Estados para armazenar os preços dos planos
  const [precoProfissional, setPrecoProfissional] = useState('');
  const [precoCorporativo, setPrecoCorporativo] = useState('');
  
  // Estados de controle
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  // Efeito para buscar os dados iniciais ao carregar o componente
  useEffect(() => {
    const fetchPrecos = async () => {
      setIsLoading(true);
      const precosDocRef = doc(db, 'configuracoes', 'precosPlanos');
      const docSnap = await getDoc(precosDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setPrecoProfissional(data.precoProfissional.toString());
        setPrecoCorporativo(data.precoCorporativo.toString());
      } else {
        setFeedback({ message: 'Documento de configuração não encontrado!', type: 'error' });
      }
      setIsLoading(false);
    };

    fetchPrecos();
  }, []);

  // Função para salvar as alterações
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback({ message: '', type: '' });

    const precosDocRef = doc(db, 'configuracoes', 'precosPlanos');
    const novoPrecoProfissional = parseFloat(precoProfissional);
    const novoPrecoCorporativo = parseFloat(precoCorporativo);

    if (isNaN(novoPrecoProfissional) || isNaN(novoPrecoCorporativo)) {
        setFeedback({ message: 'Por favor, insira valores numéricos válidos.', type: 'error' });
        setIsSaving(false);
        return;
    }

    try {
      await updateDoc(precosDocRef, {
        precoProfissional: novoPrecoProfissional,
        precoCorporativo: novoPrecoCorporativo,
      });
      setFeedback({ message: 'Preços atualizados com sucesso!', type: 'success' });
    } catch (error) {
      console.error("Erro ao atualizar os preços: ", error);
      setFeedback({ message: 'Erro ao salvar. Tente novamente.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Carregando parâmetros...</div>;
  }

  return (
    <div className="parametros-container">
      <h1>Parâmetros da Plataforma</h1>
      <form className="parametros-form" onSubmit={handleSave}>
        <h2>Preços dos Planos</h2>
        <div className="form-group">
          <label htmlFor="preco-profissional">Plano Profissional (R$)</label>
          <input
            id="preco-profissional"
            type="number"
            step="0.01"
            value={precoProfissional}
            onChange={(e) => setPrecoProfissional(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="preco-corporativo">Plano Corporativo (R$)</label>
          <input
            id="preco-corporativo"
            type="number"
            step="0.01"
            value={precoCorporativo}
            onChange={(e) => setPrecoCorporativo(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="form-footer">
            <button type="submit" className="save-button" disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
        </div>
        {feedback.message && (
          <div className={`feedback-message ${feedback.type}`}>
            {feedback.message}
          </div>
        )}
      </form>
    </div>
  );
};

export default ParametrosPage;