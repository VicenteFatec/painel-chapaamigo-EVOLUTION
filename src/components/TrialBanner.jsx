import React from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './TrialBanner.css'; // Criaremos este CSS a seguir

const TrialBanner = ({ status, trialEndDate }) => {
  const navigate = useNavigate();

  // Se não estiver em trial, não renderiza nada
  if (status !== 'trialing' || !trialEndDate) {
    return null;
  }

  const hoje = new Date();
  // O Firestore nos dá um objeto timestamp, precisamos convertê-lo para uma Data JS
  const dataFinal = trialEndDate.toDate();

  const diasRestantes = differenceInCalendarDays(dataFinal, hoje);

  let mensagem = '';
  if (diasRestantes > 1) {
    mensagem = `Seu período de teste termina em ${diasRestantes} dias.`;
  } else if (diasRestantes === 1) {
    mensagem = 'Seu período de teste termina amanhã!';
  } else if (diasRestantes === 0) {
    mensagem = 'Seu período de teste termina hoje!';
  } else {
    mensagem = 'Seu período de teste expirou.';
  }

  return (
    <div className="trial-banner">
      <p>
        {mensagem}
        <button onClick={() => navigate('/planos')} className="trial-button">
          Escolher um Plano
        </button>
      </p>
    </div>
  );
};

export default TrialBanner;