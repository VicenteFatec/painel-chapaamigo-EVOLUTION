import React from 'react';
import './CartaoOS.css';
import { User, Hash, Briefcase, Info, AlertTriangle, Building2 } from 'lucide-react';
import * as QRCode from 'qrcode.react';

const formatarDocumento = (doc, tipo) => {
    if (!doc) return 'N/A';
    if (tipo === 'cpf') {
        return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
    }
    if (tipo === 'rg') {
        return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{1})/, "$1.***.***-$4");
    }
    return doc;
};

function CartaoOS({ solicitacao, trabalhador }) {
    if (!solicitacao) {
        return <div className="cartao-os-loading">Carregando dados do Ticket...</div>;
    }

    const qrCodeValue = `https://verificar.chapaamigo.com.br/servico/${solicitacao.id}`;
    const QRCodeComponent = QRCode.QRCodeSVG;
    const numeroOSDinamico = `OS-${solicitacao.id.slice(-6).toUpperCase()}`;

    if (!QRCodeComponent) {
        return <div>Erro ao carregar o componente de QR Code.</div>;
    }

    const nomeTrabalhador = trabalhador?.nomeCompleto || solicitacao.chapaAlocadoNome || 'Trabalhador não informado';
    const fotoTrabalhador = trabalhador?.fotoURL;

    return (
        <div id="cartao-os-para-exportar" className="cartao-os-container">
            <header className="cartao-os-header">
                <h2>TICKET DE SERVIÇO</h2>
                <div className="cartao-os-os">
                    <Hash size={16} />
                    <span>{numeroOSDinamico}</span>
                </div>
            </header>

            <section className="cartao-os-secao-solicitante">
                <div className="solicitante-icone"><Building2 size={40} /></div>
                <div className="solicitante-info">
                    <span className="solicitante-label">SOLICITADO POR</span>
                    <h3 className="solicitante-nome">{solicitacao?.cliente || 'Cliente não informado'}</h3>
                </div>
            </section>

            <section className="cartao-os-secao-trabalhador">
                <div className="trabalhador-avatar">
                    {fotoTrabalhador ? (
                        <img src={fotoTrabalhador} alt={nomeTrabalhador} />
                    ) : (
                        <User size={60} />
                    )}
                </div>
                <div className="trabalhador-info">
                    <span className="trabalhador-label">Trabalhador</span>
                    <h3 className="trabalhador-nome">{nomeTrabalhador}</h3>
                    {trabalhador && (
                        <div className="trabalhador-docs">
                            <span><strong>CPF:</strong> {formatarDocumento(trabalhador.cpf, 'cpf')}</span>
                            <span><strong>RG:</strong> {formatarDocumento(trabalhador.rg, 'rg')}</span>
                        </div>
                    )}
                </div>
            </section>

            <section className="cartao-os-secao">
                <h4><Briefcase size={14} /> Detalhes da Operação</h4>
                <div className="detalhe-item-cartao-os">
                    <span className="detalhe-label">LOCAL DE APRESENTAÇÃO</span>
                    <p>{solicitacao?.endereco?.logradouro ? `${solicitacao.endereco.logradouro}, ${solicitacao.endereco.numero} - ${solicitacao.endereco.bairro}` : 'Não informado'}</p>
                </div>
                <div className="detalhe-item-cartao-os">
                    <span className="detalhe-label">DESCRIÇÃO DO SERVIÇO</span>
                    <p>{solicitacao?.descricaoServico || 'Não informado'}</p>
                </div>
            </section>

            <section className="cartao-os-secao">
                <h4><Info size={14} /> Requisitos e Equipamentos (EPIs)</h4>
                <p className="requisitos-texto-cartao-os">{solicitacao?.requisitos || 'Nenhum requisito específico.'}</p>
            </section>

            {solicitacao?.advertencia && (
                <section className="cartao-os-secao advertencia">
                    <h4><AlertTriangle size={14} /> Advertência Importante</h4>
                    <p>{solicitacao.advertencia}</p>
                </section>
            )}
            
            <footer className="cartao-os-footer">
                <div className="qr-code-placeholder">
                    {/* ===== QR CODE OTIMIZADO CONFORME O PLANO ===== */}
                    <QRCodeComponent 
                        value={qrCodeValue} 
                        size={60} 
                        bgColor={"#ffffff"}
                        fgColor={"#000000"}
                        level={"M"}
                    />
                </div>
                <div className="plataforma-info">
                    <span>Operação gerenciada pela</span>
                    <p>Plataforma Chapa Amigo</p>
                </div>
            </footer>
        </div>
    );
}

export default CartaoOS;