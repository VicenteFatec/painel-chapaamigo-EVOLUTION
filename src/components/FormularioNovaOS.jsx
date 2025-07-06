// ===================================================================
// ARQUIVO ATUALIZADO: src/components/FormularioNovaOS.jsx
// Integração com a coleção 'frota' concluída.
// O campo de texto foi substituído por um seletor dinâmico.
// ===================================================================

import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
// Adicionando query, onSnapshot e orderBy para buscar a frota
import { collection, Timestamp, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { IMaskInput } from 'react-imask';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

// Estado inicial do formulário, agora com frotaId
const initialState = {
    frotaId: '', // NOVO CAMPO para o ID do membro da frota selecionado
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

const FormularioNovaOS = ({ onClose }) => {
    const [formData, setFormData] = useState(initialState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // NOVO ESTADO para armazenar a lista da frota
    const [frotaList, setFrotaList] = useState([]);

    // EFEITO PARA BUSCAR A FROTA QUANDO O COMPONENTE É MONTADO
    useEffect(() => {
        const frotaCollectionRef = collection(db, "frota");
        const q = query(frotaCollectionRef, orderBy("nomeCompleto"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const frota = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFrotaList(frota);
        });

        // Limpa o listener quando o componente é desmontado
        return () => unsubscribe();
    }, []);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEnderecoChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, [name]: value } }));
    };
    
    const handleCepChange = async (e) => {
        const cepValue = e.target.value;
        handleEnderecoChange({ target: { name: 'cep', value: cepValue } });
        
        const cep = cepValue.replace(/\D/g, '');
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
        // Validação para garantir que um membro da frota foi selecionado
        if (!formData.frotaId) {
            alert("Por favor, selecione um motorista/veículo da sua frota.");
            return;
        }
        setIsSubmitting(true);
        try {
            const membroSelecionado = frotaList.find(m => m.id === formData.frotaId);

            const valorFinal = parseFloat(formData.valorServicoBruto) || 0;
            const dataServicoTimestamp = formData.dataServico ? Timestamp.fromDate(new Date(formData.dataServico)) : Timestamp.now();
            const prazoTerminoTimestamp = formData.prazoTermino ? Timestamp.fromDate(new Date(formData.prazoTermino)) : null;

            const requisitosSelecionados = Object.entries(formData.requisitos)
                .filter(([, value]) => value === true)
                .map(([key]) => key);

            // Removendo campos desnecessários antes de salvar
            const { cliente, veiculo, ...dadosParaSalvar } = formData;

            const docData = {
                ...dadosParaSalvar,
                // Adicionando os dados do membro selecionado para referência
                cliente: membroSelecionado.nomeCompleto,
                veiculo: membroSelecionado.veiculo,
                valorServicoBruto: valorFinal,
                requisitos: requisitosSelecionados,
                dataSolicitacao: Timestamp.now(),
                dataServico: dataServicoTimestamp,
                prazoTermino: prazoTerminoTimestamp,
                status: 'pendente',
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
                <div className="form-section">
                    <h4 className="form-section-title">Informações Gerais</h4>
                    {/* CAMPO DE CLIENTE SUBSTITUÍDO PELO SELETOR DA FROTA */}
                    <div className="form-group">
                        <label>Cliente / Veículo</label>
                        <select name="frotaId" value={formData.frotaId} onChange={handleInputChange} required>
                            <option value="" disabled>-- Selecione um motorista da frota --</option>
                            {frotaList.map(membro => (
                                <option key={membro.id} value={membro.id}>
                                    {membro.nomeCompleto} (Placa: {membro.veiculo?.placa || 'N/A'})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Descrição do Serviço</label>
                        <textarea name="descricaoServico" value={formData.descricaoServico} onChange={handleInputChange} rows="3" required placeholder="Ex: Carga e descarga de caixas..."></textarea>
                    </div>
                </div>

                {/* O RESTANTE DO FORMULÁRIO PERMANECE IDÊNTICO */}
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
                            unmask={true}
                            onAccept={handleValorChange}
                            placeholder="R$ 0,00"
                            className="form-input-style"
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

export default FormularioNovaOS;
