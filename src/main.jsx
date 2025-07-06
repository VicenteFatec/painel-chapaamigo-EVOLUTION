// ===================================================================
// ARQUIVO ATUALIZADO: src/main.jsx
// Roteamento foi centralizado no App.jsx para evitar conflitos.
// Este arquivo agora apenas renderiza o componente principal App.
// ===================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Importamos o App, que agora controla tudo

// CSS
import 'leaflet/dist/leaflet.css';
import './index.css';

// Renderiza o componente App, que contém o BrowserRouter e todas as rotas.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
