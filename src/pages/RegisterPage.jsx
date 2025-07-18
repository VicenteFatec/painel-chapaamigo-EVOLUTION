/**
 * ===================================================================
 * PÁGINA DE REGISTRO DE NOVAS EMPRESAS (VERSÃO CORRIGIDA)
 * PROJETO: Chapa Amigo Empresas
 * ARQUIVO: src/pages/RegisterPage.jsx
 * DATA: 18/07/2025
 *
 * OBJETIVO:
 * 1. Corrigir a falha que impedia o salvamento do e-mail no Firestore.
 * 2. Garantir que todo novo usuário tenha um documento de empresa válido
 * com todos os campos necessários.
 * ===================================================================
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './RegisterPage.css';

import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// Função para aplicar a máscara de CNPJ
const formatCNPJ = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};

function RegisterPage() {
    const [companyName, setCompanyName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [adminName, setAdminName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleCnpjChange = (e) => {
        setCnpj(formatCNPJ(e.target.value));
    };
    
    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(password)) {
            setError('A senha deve ter no mínimo 8 caracteres, com pelo menos uma letra e um número.');
            return;
        }
        if (password !== confirmPassword) {
            setError('As senhas não coincidem!');
            return;
        }

        setIsLoading(true);

        try {
            // 1. Cria o usuário no Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Prepara a referência para o documento no Firestore
            const companyDocRef = doc(db, 'empresas', user.uid);

            // 3. Cria o documento da empresa no Firestore
            await setDoc(companyDocRef, {
                adminUserId: user.uid,
                companyName: companyName,
                cnpj: cnpj.replace(/\D/g, ''),
                adminName: adminName,
                // PONTO DE CORREÇÃO: Usamos user.email em vez do 'email' do estado.
                // Isso garante que o e-mail salvo é exatamente o mesmo usado na autenticação.
                email: user.email,
                plan: 'essencial',
                createdAt: serverTimestamp(),
                limits: {
                    lojas: 1,
                    frota: 20,
                    usuarios: 3,
                }
            });
            
            // 4. Navega para o dashboard após o sucesso
            navigate('/dashboard');

        } catch (error) {
            console.error("Erro no registro:", error.code, error.message);
            if (error.code === 'auth/email-already-in-use') {
                setError('Este e-mail já está em uso por outra conta.');
            } else {
                setError('Ocorreu um erro ao criar a conta. Tente novamente.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-page-container">
            <div className="register-box">
                <img src="/images/logo.svg" alt="Logo Chapa Amigo" className="register-logo" />
                <h1 className="register-title">Crie sua Conta de Empresa</h1>
                <p className="register-subtitle">Comece a gerenciar suas operações com o Plano Essencial.</p>
                
                <form className="register-form" onSubmit={handleRegister}>
                    <div className="input-group">
                        <label htmlFor="companyName">Nome da Empresa</label>
                        <input type="text" id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required disabled={isLoading} />
                    </div>

                    <div className="input-group">
                        <label htmlFor="cnpj">CNPJ</label>
                        <input type="text" id="cnpj" value={cnpj} onChange={handleCnpjChange} required disabled={isLoading} />
                    </div>

                    <div className="input-group">
                        <label htmlFor="adminName">Seu Nome Completo</label>
                        <input type="text" id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} required disabled={isLoading} />
                    </div>
                    
                    <div className="input-group">
                        <label htmlFor="email">Seu E-mail de Acesso</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Crie uma Senha (mín. 8 caracteres, com letras e números)</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                    </div>

                    <div className="input-group">
                        <label htmlFor="confirmPassword">Confirme a Senha</label>
                        <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} />
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="register-button" disabled={isLoading}>
                        {isLoading ? 'Criando conta...' : 'Criar Conta'}
                    </button>
                </form>

                <div className="login-link">
                    <p>Já tem uma conta? <Link to="/login">Faça Login</Link></p>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;
