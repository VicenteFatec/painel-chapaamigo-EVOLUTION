// ===================================================================
// ARQUIVO FINAL CORRIGIDO E MODERNIZADO - Válido para 04/07/2025
// ===================================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");
const axios = require("axios");

// CORREÇÃO #2: Importa a função v2 para gatilhos do Firestore
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const { defineString } = require('firebase-functions/params');

admin.initializeApp();

// DEFINIÇÃO DOS SEGREDOS COMO PARÂMETROS
const twilioAccountSid = defineString("TWILIO_ACCOUNTSID");
const twilioAuthToken = defineString("TWILIO_AUTHTOKEN");
const twilioPhoneNumber = defineString("TWILIO_PHONE_NUMBER");
// CORREÇÃO #1: Nome do segredo corrigido para o padrão do Firebase
const googleMapsApiKey = defineString("MAPS_API_KEY");


// ===================================================================
// FUNÇÃO DE EXIBIÇÃO DE CONVITE (SEM ALTERAÇÕES)
// ===================================================================
exports.exibirDetalhesOS = onRequest({ cors: true }, async (req, res) => {
    logger.info("Acessando página de detalhes da OS", { query: req.query });

    const osId = req.query.id;
    if (!osId) {
        return res.status(400).send("Falta o parâmetro 'id' da OS na URL.");
    }

    try {
        const db = admin.firestore();
        const osDoc = await db.collection("solicitacoes").doc(osId).get();

        if (!osDoc.exists) {
            return res.status(404).send("Ordem de Serviço não encontrada.");
        }

        const osData = osDoc.data();
        const dataSolicitacao = osData.dataSolicitacao.toDate();
        const dataExpiracao = new Date(dataSolicitacao.getTime() + 15 * 60000);
        const agora = new Date();

        if (agora > dataExpiracao) {
            const htmlExpirado = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Convite Expirado</title><style>body{font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f9; display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; color: #333;} .card{background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);}</style></head><body><div class="card"><h1>Convite Expirado</h1><p>Desculpe, mas este convite expirou às ${dataExpiracao.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}.</p><p>Mantenha-se ligado e não perca as próximas oportunidades!</p></div></body></html>`;
            return res.status(410).send(htmlExpirado);
        }
        
        const twilioWhatsAppNumber = "14155238886";
        const faviconUrl = "https://firebasestorage.googleapis.com/v0/b/chapa-amigo-empresas.firebasestorage.app/o/logochapa.svg?alt=media&token=6a711c34-61ca-4370-9f21-12dbb904f458";
        const mensagemAceite = `ACEITAR-${osId}`;
        const mensagemRecusa = `RECUSAR-${osId}`;
        
        const valorFormatado = typeof osData.valorServicoBruto === 'number' ? osData.valorServicoBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "Não informado";
        const localFormatado = osData.endereco ? `${osData.endereco.logradouro}, ${osData.endereco.numero} - ${osData.endereco.bairro}, ${osData.endereco.cidade}` : "Não informado";

        const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Convite de Serviço</title><link rel="icon" href="${faviconUrl}"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;margin:0;background-color:#f4f4f9;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:16px;box-sizing:border-box}.card{background-color:#fff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.12);padding:24px 32px;width:100%;max-width:450px;text-align:center;transition:all .3s ease}h1{color:#333;font-size:22px;margin-bottom:8px}.details-grid{display:grid;grid-template-columns:1fr;gap:16px;text-align:left;margin-top:24px}.detail-item{padding-bottom:12px;border-bottom:1px solid #eee}.label{font-weight:600;color:#555;display:block;margin-bottom:4px;font-size:13px}.value{color:#111;font-size:16px}.actions{margin-top:32px;display:flex;flex-direction:column;gap:12px}a.button{text-decoration:none;color:#fff;padding:16px;border-radius:8px;font-weight:700;font-size:18px;display:block;transition:transform .2s,background-color .2s}a.button:active{transform:scale(.97)}.accept{background-color:#28a745}.accept:hover{background-color:#218838}.reject{background-color:#dc3545}.reject:hover{background-color:#c82333}.footer-note{font-size:12px;color:#888;margin-top:24px}</style></head><body><div class="card" id="invitation-card"><img src="${faviconUrl}" alt="Logo da Empresa" style="max-width:150px;margin-bottom:16px"><h1>Convite de Serviço</h1><div class="details-grid"><div class="detail-item"><span class="label">Empresa</span> <span class="value">${osData.cliente||"Não informado"}</span></div><div class="detail-item"><span class="label">Descrição</span> <span class="value">${osData.descricaoServico||"Não informado"}</span></div><div class="detail-item"><span class="label">Local</span> <span class="value">${localFormatado}</span></div><div class="detail-item"><span class="label">Valor</span> <span class="value">${valorFormatado}</span></div></div><div class="actions"><a href="https://wa.me/${twilioWhatsAppNumber}?text=${encodeURIComponent(mensagemAceite)}" class="button accept">✅ ACEITAR</a><a href="https://wa.me/${twilioWhatsAppNumber}?text=${encodeURIComponent(mensagemRecusa)}" class="button reject">❌ RECUSAR</a></div><p class="footer-note">Este convite expira às ${dataExpiracao.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.</p></div></body></html>`;
        return res.status(200).send(html);
    } catch (error) {
        logger.error("Erro ao gerar página de detalhes da OS:", error);
        return res.status(500).send("Ocorreu um erro ao buscar os detalhes do serviço.");
    }
});


// ===================================================================
// FUNÇÃO DE RECEBIMENTO DE RESPOSTA (SEM ALTERAÇÕES)
// ===================================================================
exports.receberRespostaChapa = onRequest(async (req, res) => {
    const { From, Body } = req.body;
    const respostaLimpa = Body.trim();
    const telefoneRemetente = From; 
    const db = admin.firestore();
    const twiml = new twilio.twiml.MessagingResponse();

    logger.info(`Nova resposta de ${telefoneRemetente}: "${respostaLimpa}"`);

    try {
        const telefoneChapaFormatado = telefoneRemetente.replace('whatsapp:', '');
        const snapshotMotivo = await db.collection("convites")
            .where("telefoneChapa", "==", telefoneChapaFormatado)
            .where("status", "==", "recusado_aguardando_motivo")
            .limit(1).get();

        if (!snapshotMotivo.empty) {
            const conviteDoc = snapshotMotivo.docs[0];
            const motivos = {
                "1": "O valor está abaixo do esperado", "2": "Indisponível no momento",
                "3": "Já estou em outro serviço",   "4": "Outro motivo"
            };
            const motivoTexto = motivos[respostaLimpa] || `Resposta inválida: ${respostaLimpa}`;
            
            await conviteDoc.ref.update({
                status: "recusado_motivo_recebido",
                motivoRecusa: motivoTexto,
            });
            
            twiml.message("Entendido. Obrigado pelo seu feedback! Ele é muito importante para nós.");
            logger.info(`Motivo da recusa (${motivoTexto}) registrado para o convite ${conviteDoc.id}.`);
        
        } else {
            const partes = respostaLimpa.split('-');
            if (partes.length !== 2) {
                logger.warn("Formato de resposta inválido. Ignorando.");
                res.status(200).send("<Response/>"); 
                return;
            }
            const acao = partes[0].toUpperCase(); 
            const osId = partes[1];

            const snapshotConvite = await db.collection("convites")
                .where("osId", "==", osId)
                .where("telefoneChapa", "==", telefoneChapaFormatado)
                .where("status", "==", "pendente")
                .limit(1).get();

            if (snapshotConvite.empty) {
                logger.warn(`Nenhum convite pendente encontrado para ${telefoneRemetente} e OS ${osId}.`);
                twiml.message('Obrigado! Já recebemos sua resposta para este convite ou ele expirou.');
            } else {
                const conviteDoc = snapshotConvite.docs[0];
                const conviteData = conviteDoc.data();
                
                if (acao === "ACEITAR") {
                    const batch = db.batch();
                    batch.update(conviteDoc.ref, { status: "aceito", dataResposta: admin.firestore.FieldValue.serverTimestamp() });
                    const osRef = db.collection("solicitacoes").doc(osId);
                    batch.update(osRef, { status: "confirmado", chapaAlocadoId: conviteData.chapaId, chapaAlocadoNome: conviteData.nomeChapa });
                    const chapaRef = db.collection("chapas_b2b").doc(conviteData.chapaId);
                    batch.update(chapaRef, { status: 'Em Serviço' });
                    await batch.commit();
                    
                    twiml.message('Sua resposta foi registrada. A plataforma Chapa Amigo agradece a sua atenção.');
                    logger.info(`Chapa ${conviteData.chapaId} ACEITOU o convite ${conviteDoc.id}.`);

                    const twilioClient = new twilio(twilioAccountSid.value(), twilioAuthToken.value());
                    
                    const baseUrl = 'https://chapa-amigo-empresas.web.app';
                    const ticketUrl = `${baseUrl}/ticket/${osId}`;
                    const mensagemTicket = `Parabéns, seu trabalho está confirmado! 👷✅\n\nBaixe seu ticket de serviço e siga as orientações:\n${ticketUrl}`;
                    
                    await twilioClient.messages.create({
                        from: `whatsapp:${twilioPhoneNumber.value()}`,
                        to: telefoneRemetente,
                        body: mensagemTicket,
                    });
                    logger.info(`Mensagem com link do ticket enviada para ${telefoneRemetente} para a OS ${osId}`);

                } else if (acao === "RECUSAR") {
                    const osRef = db.collection("solicitacoes").doc(osId);
                    await osRef.update({ status: "pendente" });
                    await conviteDoc.ref.update({ status: "recusado_aguardando_motivo" });
                    
                    twiml.message("Que pena! Para nos ajudar a melhorar, por favor, responda com o NÚMERO do motivo:\n1. O valor está abaixo do esperado\n2. Indisponível no momento\n3. Já estou em outro serviço\n4. Outro motivo");
                    logger.info(`Chapa ${conviteData.chapaId} RECUSOU o convite ${conviteDoc.id}. Perguntando o motivo.`);
                }
            }
        }
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
    } catch (error) {
        logger.error("Erro ao processar resposta da Twilio:", error);
        res.status(500).send("Internal Server Error");
    }
});


// ===================================================================
// FUNÇÃO DE ENVIO DE CONVITE
// ===================================================================
// CORREÇÃO #3: Array 'secrets' removido das opções da função
exports.enviarConviteOS = onCall(
    {
        cors: [/localhost:\d+$/, "https://chapa-amigo-empresas.web.app"]
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
        }

        const { telefoneChapa, nomeChapa, idOS, chapaId, nomeEmpresa } = request.data;
        const client = twilio(twilioAccountSid.value(), twilioAuthToken.value());
        
        if (!telefoneChapa || !nomeChapa || !idOS || !chapaId) {
            throw new HttpsError("invalid-argument", "Dados insuficientes (telefone, nome, idOS, chapaId são obrigatórios).");
        }

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

            logger.info(`Convite ${conviteRef.id} para a OS ${idOS} registrado no Firestore.`);

            const projectId = process.env.GCLOUD_PROJECT;
            const functionRegion = "us-central1";
            const linkPublico = `https://${functionRegion}-${projectId}.cloudfunctions.net/exibirDetalhesOS?id=${idOS}`;
            
            const mensagem = `Chapa Amigo: Olá ${nomeChapa}, a ${nomeEmpresa} tem um novo convite de serviço para você. Veja todos os detalhes e responda no link: ${linkPublico}`;

            await client.messages.create({
                body: mensagem,
                from: `whatsapp:${twilioPhoneNumber.value()}`,
                to:   `whatsapp:${numeroFormatado}`
            });

            logger.info(`Mensagem WhatsApp enviada para ${numeroFormatado}!`);
            return { success: true, conviteId: conviteRef.id };

        } catch (error) {
            logger.error(`Erro ao enviar WhatsApp para ${numeroFormatado}:`, error);
            throw new HttpsError("internal", "Falha ao enviar a mensagem via WhatsApp.", error);
        }
    }
);


