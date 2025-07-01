import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, LogOut, Award, PlusCircle, DollarSign, CreditCard, AlignLeft, Calendar, Clock, Truck, Archive, MapPin, Building, Info, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import './MainLayout.css';
import Modal from './Modal';
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';

const getPageTitle = (pathname) => {
    switch (pathname) {
        case '/dashboard': return 'Dashboard';
        case '/operacoes': return 'Mesa de Operações';
        case '/talentos': return 'Gestão de Trabalhadores';
        case '/frota': return 'Minha Frota';
        default: return 'Painel';
    }
};

const estadosBrasileiros = [ "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO" ];

const VALORES_INICIAIS_OS = {
    descricaoServico: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: 'SP',
    dataServico: '', periodoInicio: '',
    valorOfertado: '', formaPagamento: 'PIX',
    requisitos: '', advertencias: '',
    necessitaAutorizacao: false,
};

function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const userEmail = "teste@empresa.com"; 
    
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
    const [newOrderData, setNewOrderData] = useState(VALORES_INICIAIS_OS);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCepLoading, setIsCepLoading] = useState(false);

    const handleNewOrderClick = () => { setIsNewOrderModalOpen(true); };
    const closeNewOrderModal = () => {
        if (isSubmitting) return;
        setIsNewOrderModalOpen(false);
        setNewOrderData(VALORES_INICIAIS_OS);
    };
    
    const handleNewOrderInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewOrderData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCepSearch = async (cep) => {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;
        setIsCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            if (!response.ok) throw new Error('CEP não encontrado.');
            const data = await response.json();
            if (data.erro) throw new Error('CEP inválido.');
            setNewOrderData(prevState => ({
                ...prevState,
                logradouro: data.logradouro,
                bairro: data.bairro,
                cidade: data.localidade,
                estado: data.uf,
            }));
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
            alert(error.message);
        } finally {
            setIsCepLoading(false);
        }
    };

    useEffect(() => {
        const cepLimpo = newOrderData.cep.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
            handleCepSearch(cepLimpo);
        }
    }, [newOrderData.cep]);

    const handleNewOrderSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const dataToSave = {
                descricaoServico: newOrderData.descricaoServico,
                endereco: {
                    cep: newOrderData.cep, logradouro: newOrderData.logradouro,
                    numero: newOrderData.numero, complemento: newOrderData.complemento,
                    bairro: newOrderData.bairro, cidade: newOrderData.cidade, estado: newOrderData.estado,
                },
                dataServico: Timestamp.fromDate(new Date(newOrderData.dataServico + 'T00:00:00')),
                periodo: newOrderData.periodoInicio,
                valorServicoBruto: Number(newOrderData.valorOfertado),
                formaPagamento: newOrderData.formaPagamento,
                requisitos: newOrderData.requisitos,
                advertencias: newOrderData.advertencias,
                necessitaAutorizacao: newOrderData.necessitaAutorizacao,
                status: 'pendente',
                dataSolicitacao: Timestamp.now(),
                cliente: 'Empresa Cliente Teste',
            };
            const docRef = await addDoc(collection(db, "solicitacoes"), dataToSave);
            alert(`Ordem de Serviço criada com sucesso! ID: ${docRef.id}`);
            closeNewOrderModal();
        } catch (error) {
            console.error("Erro ao criar Ordem de Serviço: ", error);
            alert("Ocorreu um erro ao criar a OS. Verifique o console para mais detalhes.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = () => { navigate('/login'); };

    return (
        <div className="main-layout">
            {/* ===== CONTEÚDO DA SIDEBAR CORRIGIDO E COMPLETO ===== */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src="/images/logo.svg" alt="Chapa Amigo Empresas Logo" className="logo" />
                    <h1>Chapa Amigo Empresas</h1>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/dashboard" className="nav-link"><LayoutDashboard size={20} /><span>Dashboard</span></NavLink>
                    <NavLink to="/operacoes" className="nav-link"><ClipboardList size={20} /><span>Mesa de Operações</span></NavLink>
                    <NavLink to="/talentos" className="nav-link"><Award size={20} /><span>Gestão de Trabalhadores</span></NavLink>
                    <NavLink to="/frota" className="nav-link"><Users size={20} /><span>Minha Frota</span></NavLink>
                </nav>
                <div className="sidebar-footer">
                    <div className="user-info"><span className="user-email">{userEmail}</span></div>
                    <button onClick={handleLogout} className="logout-button"><LogOut size={20} /><span>Sair</span></button>
                </div>
            </aside>
            {/* ====================================================== */}

            <main className="content">
                <header className="content-header">
                    <h2 className="page-title">{getPageTitle(location.pathname)}</h2>
                    <button className="new-os-button" onClick={handleNewOrderClick}><PlusCircle size={20} /><span>Nova Ordem de Serviço</span></button>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>

            <Modal isOpen={isNewOrderModalOpen} onClose={closeNewOrderModal} title="Criar Nova Ordem de Serviço">
                <form onSubmit={handleNewOrderSubmit} className="modal-form">
                    <div className="form-section">
                        <h3 className="form-section-title"><Info size={20} /> Informações Gerais</h3>
                        <div className="input-group full-width">
                            <label htmlFor="descricaoServico">Descrição do Serviço</label>
                            <textarea id="descricaoServico" name="descricaoServico" rows="3" value={newOrderData.descricaoServico} onChange={handleNewOrderInputChange} placeholder="Ex: Descarga de 200 caixas de arroz e armazenamento no estoque." required />
                        </div>
                    </div>
                    <div className="form-section">
                        <h3 className="form-section-title"><MapPin size={20} /> Endereço do Serviço</h3>
                        <div className="form-row">
                            <div className="input-group cep-group">
                                <label htmlFor="cep">CEP</label>
                                <IMaskInput mask="00000-000" id="cep" name="cep" value={newOrderData.cep} onAccept={(value) => handleNewOrderInputChange({target: {name: 'cep', value}})} placeholder="Digite o CEP" />
                                {isCepLoading && <Loader2 className="spinner" size={18} />}
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="input-group" style={{gridColumn: 'span 2'}}><label htmlFor="logradouro">Rua / Logradouro</label><input type="text" id="logradouro" name="logradouro" value={newOrderData.logradouro} onChange={handleNewOrderInputChange} required /></div>
                        </div>
                        <div className="form-row">
                            <div className="input-group"><label htmlFor="numero">Número</label><input type="text" id="numero" name="numero" value={newOrderData.numero} onChange={handleNewOrderInputChange} required /></div>
                            <div className="input-group"><label htmlFor="complemento">Complemento</label><input type="text" id="complemento" name="complemento" value={newOrderData.complemento} onChange={handleNewOrderInputChange} /></div>
                        </div>
                         <div className="form-row">
                            <div className="input-group"><label htmlFor="bairro">Bairro</label><input type="text" id="bairro" name="bairro" value={newOrderData.bairro} onChange={handleNewOrderInputChange} required /></div>
                            <div className="input-group"><label htmlFor="cidade">Cidade</label><input type="text" id="cidade" name="cidade" value={newOrderData.cidade} onChange={handleNewOrderInputChange} required /></div>
                             <div className="input-group">
                                <label htmlFor="estado">Estado</label>
                                <select id="estado" name="estado" value={newOrderData.estado} onChange={handleNewOrderInputChange} required>
                                    {estadosBrasileiros.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="form-section">
                        <h3 className="form-section-title"><Calendar size={20} /> Data e Hora</h3>
                        <div className="form-row">
                             <div className="input-group">
                                <label htmlFor="dataServico">Data do Serviço</label>
                                <input type="date" id="dataServico" name="dataServico" value={newOrderData.dataServico} onChange={handleNewOrderInputChange} required />
                            </div>
                            <div className="input-group">
                                <label htmlFor="periodoInicio">Período de Início</label>
                                <select id="periodoInicio" name="periodoInicio" value={newOrderData.periodoInicio} onChange={handleNewOrderInputChange} required>
                                    <option value="">Selecione...</option>
                                    <option value="Imediato">Imediato</option>
                                    <option value="Manhã (08h-12h)">Manhã (08h-12h)</option>
                                    <option value="Tarde (13h-18h)">Tarde (13h-18h)</option>
                                    <option value="Noite (19h-22h)">Noite (19h-22h)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="form-section">
                        <h3 className="form-section-title"><DollarSign size={20} /> Detalhes Financeiros</h3>
                        <div className="form-row">
                             <div className="input-group">
                                <label htmlFor="valorOfertado">Valor Ofertado (R$)</label>
                                <input type="number" step="0.01" id="valorOfertado" name="valorOfertado" value={newOrderData.valorOfertado} onChange={handleNewOrderInputChange} placeholder="Ex: 150.00" required />
                            </div>
                            <div className="input-group">
                                <label htmlFor="formaPagamento">Forma de Pagamento</label>
                                <select id="formaPagamento" name="formaPagamento" value={newOrderData.formaPagamento} onChange={handleNewOrderInputChange} required>
                                    <option value="PIX">PIX</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Faturado">Faturado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                     <div className="form-section">
                        <h3 className="form-section-title"><AlertTriangle size={20} /> Requisitos e Advertências</h3>
                        <div className="input-group full-width"><label htmlFor="requisitos">Requisitos (EPIs, etc.)</label><textarea id="requisitos" name="requisitos" rows="2" value={newOrderData.requisitos} onChange={handleNewOrderInputChange} placeholder="Ex: Obrigatório uso de capacete e botas." /></div>
                        <div className="input-group full-width"><label htmlFor="advertencias">Advertências Importantes</label><textarea id="advertencias" name="advertencias" rows="2" value={newOrderData.advertencias} onChange={handleNewOrderInputChange} placeholder="Ex: Proibido uso de celular na área de descarga." /></div>
                    </div>
                    <div className="form-section">
                        <div className="checkbox-group">
                            <input type="checkbox" id="necessitaAutorizacao" name="necessitaAutorizacao" checked={newOrderData.necessitaAutorizacao} onChange={handleNewOrderInputChange} />
                            <label htmlFor="necessitaAutorizacao">Necessario Autorização de Entrada - favor levar documento pessoal</label>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={closeNewOrderModal} disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" className="add-button" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Criar Ordem de Serviço'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default MainLayout;