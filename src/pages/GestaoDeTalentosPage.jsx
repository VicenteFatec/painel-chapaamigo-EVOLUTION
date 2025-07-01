import React, { useState, useEffect, useRef } from 'react';
import './GestaoDeTalentosPage.css';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';
import { PlusCircle, User, FileText, Edit, Trash2, Upload, Paperclip, Camera, XCircle, Users, Banknote } from 'lucide-react';
import { db, storage } from '../firebaseConfig'; 
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, writeBatch, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import Papa from 'papaparse';
import imageCompression from 'browser-image-compression';
import { IMaskInput } from 'react-imask';

const VALORES_INICIAIS_FORM = {
    nomeCompleto: '', cpf: '', rg: '', telefone: '', status: 'Disponível',
    fotoURL: '', dossieURL: '', dataNascimento: '',
    tipoChavePix: '', chavePix: ''
};

function GestaoDeTalentosPage() {
    const [chapas, setChapas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(VALORES_INICIAIS_FORM);
    const [importStatus, setImportStatus] = useState('');
    const [uploadProgress, setUploadProgress] = useState('');
    const [filtro, setFiltro] = useState(''); 
    const [chapasFiltrados, setChapasFiltrados] = useState([]);
    const [trabalhadorEmEdicao, setTrabalhadorEmEdicao] = useState(null); 
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [trabalhadorParaExcluir, setTrabalhadorParaExcluir] = useState(null);
    const [arquivoParaExcluir, setArquivoParaExcluir] = useState({ foto: null, dossie: null });
    const fileInputRef = useRef(null);
    const chapasCollectionRef = collection(db, "chapas_b2b");

    const fetchChapas = async () => { setIsLoading(true); try { const q = query(chapasCollectionRef, orderBy("dataImportacao", "desc")); const data = await getDocs(q); const chapasList = data.docs.map(doc => ({ ...doc.data(), id: doc.id })); setChapas(chapasList); } catch (error) { console.error("Erro ao buscar trabalhadores:", error); } finally { setIsLoading(false); } };
    useEffect(() => { fetchChapas(); }, []);

    useEffect(() => {
        const termoBusca = filtro.toLowerCase().trim();
        if (!chapas) return;
        const resultadoFiltrado = chapas.filter(chapa => {
            return (chapa.nomeCompleto || '').toLowerCase().includes(termoBusca) || (chapa.cpf || '').toString().includes(termoBusca) || (chapa.rg || '').toString().includes(termoBusca);
        });
        setChapasFiltrados(resultadoFiltrado);
    }, [filtro, chapas]);
    
    useEffect(() => {
        if (formData.tipoChavePix === 'CPF' && formData.cpf) {
            setFormData(prevState => ({ ...prevState, chavePix: prevState.cpf }));
        } else if (formData.tipoChavePix === 'Telefone' && formData.telefone) {
            setFormData(prevState => ({ ...prevState, chavePix: prevState.telefone }));
        }
    }, [formData.tipoChavePix, formData.cpf, formData.telefone]);

    const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prevState => ({ ...prevState, [name]: value })); };
    const formatarDataParaInput = (timestamp) => { if (!timestamp || !timestamp.toDate) return ''; const data = timestamp.toDate(); const dataAjustada = new Date(data.getTime() - (data.getTimezoneOffset() * 60000)); return dataAjustada.toISOString().split('T')[0]; };
    const abrirModalCriacao = () => { setTrabalhadorEmEdicao(null); setFormData(VALORES_INICIAIS_FORM); setArquivoParaExcluir({ foto: null, dossie: null }); setUploadProgress(''); setIsModalOpen(true); };
    
    const abrirModalEdicao = (trabalhador) => {
        setTrabalhadorEmEdicao(trabalhador);
        setFormData({
            nomeCompleto: trabalhador.nomeCompleto || '', cpf: trabalhador.cpf || '', rg: trabalhador.rg || '',
            telefone: trabalhador.telefone || '', status: trabalhador.status || 'Disponível', fotoURL: trabalhador.fotoURL || '',
            dossieURL: trabalhador.dossieURL || '', dataNascimento: formatarDataParaInput(trabalhador.dataNascimento),
            tipoChavePix: trabalhador.dadosBancarios?.tipoChave || '', chavePix: trabalhador.dadosBancarios?.chave || ''
        });
        setArquivoParaExcluir({ foto: null, dossie: null }); setUploadProgress(''); setIsModalOpen(true);
    };

    const fecharModal = () => { setIsModalOpen(false); setTrabalhadorEmEdicao(null); setArquivoParaExcluir({ foto: null, dossie: null }); };
    const parseDateFromInput = (dateString) => { if (!dateString) { return null; } const date = new Date(dateString); const userTimezoneOffset = date.getTimezoneOffset() * 60000; return Timestamp.fromDate(new Date(date.getTime() + userTimezoneOffset)); };
    const dddToRegionMap = { '11': 'SP (Capital)', '12': 'SP (Vale do Paraíba)', '13': 'SP (Baixada Santista)', '14': 'SP (Bauru/Marília)', '15': 'SP (Sorocaba)', '16': 'SP (Ribeirão Preto)', '17': 'SP (São José do Rio Preto)', '18': 'SP (Presidente Prudente)', '19': 'SP (Campinas)', '21': 'RJ (Capital)', '22': 'RJ (Norte Fluminense)', '24': 'RJ (Serra/Sul Fluminense)', '27': 'ES (Vitória e Região)', '28': 'ES (Sul)', '31': 'MG (Belo Horizonte)', '32': 'MG (Juiz de Fora)', '33': 'MG (Governador Valadares)', '34': 'MG (Uberlândia)', '35': 'MG (Sul de Minas)', '37': 'MG (Centro-Oeste)', '38': 'MG (Norte de Minas)', '41': 'PR (Curitiba)', '42': 'PR (Ponta Grossa)', '43': 'PR (Londrina)', '44': 'PR (Maringá)', '45': 'PR (Foz do Iguaçu)', '46': 'PR (Sudoeste)', '47': 'SC (Joinville/Itajaí)', '48': 'SC (Florianópolis)', '49': 'SC (Oeste)', '51': 'RS (Porto Alegre)', '53': 'RS (Pelotas)', '54': 'RS (Caxias do Sul)', '55': 'RS (Central)', '61': 'DF (Brasília)', '62': 'GO (Goiânia)', '63': 'TO (Palmas)', '64': 'GO (Sudoeste)', '65': 'MT (Cuiabá)', '66': 'MT (Norte)', '67': 'MS (Campo Grande)', '68': 'AC (Rio Branco)', '69': 'RO (Porto Velho)', '71': 'BA (Salvador)', '73': 'BA (Sul)', '74': 'BA (Juazeiro)', '75': 'BA (Feira de Santana)', '77': 'BA (Oeste)', '79': 'SE (Aracaju)', '81': 'PE (Recife)', '82': 'AL (Maceió)', '83': 'PB (João Pessoa)', '84': 'RN (Natal)', '85': 'CE (Fortaleza)', '86': 'PI (Teresina)', '87': 'PE (Sertão)', '88': 'CE (Interior)', '89': 'PI (Sudeste)', '91': 'PA (Belém)', '92': 'AM (Manaus)', '93': 'PA (Oeste)', '94': 'PA (Sudeste)', '95': 'RR (Boa Vista)', '96': 'AP (Macapá)', '97': 'AM (Sudoeste)', '98': 'MA (São Luís)', '99': 'MA (Sul)'};
    const getRegionFromDDD = (phone) => { if (!phone || typeof phone !== 'string') return 'Não identificado'; const justNumbers = phone.replace(/\D/g, ''); if (justNumbers.length < 2) return 'Não identificado'; const ddd = justNumbers.substring(0, 2); return dddToRegionMap[ddd] || 'Outra Região'; };
    const handleRemoverArquivo = (tipoArquivo) => { const urlParaExcluir = formData[tipoArquivo]; if (urlParaExcluir) { setArquivoParaExcluir(prevState => ({ ...prevState, [tipoArquivo.replace('URL', '')]: urlParaExcluir })); setFormData(prevState => ({ ...prevState, [tipoArquivo]: '' })); } };
    const excluirArquivoDoStorage = async (urlDoArquivo) => { if (!urlDoArquivo) return; try { const fileRef = ref(storage, urlDoArquivo); await deleteObject(fileRef); } catch (error) { if (error.code !== 'storage/object-not-found') { console.error("Erro ao excluir arquivo antigo: ", error); } } };
    const handleImageUpload = async (e) => { const file = e.target.files[0]; if (!file) return; if (formData.fotoURL) { handleRemoverArquivo('fotoURL'); } setUploadProgress('Comprimindo...'); try { const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 800 }); setUploadProgress('Enviando...'); const storageRef = ref(storage, `fotos_chapas/${Date.now()}_${compressedFile.name}`); const snapshot = await uploadBytes(storageRef, compressedFile); const downloadURL = await getDownloadURL(snapshot.ref); setFormData(prevState => ({ ...prevState, fotoURL: downloadURL })); setUploadProgress('Foto enviada!'); } catch (error) { console.error("Erro no upload: ", error); } };
    const handleDossieUpload = async (e) => { const file = e.target.files[0]; if (!file) return; if (formData.dossieURL) { handleRemoverArquivo('dossieURL'); } setUploadProgress('Enviando...'); try { const storageRef = ref(storage, `dossies_chapas/${Date.now()}_${file.name}`); const snapshot = await uploadBytes(storageRef, file); const downloadURL = await getDownloadURL(snapshot.ref); setFormData(prevState => ({ ...prevState, dossieURL: downloadURL })); setUploadProgress('Dossiê enviado!'); } catch (error) { console.error("Erro no upload: ", error); } };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault(); setUploadProgress('Validando dados...');
        if (!formData.cpf) { alert('Erro: O campo CPF é obrigatório.'); setUploadProgress(''); return; }
        const q = query(chapasCollectionRef, where("cpf", "==", formData.cpf));
        const querySnapshot = await getDocs(q);
        let isDuplicate = false;
        if (!querySnapshot.empty) {
            if (trabalhadorEmEdicao) {
                querySnapshot.forEach((doc) => { if (doc.id !== trabalhadorEmEdicao.id) { isDuplicate = true; } });
            } else { isDuplicate = true; }
        }
        if (isDuplicate) { alert('Erro: Já existe um trabalhador cadastrado com este CPF.'); setUploadProgress(''); return; }
        if (trabalhadorEmEdicao) { await handleUpdateChapa(); } else { await handleCreateChapa(); }
    };
    
    const prepararDadosParaSalvar = () => {
        const { tipoChavePix, chavePix, ...restoDoForm } = formData;
        const dataNascimentoTS = parseDateFromInput(restoDoForm.dataNascimento);
        const dadosBase = { ...restoDoForm, dataNascimento: dataNascimentoTS, regiao: getRegionFromDDD(restoDoForm.telefone), };
        if (chavePix && tipoChavePix) { dadosBase.dadosBancarios = { tipoChave: tipoChavePix, chave: chavePix }; } 
        else { dadosBase.dadosBancarios = null; }
        return dadosBase;
    };

    const handleCreateChapa = async () => { if (!formData.nomeCompleto) { return; } setUploadProgress('Salvando...'); try { await excluirArquivoDoStorage(arquivoParaExcluir.foto); await excluirArquivoDoStorage(arquivoParaExcluir.dossie); const dadosParaSalvar = { ...prepararDadosParaSalvar(), dataImportacao: Timestamp.now() }; await addDoc(chapasCollectionRef, dadosParaSalvar); fecharModal(); fetchChapas(); } catch (error) { console.error("Erro ao criar: ", error); } finally { setUploadProgress(''); } };
    const handleUpdateChapa = async () => { if (!trabalhadorEmEdicao?.id) return; setUploadProgress('Atualizando...'); try { await excluirArquivoDoStorage(arquivoParaExcluir.foto); await excluirArquivoDoStorage(arquivoParaExcluir.dossie); const dadosParaAtualizar = prepararDadosParaSalvar(); const docRef = doc(db, "chapas_b2b", trabalhadorEmEdicao.id); await updateDoc(docRef, dadosParaAtualizar); fecharModal(); fetchChapas(); } catch (error) { console.error("Erro ao atualizar: ", error); } finally { setUploadProgress(''); } };
    const abrirModalExclusao = (trabalhador) => { setTrabalhadorParaExcluir(trabalhador); setShowDeleteConfirm(true); };
    const fecharModalExclusao = () => { setTrabalhadorParaExcluir(null); setShowDeleteConfirm(false); };
    const handleExcluirTrabalhador = async () => { if (!trabalhadorParaExcluir) return; await excluirArquivoDoStorage(trabalhadorParaExcluir.fotoURL); await excluirArquivoDoStorage(trabalhadorParaExcluir.dossieURL); try { await deleteDoc(doc(db, "chapas_b2b", trabalhadorParaExcluir.id)); fecharModalExclusao(); fetchChapas(); } catch (error) { console.error("Erro ao excluir: ", error); } };
    const triggerFileImport = () => { fileInputRef.current.click(); };
    const formatarTelefoneImportado = (tel) => { return tel; };
    const handleFileImport = (e) => { const file = e.target.files[0]; if (!file) return; setImportStatus('Lendo arquivo...'); Papa.parse(file, { header: true, skipEmptyLines: true, complete: async (results) => { setImportStatus(`Encontrados ${results.data.length} registros. Processando...`); const batch = writeBatch(db); results.data.forEach((row) => { const dataNascimentoTS = row['Data de Nascimento'] ? parseDateFromInput(row['Data de Nascimento'].split('/').reverse().join('-')) : null; const telefoneFormatado = row.Telefone ? formatarTelefoneImportado(row.Telefone) : ''; const chapaData = { nomeCompleto: row.Nome || '', cpf: row.CPF || '', telefone: telefoneFormatado, status: 'Disponível', dataNascimento: dataNascimentoTS, regiao: getRegionFromDDD(telefoneFormatado), dataImportacao: Timestamp.now(), fotoURL: '', dossieURL: '' }; const docRef = doc(collection(db, "chapas_b2b")); batch.set(docRef, chapaData); }); try { await batch.commit(); setImportStatus(`Sucesso! ${results.data.length} trabalhadores importados.`); fetchChapas(); } catch (error) { setImportStatus('Erro ao importar.'); console.error("Erro na importação: ", error); } } }); };
    
    const getPixMask = () => {
        switch (formData.tipoChavePix) {
            case 'CPF': return '000.000.000-00';
            case 'Telefone': return '(00) 00000-0000';
            default: return undefined;
        }
    };
    
    return (
        <div>
            <div className="gestao-header">
                <div>
                    <div className="title-with-counter">
                        <h1 className="gestao-title">Gestão de Trabalhadores</h1>
                        {!isLoading && <span className="total-counter"> <Users size={16} /> {chapas.length} Perfis Cadastrados </span> }
                    </div>
                    <p className="gestao-subtitle">Adicione e gerencie os Chapas de elite disponíveis para seus clientes.</p>
                </div>
                <div className="action-buttons-group">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} />
                    <button className="import-button-csv" onClick={triggerFileImport}> <Upload size={20} /> Importar via Planilha </button>
                    <button className="import-button" onClick={abrirModalCriacao}> <PlusCircle size={20} /> Adicionar Manualmente </button>
                </div>
            </div>
            
            {importStatus && <p className="import-status-feedback">{importStatus}</p>}
            <div className="filtro-container"> <input type="text" placeholder="Buscar por Nome, CPF ou RG..." className="filtro-input" value={filtro} onChange={(e) => setFiltro(e.target.value)} /> </div>

            <div className="table-container">
                <table className="talentos-table">
                    <thead>
                        <tr>
                            <th>Trabalhador</th>
                            <th>Status</th>
                            <th>Telefone / Região</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Carregando trabalhadores...</td></tr>
                        ) : chapasFiltrados.length > 0 ? (
                            chapasFiltrados.map((chapa) => (
                                <tr key={chapa.id}>
                                    <td> <div className="user-cell"> <div className="user-avatar"> {chapa.fotoURL ? <img src={chapa.fotoURL} alt={chapa.nomeCompleto} className="avatar-image"/> : <User size={18} />} </div> <div> <span className="user-name">{chapa.nomeCompleto}</span> <span className="user-cpf">{chapa.cpf}</span> </div> </div> </td>
                                    <td> <span className={`status-badge status-${(chapa.status || 'disponível').toLowerCase().replace(/ /g,'-')}`}> {chapa.status} </span> </td>
                                    <td> <div className="contact-cell"> <span>{chapa.telefone}</span> <span className="region-tag">{chapa.regiao}</span> </div> </td>
                                    <td> <div className='acoes-cell'> <button className="action-button-details" title={chapa.dossieURL ? "Ver Dossiê" : "Dossiê não disponível"} onClick={() => chapa.dossieURL && window.open(chapa.dossieURL, '_blank', 'noopener,noreferrer')} disabled={!chapa.dossieURL}> <FileText size={18} /> </button> <button className="action-button-edit" title="Editar Perfil" onClick={() => abrirModalEdicao(chapa)}> <Edit size={18} /> </button> <button className="action-button-delete" title="Excluir Perfil" onClick={() => abrirModalExclusao(chapa)}> <Trash2 size={18} /> </button> </div> </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum trabalhador encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={fecharModal} title={trabalhadorEmEdicao ? "Editar Dados do Trabalhador" : "Adicionar Novo Trabalhador"}>
                <form onSubmit={handleFormSubmit} className="modal-form">
                    <div className="form-section">
                         <div className="input-group"> <label htmlFor="nomeCompleto">Nome Completo</label> <input id="nomeCompleto" name="nomeCompleto" type="text" value={formData.nomeCompleto} onChange={handleInputChange} required /> </div>
                        <div className="form-row">
                            <div className="input-group"> <label htmlFor="cpf">CPF</label> <IMaskInput mask="000.000.000-00" id="cpf" name="cpf" value={formData.cpf} onAccept={(value) => handleInputChange({target: {name: 'cpf', value}})} required /> </div>
                            <div className="input-group"> <label htmlFor="rg">RG</label> <IMaskInput mask="00.000.000-0" id="rg" name="rg" value={formData.rg} onAccept={(value) => handleInputChange({target: {name: 'rg', value}})} /> </div>
                        </div>
                        <div className="form-row">
                            <div className="input-group"> <label htmlFor="telefone">Telefone</label> <IMaskInput mask="(00) 00000-0000" id="telefone" name="telefone" value={formData.telefone} onAccept={(value) => handleInputChange({target: {name: 'telefone', value}})} required/> </div>
                            <div className="input-group"> <label htmlFor="dataNascimento">Data de Nascimento</label> <input type="date" id="dataNascimento" name="dataNascimento" value={formData.dataNascimento} onChange={handleInputChange} /> </div>
                        </div>
                    </div>
                    
                    <div className="form-section">
                        <h3 className="form-section-title"> <Banknote size={20} /> Dados de Pagamento (PIX) </h3>
                        <div className="form-row">
                            <div className="input-group">
                                <label htmlFor="tipoChavePix">Tipo de Chave</label>
                                <select id="tipoChavePix" name="tipoChavePix" value={formData.tipoChavePix} onChange={handleInputChange}>
                                    <option value="">Nenhum</option>
                                    <option value="CPF">CPF</option>
                                    <option value="Telefone">Celular</option>
                                    <option value="E-mail">E-mail</option>
                                    <option value="Aleatória">Chave Aleatória</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label htmlFor="chavePix">Chave PIX</label>
                                <IMaskInput mask={getPixMask()} id="chavePix" name="chavePix" value={formData.chavePix} onAccept={(value) => handleInputChange({target: {name: 'chavePix', value}})} disabled={!formData.tipoChavePix} placeholder={!formData.tipoChavePix ? 'Selecione um tipo de chave' : ''} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <div className="input-group"> <label htmlFor="status">Status</label> <select id="status" name="status" value={formData.status} onChange={handleInputChange}> <option value="Disponível">Disponível</option> <option value="Em Serviço">Em Serviço</option> <option value="De Férias">De Férias</option> <option value="Bloqueado">Bloqueado</option> </select> </div>
                        <div className="upload-section">
                            <div className="upload-item">
                                <label htmlFor="fotoUpload" className="upload-button"> <Camera size={18}/> {formData.fotoURL ? 'Alterar Foto' : 'Carregar Foto'} </label>
                                <input id="fotoUpload" type="file" accept="image/*" onChange={handleImageUpload} style={{display: 'none'}}/>
                                {formData.fotoURL && (<div className="file-feedback"> <img src={formData.fotoURL} alt="Preview" className="upload-preview"/> <button type="button" onClick={() => handleRemoverArquivo('fotoURL')} className="remove-file-btn"><XCircle size={16}/></button> </div>)}
                            </div>
                            <div className="upload-item">
                                <label htmlFor="dossieUpload" className="upload-button"> <Paperclip size={18}/> {formData.dossieURL ? 'Alterar Dossiê' : 'Carregar Dossiê'} </label>
                                <input id="dossieUpload" type="file" accept=".pdf" onChange={handleDossieUpload} style={{display: 'none'}}/>
                                {formData.dossieURL && (<div className="file-feedback"> <span>PDF Carregado</span> <button type="button" onClick={() => handleRemoverArquivo('dossieURL')} className="remove-file-btn"><XCircle size={16}/></button> </div>)}
                            </div>
                        </div>
                    </div>
                    {uploadProgress && <p className="upload-progress-feedback">{uploadProgress}</p>}
                    <div className="form-actions">
                        <button type="button" className="cancel-button" onClick={fecharModal}>Cancelar</button>
                        <button type="submit" className="add-button">{trabalhadorEmEdicao ? "Salvar Alterações" : "Salvar Trabalhador"}</button>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal isOpen={showDeleteConfirm} onClose={fecharModalExclusao} onConfirm={handleExcluirTrabalhador} title="Confirmar Exclusão">
                <p>Você tem certeza que deseja excluir o trabalhador <strong>{trabalhadorParaExcluir?.nomeCompleto}</strong>?</p> <p>Esta ação não pode ser desfeita.</p>
            </ConfirmationModal>
        </div>
    );
}

export default GestaoDeTalentosPage;