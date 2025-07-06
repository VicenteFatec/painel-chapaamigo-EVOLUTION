// ===================================================================
// ARQUIVO COMPLETO COM UPGRADE DE BIBLIOTECA - VÁLIDO
// Substitui 'react-input-mask' por 'react-imask' para compatibilidade com React 18
// Código limpo, sem caracteres unicode ocultos.
// ===================================================================
import React, { useState, useEffect } from 'react';
import { db, functions } from '../firebaseConfig';
import { collection, query, where, orderBy, doc, Timestamp, getDoc, updateDoc, onSnapshot, getDocs, writeBatch, addDoc } from 'firebase/firestore';
import { httpsCallable } from "firebase/functions";
import { Clock, CheckCircle, XCircle, FileText, User, Ticket, Search, X, Loader2, Hourglass, Archive, Printer } from 'lucide-react';
// ALTERAÇÃO 1: Importando o componente da nova biblioteca
import { IMaskInput } from 'react-imask'; 
import Modal from '../components/Modal';
import CartaoOS from '../components/CartaoOS';
import './SolicitacoesPage.css';
import axios from 'axios';

const FormularioNovaOS = ({ onClose }) => {
    // ... (todo o código do seu formulário permanece o mesmo até a seção de detalhes financeiros) ...
    const initialState = {
        cliente: '',
        veiculo: '',
        descricaoServico: '',
        estabelecimento: '',
        endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' },
        dataServico: '',
        periodoInicio: 'Manhã (08:00 - 12:00)',
        outroHorario: '',
        prazoTermino: '',
        valorServicoBruto: '',
        formaPagamento: 'PIX',
        requisitos: {
            'Uso de botas/calçado de segurança': false, 'Uso de óculos de proteção': false,
            'Uso de colete refletivo': false, 'Uso de capacete': false,
            'Uso de cinta ergonômica': false, 'Uso de luvas': false,
            'Levar documento original': false, 'Proibido uso de celular': false,
        },
        termosAceitos: false,
    };

    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEnderecoChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, [name]: value } }));
    };
    
    const handleCepChange = async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        handleEnderecoChange({ target: { name: 'cep', value: e.target.value } });

        if (cep.length === 8) {
            try {
                const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        endereco: {
                            ...prev.endereco,
                            logradouro: data.logradouro,
                            bairro: data.bairro,
                            cidade: data.localidade,
                            estado: data.uf,
                        }
                    }));
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
            }
        }
    };

    const handleRequisitoChange = (e) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, requisitos: { ...prev.requisitos, [name]: checked } }));
    };
    
    // ALTERAÇÃO 2: Simplificando o handler. A nova biblioteca nos dará o valor puro.
    const handleValorChange = (unmaskedValue) => {
        setFormData(prev => ({...prev, valorServicoBruto: unmaskedValue}));
    }

    const isPagamentoPlataforma = formData.formaPagamento === 'Pagamento pela Plataforma';
    const isFormInvalid = isPagamentoPlataforma && !formData.termosAceitos;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isFormInvalid) {
            alert("Você deve aceitar os termos e condições para pagamentos via plataforma.");
            return;
        }
        setIsSubmitting(true);
        try {
            const valorFinal = parseFloat(formData.valorServicoBruto) || 0;
            const dataServicoTimestamp = formData.dataServico ? Timestamp.fromDate(new Date(formData.dataServico)) : Timestamp.now();
            const prazoTerminoTimestamp = formData.prazoTermino ? Timestamp.fromDate(new Date(formData.prazoTermino)) : null;

            const requisitosSelecionados = Object.entries(formData.requisitos)
                .filter(([key, value]) => value === true)
                .map(([key]) => key);

            const docData = {
                ...formData,
                valorServicoBruto: valorFinal,
                requisitos: requisitosSelecionados,
                dataSolicitacao: Timestamp.now(),
                dataServico: dataServicoTimestamp,
                prazoTermino: prazoTerminoTimestamp,
                status: 'pendente',
                timestampCriacao: Timestamp.now(),
            };
            
            await addDoc(collection(db, "solicitacoes"), docData);
            alert("Ordem de Serviço criada com sucesso!");
            onClose();

        } catch (error) {
            console.error("Erro ao criar Ordem de Serviço: ", error);
            alert("Falha ao criar a Ordem de Serviço. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-grid">
                 {/* ... Todas as outras seções do formulário (Informações Gerais, Endereço, Data e Hora) permanecem idênticas ... */}
                <div className="form-section">
                    <h4 className="form-section-title">Informações Gerais</h4>
                    <div className="form-group">
                        <label>Cliente / Veículo</label>
                        <input type="text" name="cliente" value={formData.cliente} onChange={handleInputChange} required placeholder="Nome do Cliente ou Empresa"/>
                    </div>
                    <div className="form-group">
                        <label>Descrição do Serviço</label>
                        <textarea name="descricaoServico" value={formData.descricaoServico} onChange={handleInputChange} rows="3" required placeholder="Ex: Carga e descarga de caixas..."></textarea>
                    </div>
                </div>

                <div className="form-section">
                    <h4 className="form-section-title">Endereço do Serviço</h4>
                    <div className="form-group">
                        <label>Estabelecimento (Opcional)</label>
                        <input type="text" name="estabelecimento" value={formData.estabelecimento} onChange={handleInputChange} placeholder="Ex: Hypermercado Vende Mais"/>
                    </div>
                     <div className="form-group">
                        <label>CEP</label>
                        <input type="text" name="cep" value={formData.endereco.cep} onChange={handleCepChange} maxLength="9" placeholder="Digite o CEP"/>
                    </div>
                    <div className="form-group">
                        <label>Rua / Logradouro</label>
                        <input type="text" name="logradouro" value={formData.endereco.logradouro} onChange={handleEnderecoChange} required />
                    </div>
                    <div className="form-group">
                        <label>Número</label>
                        <input type="text" name="numero" value={formData.endereco.numero} onChange={handleEnderecoChange} required />
                    </div>
                     <div className="form-group">
                        <label>Bairro</label>
                        <input type="text" name="bairro" value={formData.endereco.bairro} onChange={handleEnderecoChange} required />
                    </div>
                     <div className="form-group">
                        <label>Cidade</label>
                        <input type="text" name="cidade" value={formData.endereco.cidade} onChange={handleEnderecoChange} required />
                    </div>
                     <div className="form-group">
                        <label>Estado</label>
                        <input type="text" name="estado" value={formData.endereco.estado} onChange={handleEnderecoChange} required maxLength="2" />
                    </div>
                </div>

                <div className="form-section">
                    <h4 className="form-section-title">Data e Hora</h4>
                    <div className="form-group">
                        <label>Data e Hora do Serviço</label>
                        <input type="datetime-local" name="dataServico" value={formData.dataServico} onChange={handleInputChange} required />
                    </div>
                    <div className="form-group">
                        <label>Período de Início</label>
                        <div className="horario-outro-group">
                            <select name="periodoInicio" value={formData.periodoInicio} onChange={handleInputChange}>
                                <option>Manhã (08:00 - 12:00)</option>
                                <option>Tarde (13:00 - 18:00)</option>
                                <option>Noite (19:00 - 22:00)</option>
                                <option>Outro</option>
                            </select>
                            {formData.periodoInicio === 'Outro' && (
                                <input type="text" name="outroHorario" placeholder="Digite o horário" value={formData.outroHorario} onChange={handleInputChange} />
                            )}
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Prazo para Término (Opcional)</label>
                        <input type="datetime-local" name="prazoTermino" value={formData.prazoTermino} onChange={handleInputChange} />
                    </div>
                </div>

                <div className="form-section">
                    <h4 className="form-section-title">Detalhes Financeiros</h4>
                    <div className="form-group">
                        <label>Valor Ofertado</label>
                        {/* ALTERAÇÃO 3: Substituindo o componente antigo pelo novo 'IMaskInput' */}
                        <IMaskInput
                            mask="R$ num"
                            blocks={{
                                num: {
                                    mask: Number,
                                    thousandsSeparator: '.',
                                    radix: ',',
                                    scale: 2,
                                    padFractionalZeros: true,
                                },
                            }}
                            unmask={true} // Retorna apenas os números para o handler
                            onAccept={handleValorChange} // Usa o handler simplificado
                            placeholder="R$ 0,00"
                            className="form-input-style" // Adicione uma classe para estilizar se necessário
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Forma de Pagamento</label>
                        <select name="formaPagamento" value={formData.formaPagamento} onChange={handleInputChange}>
                            <option>PIX</option>
                            <option>Dinheiro no Ato</option>
                            <option>Pagamento pela Plataforma</option>
                        </select>
                    </div>
                </div>
                 {/* ... O resto do formulário (Requisitos, Termos, Botões) permanece idêntico ... */}
                <div className="form-section" style={{ gridColumn: '1 / -1' }}>
                    <h4 className="form-section-title">Requisitos e Advertências</h4>
                    <div className="requisitos-container">
                        {Object.keys(initialState.requisitos).map(req => (
                            <div key={req} className="requisito-item">
                                <input type="checkbox" id={req} name={req} checked={formData.requisitos[req]} onChange={handleRequisitoChange} />
                                <label htmlFor={req}>{req}</label>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="form-section" style={{ gridColumn: '1 / -1' }}>
                     <div className={`termos-container ${!isPagamentoPlataforma ? 'disabled' : ''}`}>
                        <input 
                            type="checkbox" 
                            id="termosAceitos" 
                            name="termosAceitos" 
                            checked={formData.termosAceitos}
                            onChange={(e) => setFormData(prev => ({...prev, termosAceitos: e.target.checked}))}
                            disabled={!isPagamentoPlataforma}
                        />
                        <label htmlFor="termosAceitos">Li e aceito os termos e condições de pagamento pela Plataforma.</label>
                    </div>
                </div>
            </div>

            <div className="form-actions">
                <button type="button" className="cancel-button" onClick={onClose}>Cancelar</button>
                <button type="submit" className="submit-os-button" disabled={isSubmitting || isFormInvalid}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Ordem de Serviço'}
                </button>
            </div>
        </form>
    );
};

// --- O restante da página SolicitacoesPage permanece o mesmo ---
function SolicitacoesPage() {
    // ... todo o código existente da SolicitacoesPage ...
    const [solicitacoes, setSolicitacoes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
    const [trabalhadoresSugeridos, setTrabalhadoresSugeridos] = useState([]);
    const [isLoadingSugeridos, setIsLoadingSugeridos] = useState(false);
    const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
    const [trabalhadorSelecionado, setTrabalhadorSelecionado] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAlocando, setIsAlocando] = useState(false);

    const regioesSinonimos = {
        'São Paulo (Capital)': ['SP (Capital)'],
        'SP (Capital)': ['São Paulo (Capital)'],
    };
    
    const getStatusInfo = (status) => {
        switch (status) {
            case 'pendente': return { icon: <Clock size={16} />, text: 'Pendente', color: 'text-yellow-500' };
            case 'aguardando_resposta': return { icon: <Hourglass size={16} />, text: 'Aguardando Resposta', color: 'text-cyan-500' };
            case 'confirmado': return { icon: <CheckCircle size={16} />, text: 'Chapa Confirmado', color: 'text-green-500' };
            case 'finalizado': return { icon: <CheckCircle size={16} />, text: 'Serviço Finalizado', color: 'text-blue-500' };
            case 'cancelado': return { icon: <XCircle size={16} />, text: 'Cancelado', color: 'text-red-500' };
            case 'arquivado': return { icon: <Archive size={16} />, text: 'Arquivado', color: 'text-gray-400' };
            default: return { icon: <FileText size={16} />, text: 'Status Desconhecido', color: 'text-gray-500' };
        }
    };

    const enviarConvite = httpsCallable(functions, 'enviarConviteOS');
    
    useEffect(() => {
        setIsLoading(true);
        const solicitacoesCollectionRef = collection(db, "solicitacoes");
        const statusVisiveis = ["pendente", "aguardando_resposta", "confirmado", "finalizado", "cancelado"];
        const q = query(solicitacoesCollectionRef, where("status", "in", statusVisiveis), orderBy("dataSolicitacao", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const solicitacoesList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return { 
                    ...data, 
                    id: doc.id,
                    dataSolicitacao: data.dataSolicitacao,
                    timestampFim: data.timestampFim
                };
            });
            setSolicitacoes(solicitacoesList);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao escutar atualizações de solicitações: ", error);
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    const buscarTrabalhadores = async (regiao = null, termoBusca = '') => {
        setIsLoadingSugeridos(true);
        setTrabalhadoresSugeridos([]);
        try {
            const chapasCollectionRef = collection(db, "chapas_b2b");
            const q = query(chapasCollectionRef, where("status", "==", "Disponível"));
            const data = await getDocs(q);
            const todosOsChapasDisponiveis = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            
            let chapasFiltrados = [];
            
            if (termoBusca) {
                const termo = termoBusca.toLowerCase();
                chapasFiltrados = todosOsChapasDisponiveis.filter(chapa =>
                    chapa.nomeCompleto.toLowerCase().includes(termo)
                );
            } else if (regiao) {
                const regioesValidas = [regiao, ...(regioesSinonimos[regiao] || [])];
                chapasFiltrados = todosOsChapasDisponiveis.filter(chapa =>
                    chapa.regiao && regioesValidas.some(r => chapa.regiao.includes(r))
                );
            } else {
                chapasFiltrados = todosOsChapasDisponiveis;
            }
            setTrabalhadoresSugeridos(chapasFiltrados);
        } catch (error) {
            console.error("Erro ao buscar trabalhadores:", error);
        } finally {
            setIsLoadingSugeridos(false);
        }
    };

    const handleVerDetalhes = (solicitacao) => {
        setSolicitacaoSelecionada(solicitacao);
        setIsDetalhesModalOpen(true);
        if (solicitacao.status === 'pendente') {
            buscarTrabalhadores(solicitacao.endereco?.cidade);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        buscarTrabalhadores(null, searchTerm);
    };

    const clearSearch = () => {
        setSearchTerm('');
        if (solicitacaoSelecionada) {
            buscarTrabalhadores(solicitacaoSelecionada.endereco?.cidade);
        }
    };

    const handleVerTicket = async (solicitacao) => {
        if (!solicitacao.chapaAlocadoId) return;
        setTrabalhadorSelecionado(null);
        try {
            const trabalhadorRef = doc(db, "chapas_b2b", solicitacao.chapaAlocadoId);
            const trabalhadorDoc = await getDoc(trabalhadorRef);
            if (trabalhadorDoc.exists()) {
                setTrabalhadorSelecionado(trabalhadorDoc.data());
                setSolicitacaoSelecionada(solicitacao);
                setIsTicketModalOpen(true);
            } else {
                alert("Não foi possível encontrar os dados do trabalhador alocado.");
            }
        } catch (error) {
            console.error("Erro ao buscar ticket:", error);
        }
    };

    const fecharDetalhesModal = () => {
        setIsDetalhesModalOpen(false);
        setSolicitacaoSelecionada(null);
        setTrabalhadoresSugeridos([]);
        setSearchTerm('');
    };
    
    const fecharTicketModal = () => {
        setIsTicketModalOpen(false);
        setSolicitacaoSelecionada(null);
        setTrabalhadorSelecionado(null);
    };

    const handleAlocarChapa = async (chapa) => {
        if (!solicitacaoSelecionada || !chapa) {
            alert("Erro: Solicitação ou trabalhador não selecionado.");
            return;
        }
        setIsAlocando(true);
        const solicitacaoRef = doc(db, "solicitacoes", solicitacaoSelecionada.id);
        try {
            await updateDoc(solicitacaoRef, { status: 'aguardando_resposta' });
            
            await enviarConvite({
                chapaId: chapa.id,
                nomeChapa: chapa.nomeCompleto,
                telefoneChapa: chapa.telefone,
                idOS: solicitacaoSelecionada.id,
                solicitacaoData: solicitacaoSelecionada 
            });
            alert(`Convite via WhatsApp enviado para ${chapa.nomeCompleto}!`);
            fecharDetalhesModal();
        } catch (error) {
            console.error("Erro ao enviar convite: ", error);
            alert(`Ocorreu um erro ao tentar enviar o convite: ${error.message}`);
            await updateDoc(solicitacaoRef, { status: 'pendente' });
        } finally {
            setIsAlocando(false);
        }
    };

    const handleFinalizarServico = async (solicitacao) => {
        if (!solicitacao.chapaAlocadoId) { return; }
        if (!window.confirm(`Tem certeza que deseja finalizar este serviço e liberar o trabalhador ${solicitacao.chapaAlocadoNome}?`)) { return; }
        try {
            const batch = writeBatch(db);
            const solicitacaoRef = doc(db, "solicitacoes", solicitacao.id);
            batch.update(solicitacaoRef, {
                status: 'finalizado',
                timestampFim: Timestamp.now()
            });
            const chapaRef = doc(db, "chapas_b2b", solicitacao.chapaAlocadoId);
            batch.update(chapaRef, { status: 'Disponível' });
            await batch.commit();
        } catch (error) {
            console.error("Erro ao finalizar serviço: ", error);
        }
    };
    
    const handleArquivarServico = async (solicitacaoId) => {
        if (!window.confirm("Tem certeza que deseja arquivar este serviço?")) {
            return;
        }
        try {
            const solicitacaoRef = doc(db, "solicitacoes", solicitacaoId);
            await updateDoc(solicitacaoRef, { status: 'arquivado' });
        } catch (error) {
            console.error("Erro ao arquivar serviço:", error);
            alert("Ocorreu um erro ao tentar arquivar o serviço.");
        }
    };
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            <div className="solicitacoes-header">
                <div>
                    <h1 className="solicitacoes-title">Mesa de Operações</h1>
                    <p className="solicitacoes-subtitle">Visão geral de todas as solicitações de serviço dos clientes.</p>
                </div>
                <button className="new-os-button" onClick={() => setIsFormModalOpen(true)}>
                    + Criar Nova Ordem de Serviço
                </button>
            </div>
            <div className="table-container">
                <table className="solicitacoes-table">
                    <thead>
                        <tr>
                            <th>Cliente / Trabalhador</th>
                            <th>Datas</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="4" className="text-center p-8"><Loader2 size={24} className="animate-spin inline-block mr-2" /> Carregando...</td></tr>
                        ) : solicitacoes.length > 0 ? (
                            solicitacoes.map((solicitacao) => {
                                const statusInfo = getStatusInfo(solicitacao.status);
                                return (
                                    <tr key={solicitacao.id}>
                                        <td>
                                            <div className="font-semibold">{solicitacao.cliente}</div>
                                            {solicitacao.chapaAlocadoNome && (<div className="text-sm text-gray-600 mt-1"><span className="font-medium">Alocado:</span> {solicitacao.chapaAlocadoNome}</div>)}
                                        </td>
                                        <td>
                                            <div className="datas-cell">
                                                {solicitacao.dataServico?.toDate && <span><strong>Serviço:</strong> {solicitacao.dataServico.toDate().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</span>}
                                                {solicitacao.timestampFim?.toDate && <span><strong>Finalizado:</strong> {solicitacao.timestampFim.toDate().toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={`status-cell ${statusInfo.color}`}>{statusInfo.icon}<span>{statusInfo.text}</span></div>
                                        </td>
                                        <td>
                                            <div className="acoes-cell">
                                                {solicitacao.status === 'pendente' && (<button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Encontrar Chapa </button>)}
                                                {solicitacao.status === 'aguardando_resposta' && (<button className="view-details-button-disabled" disabled> Aguardando... </button>)}
                                                {solicitacao.status === 'confirmado' && (<> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)}> <Ticket size={16} /> Ver Ticket </button> <button className="finish-button" onClick={() => handleFinalizarServico(solicitacao)}> Finalizar </button> </>)}
                                                {solicitacao.status === 'finalizado' && ( <> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="ticket-button" onClick={() => handleVerTicket(solicitacao)}> <Ticket size={16} /> Ver Ticket </button> <button className="archive-button" onClick={() => handleArquivarServico(solicitacao.id)}> <Archive size={16} /> Arquivar </button> </> )}
                                                {solicitacao.status === 'cancelado' && ( <> <button className="view-details-button" onClick={() => handleVerDetalhes(solicitacao)}> Ver Detalhes </button> <button className="archive-button" onClick={() => handleArquivarServico(solicitacao.id)}> <Archive size={16} /> Arquivar </button> </> )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan="4" className="text-center p-8">Nenhuma solicitação ativa encontrada.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title="Criar Nova Ordem de Serviço">
                <FormularioNovaOS onClose={() => setIsFormModalOpen(false)} />
            </Modal>

            <Modal isOpen={isDetalhesModalOpen} onClose={fecharDetalhesModal} title={solicitacaoSelecionada?.status === 'pendente' ? 'Encontrar Trabalhador' : 'Detalhes do Serviço'}>
                 {solicitacaoSelecionada?.status !== 'pendente' ? (
                    <div>
                        <div className="printable-area documento-gala-container">
                            <header className="gala-header">
                                <img src="/images/logochapa.svg" alt="Chapa Amigo Empresas" className="gala-logo" />
                                <div className="gala-title">
                                    <h2>Documento de Serviço</h2>
                                    <p>OS #{solicitacaoSelecionada?.id.substring(0, 8).toUpperCase()}</p>
                                </div>
                            </header>
                            <section className="gala-section">
                                <h3 className="gala-section-title">Detalhes da Operação</h3>
                                <div className="gala-item"><span className="gala-label">Cliente:</span><span className="gala-dado">{solicitacaoSelecionada?.cliente}</span></div>
                                <div className="gala-item"><span className="gala-label">Local:</span><span className="gala-dado">{`${solicitacaoSelecionada?.endereco?.logradouro}, ${solicitacaoSelecionada?.endereco?.numero} - ${solicitacaoSelecionada?.endereco?.bairro}, ${solicitacaoSelecionada?.endereco?.cidade}-${solicitacaoSelecionada?.endereco?.estado}`}</span></div>
                                {solicitacaoSelecionada?.chapaAlocadoNome && (<div className="gala-item"><span className="gala-label">Trabalhador:</span><span className="gala-dado alocado">{solicitacaoSelecionada?.chapaAlocadoNome}</span></div>)}
                            </section>
                            <section className="gala-section">
                                <h3 className="gala-section-title">Escopo do Serviço</h3>
                                <div className="gala-item"><span className="gala-label">Descrição:</span><span className="gala-dado descricao">{solicitacaoSelecionada?.descricaoServico}</span></div>
                                {solicitacaoSelecionada?.requisitos && solicitacaoSelecionada.requisitos.length > 0 && (<div className="gala-item"><span className="gala-label">Requisitos:</span><span className="gala-dado">{solicitacaoSelecionada.requisitos.join(', ')}</span></div>)}
                            </section>
                            <section className="gala-section">
                                <h3 className="gala-section-title">Informações Financeiras e Temporais</h3>
                                <div className="gala-item"><span className="gala-label">Valor Ofertado:</span><span className="gala-dado">R$ {solicitacaoSelecionada?.valorServicoBruto?.toFixed(2).replace('.', ',')}</span></div>
                                <div className="gala-item"><span className="gala-label">Pagamento:</span><span className="gala-dado">{solicitacaoSelecionada?.formaPagamento}</span></div>
                                {solicitacaoSelecionada?.dataServico?.toDate && <div className="gala-item"><span className="gala-label">Agendado para:</span><span className="gala-dado">{solicitacaoSelecionada?.dataServico.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div>}
                                {solicitacaoSelecionada?.timestampFim?.toDate && (<div className="gala-item"><span className="gala-label">Fim do Serviço:</span><span className="gala-dado">{solicitacaoSelecionada?.timestampFim.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div>)}
                            </section>
                            <footer className="gala-footer">Documento gerado por Chapa Amigo Empresas</footer>
                        </div>
                        <div className="modal-footer-actions" style={{justifyContent: 'flex-end', paddingTop: '1rem'}}>
                            <button onClick={handlePrint} className="print-button"><Printer size={16} /> Imprimir / Salvar PDF</button>
                        </div>
                    </div>
                ) : (
                    <div className="curadoria-container">
                        <div className="curadoria-coluna">
                            <h3>Buscar Trabalhadores</h3>
                            <div className="search-container">
                                <form onSubmit={handleSearchSubmit} className="search-form"><div className="search-input-wrapper"><Search size={18} className="search-icon" /><input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={handleSearchChange} /></div><button type="submit">Buscar</button></form>
                                <button onClick={clearSearch} className="clear-search-button"><X size={14} /> Limpar e ver sugestões</button>
                            </div>
                            {isLoadingSugeridos ? (<div className="loading-sugeridos"><Loader2 size={20} className="animate-spin" /></div>) : (
                                <div className="lista-sugeridos">
                                    {trabalhadoresSugeridos.length > 0 ? (
                                        trabalhadoresSugeridos.map(chapa => (
                                            <div key={chapa.id} className="sugerido-item">
                                                <div className="sugerido-info">{chapa.fotoURL ? <img src={chapa.fotoURL} alt={chapa.nomeCompleto} className="sugerido-avatar" /> : <div className="user-avatar" style={{ width: '40px', height: '40px' }}><User size={18} /></div>}<div><span className="sugerido-nome">{chapa.nomeCompleto}</span><span className="sugerido-regiao">{chapa.regiao.join(', ')}</span></div></div>
                                                <button className="alocar-btn" onClick={() => handleAlocarChapa(chapa)} disabled={isAlocando}>{isAlocando ? <Loader2 size={16} className="animate-spin" /> : 'Alocar'}</button>
                                            </div>
                                        ))
                                    ) : (<p style={{ textAlign: 'center', padding: '1rem' }}>Nenhum trabalhador encontrado.</p>)}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isTicketModalOpen} onClose={fecharTicketModal} title="Ticket de Serviço">
                <CartaoOS solicitacao={solicitacaoSelecionada} trabalhador={trabalhadorSelecionado} />
            </Modal>
        </div>
    );
}

export default SolicitacoesPage;