// ===================================================================
// FUNÇÃO DE GEOCODIFICAÇÃO (MODERNIZADA PARA V2)
// ===================================================================
exports.geocodeAddressOnCreate = onDocumentCreated("solicitacoes/{solicitacaoId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.log("Nenhum dado associado ao evento. Abortando.");
        return;
    }
    
    const osData = snapshot.data();
    const osId = event.params.solicitacaoId;

    if (osData.latitude && osData.longitude) {
      logger.log(`OS ${osId} já possui coordenadas. Abortando.`);
      return;
    }

    const address = `${osData.endereco.logradouro}, ${osData.endereco.numero}, ${osData.endereco.bairro}, ${osData.endereco.cidade}, ${osData.endereco.estado}`;
    logger.log(`Iniciando geocodificação para o endereço: ${address}`);

    const apiKey = googleMapsApiKey.value();
    if (!apiKey) {
      logger.error("Chave da API do Google Maps não configurada!");
      return;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

    try {
      const response = await axios.get(url);
      const data = response.data;

      if (data.status === "OK") {
        const location = data.results[0].geometry.location;
        const latitude = location.lat;
        const longitude = location.lng;
        logger.log(`Coordenadas encontradas: Lat ${latitude}, Lng ${longitude}`);
        return snapshot.ref.update({
          latitude: latitude,
          longitude: longitude,
        });
      } else {
        logger.error(`Erro de geocodificação: ${data.status}`, data.error_message || "");
        return;
      }
    } catch (error) {
      logger.error("Erro ao chamar a API de Geocodificação:", error);
      return;
    }
});