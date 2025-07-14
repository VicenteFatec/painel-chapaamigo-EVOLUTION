// ===================================================================
// VERSÃO DE DIAGNÓSTICO 3 - 14/07/2025
// OBJETIVO: Isolar o erro 20422 (Invalid Parameter).
// AÇÃO: Trocado o template para "teste_conexao", que não possui
//       variáveis, para eliminar 'contentVariables' como a causa.
// ===================================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");
const axios = require("axios");

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineString } = require('firebase-functions/params');

admin.initializeApp();

// DEFINIÇÃO DOS SEGREDOS
const twilioAccountSid = defineString("TWILIO_ACCOUNTSID");
const twilioAuthToken = defineString("TWILIO_AUTHTOKEN");
const twilioPhoneNumber = defineString("TWILIO_PHONE_NUMBER");
const googleMapsApiKey = defineString("MAPS_API_KEY");
const twilioTemplateSid = defineString("TWILIO_TEMPLATE_SID");
const twilioConfirmationTemplateSid = defineString("TWILIO_CONFIRMATION_TEMPLATE_SID");


// ===================================================================
// FUNÇÃO DE TESTE (MODIFICADA PARA USAR TEMPLATE SEM VARIÁVEIS)
// ===================================================================
exports.enviarMensagemTeste = onCall({ cors: ["http://localhost:5173", "https://chapa-amigo-empresas.web.app"] }, async (request) => {
    logger.info("DIAGNÓSTICO: Função 'enviarMensagemTeste' (Operação Mente Simples) acionada.");

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Apenas usuários autenticados podem rodar este teste.");
    }

    // Os dados do request não serão usados, mas mantemos a estrutura.
    const { telefoneDestino } = request.data;
    if (!telefoneDestino) {
        throw new HttpsError("invalid-argument", "O telefone de destino é necessário.");
    }
    
    let client;
    try {
        const accountSid = twilioAccountSid.value();
        const authToken = twilioAuthToken.value();
        client = new twilio(accountSid, authToken);
        logger.info("DIAGNÓSTICO: Cliente da Twilio inicializado com SUCESSO.");
    } catch (error) {
        logger.error("DIAGNÓSTICO: !!! FALHA CRÍTICA ao inicializar o cliente da Twilio", error);
        throw new HttpsError("internal", "Falha ao instanciar o cliente da Twilio.", error.message);
    }

    const numeroFormatado = `+55${String(telefoneDestino).replace(/\D/g, "")}`;
    
    // ================== MUDANÇA PRINCIPAL AQUI ==================
    // Usando o SID do template "teste_conexao", que não tem variáveis.
    const templateSid = "HX2041b38f8b5ca76e977d2d99f3abe71de"; 
    // ============================================================

    try {
        const from = `whatsapp:${twilioPhoneNumber.value()}`;
        const to = `whatsapp:${numeroFormatado}`;
        
        logger.info(`DIAGNÓSTICO: Preparando para enviar mensagem de [${from}] para [${to}] usando o template SIMPLES [${templateSid}]`);

        const message = await client.messages.create({
            contentSid: templateSid,
            from: from,
            to: to,
            // A linha 'contentVariables' foi removida, pois este template não as utiliza.
        });

        logger.info(`DIAGNÓSTICO: SUCESSO! Mensagem de teste simples enviada! SID: ${message.sid}`);
        return { success: true, message: "Template 'teste_conexao' enviado com sucesso!", messageId: message.sid };

    } catch (error) {
        logger.error("DIAGNÓSTICO: !!! FALHA na chamada da API da Twilio (client.messages.create).", error);
        logger.error("DIAGNÓSTICO: ERRO BRUTO DA TWILIO:", JSON.stringify(error, null, 2));
        throw new HttpsError("internal", "Falha ao enviar o template de teste simples.", { code: error.code, message: error.message, details: error.moreInfo });
    }
});


