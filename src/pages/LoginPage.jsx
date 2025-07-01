import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // PASSO 1: Importar o hook de navegação
import './LoginPage.css';
import { auth } from '../firebaseConfig'; 
import { signInWithEmailAndPassword } from "firebase/auth";

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // PASSO 2: Preparar o hook para uso

  const handleLogin = (e) => {
    e.preventDefault(); 
    
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Login bem-sucedido!
        console.log("Login com sucesso:", userCredential.user.email);
        // PASSO 3: Em vez de um alerta, navegar para o dashboard
        navigate('/dashboard'); 
      })
      .catch((error) => {
        const errorMessage = error.message;
        alert("Falha no login: " + errorMessage);
      });
  };

  return (
    <div className="login-page-container">
      <div className="login-box">
        <img src="/images/logo.svg" alt="Logo Chapa Amigo" className="login-logo" />
        <h1 className="login-title">Painel Chapa Amigo Empresas</h1>
        <p className="login-subtitle">Por favor, insira suas credenciais para continuar.</p>
        
        <form className="login-form" onSubmit={handleLogin}>
           {/* O restante do seu formulário permanece igual */}
           <div className="input-group">
            <label htmlFor="email">E-mail Corporativo</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Senha</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;