// ===================================================================
// Demais funções (sem alterações)
// ===================================================================
exports.enviarConviteOS = onCall({ cors: ["http://localhost:5173", "https://chapa-amigo-empresas.web.app"] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
    }
    const { telefoneChapa, nomeChapa, idOS, chapaId, solicitacaoData } = request.data;
    if (!telefoneChapa || !nomeChapa || !idOS || !chapaId || !solicitacaoData) {
        throw new HttpsError("invalid-argument", "Dados insuficientes.");
    }

    const client = new twilio(twilioAccountSid.value(), twilioAuthToken.value());

    const numeroFormatado = `+55${String(telefoneChapa).replace(/\D/g, "")}`;
    try {
        const db = admin.firestore();
        const conviteRef = db.collection("convites").doc();
        await conviteRef.set({
            osId: idOS,
            chapaId: chapaId,
            nomeChapa: nomeChapa,
            telefoneChapa: numeroFormatado,
            status: "pendente",
            dataEnvio: admin.firestore.FieldValue.serverTimestamp(),
        });
        const linkPublico = `https://us-central1-chapa-amigo-empresas.cloudfunctions.net/exibirDetalhesOS?id=${conviteRef.id}`;
        
        await client.messages.create({
            contentSid: twilioTemplateSid.value(),
            from: `whatsapp:${twilioPhoneNumber.value()}`,
            to: `whatsapp:${numeroFormatado}`,
            contentVariables: { '1': nomeChapa, '2': solicitacaoData.cliente, '3': linkPublico },
        });
        return { success: true, conviteId: conviteRef.id };
    } catch (error) {
        logger.error(`Erro ao enviar WhatsApp para ${numeroFormatado}:`, error);
        throw new HttpsError("internal", "Falha ao enviar a mensagem via WhatsApp.", error);
    }
});

exports.exibirDetalhesOS = onRequest({ cors: true }, async (req, res) => {
    const osId = req.query.id;
    if (!osId) { return res.status(400).send("Falta o parâmetro 'id' da OS na URL."); }

    try {
        const osDoc = await admin.firestore().collection("solicitacoes").doc(osId).get();
        if (!osDoc.exists) { return res.status(404).send("Ordem de Serviço não encontrada."); }
        
        const osData = osDoc.data();
        const nossoNumeroOficial = twilioPhoneNumber.value().replace('+', '');
        const mensagemAceite = `ACEITAR-${osId}`;
        const mensagemRecusa = `RECUSAR-${osId}`;
        
        const htmlCompleto = `
            <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Convite de Serviço</title>
            </head><body><h1>Convite para ${osData.cliente || "Serviço"}</h1><p>Clique para responder.</p>
            <a href="https://wa.me/${nossoNumeroOficial}?text=${encodeURIComponent(mensagemAceite)}">ACEITAR</a>
            <a href="https://wa.me/${nossoNumeroOficial}?text=${encodeURIComponent(mensagemRecusa)}">RECUSAR</a>
            </body></html>
        `;
        return res.status(200).send(htmlCompleto);

    } catch (error) {
        logger.error("Erro ao gerar página de detalhes da OS:", error);
        return res.status(500).send("Ocorreu um erro ao buscar os detalhes do serviço.");
    }
});

exports.receberRespostaChapa = onRequest(async (req, res) => {
    const { From, Body } = req.body;
    const respostaLimpa = Body.trim();
    const twiml = new twilio.twiml.MessagingResponse();
    
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});

exports.geocodeAddressOnCreate = onDocumentCreated("solicitacoes/{solicitacaoId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) { return; }
    
    const osData = snapshot.data();
    if (osData.latitude && osData.longitude) { return; }

    const address = `${osData.endereco.logradouro}, ${osData.endereco.numero}, ${osData.endereco.bairro}, ${osData.endereco.cidade}, ${osData.endereco.estado}`;
    const apiKey = googleMapsApiKey.value();
    if (!apiKey) { return; }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    try {
        const response = await axios.get(url);
        if (response.data.status === "OK") {
            const location = response.data.results[0].geometry.location;
            return snapshot.ref.update({ latitude: location.lat, longitude: location.lng });
        }
    } catch (error) {
        logger.error("Erro ao chamar a API de Geocodificação:", error);
    }
});
