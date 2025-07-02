const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

// ===================================================================
// FUNÇÃO PÚBLICA PARA EXIBIR DETALHES DA OS (V3 - DADOS CORRIGIDOS E LAYOUT)
// ===================================================================
exports.exibirDetalhesOS = onRequest({ cors: true }, async (req, res) => {
    logger.info("Acessando página de detalhes da OS", { query: req.query });

    const osId = req.query.id;
    if (!osId) {
        res.status(400).send("Falta o parâmetro 'id' da OS na URL.");
        return;
    }

    try {
        const db = admin.firestore();
        const osDoc = await db.collection("solicitacoes").doc(osId).get();

        if (!osDoc.exists) {
            res.status(404).send("Ordem de Serviço não encontrada.");
            return;
        }

        const osData = osDoc.data();
        const twilioWhatsAppNumber = "14155238886";
        const faviconUrl = "https://firebasestorage.googleapis.com/v0/b/chapa-amigo-empresas.firebasestorage.app/o/logochapa.svg?alt=media&token=6a711c34-61ca-4370-9f21-12dbb904f458"; // Lembre-se de colar sua URL pública aqui

        const mensagemAceite = `ACEITAR-${osId}`;
        const mensagemRecusa = `RECUSAR-${osId}`;

        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Convite de Serviço</title>
                <link rel="icon" href="${faviconUrl}">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f4f4f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; box-sizing: border-box; }
                    .card { background-color: white; border-radius: 12px; box-shadow: 0 4px_20px rgba(0,0,0,0.12); padding: 24px; width: 100%; max-width: 450px; text-align: center; }
                    h1 { color: #333; font-size: 22px; margin-bottom: 8px; }
                    h2 { color: #555; font-size: 16px; margin-top: 0; margin-bottom: 24px; font-weight: normal; }
                    .details-grid { display: grid; grid-template-columns: 1fr; gap: 14px; text-align: left; }
                    .detail-item { padding: 10px; border-radius: 6px; background-color: #f9f9f9; }
                    .label { font-weight: bold; color: #333; display: block; margin-bottom: 4px; font-size: 12px; text-transform: uppercase;}
                    .value { color: #444; font-size: 16px; }
                    .actions { margin-top: 32px; display: flex; flex-direction: column; gap: 12px; }
                    a.button { text-decoration: none; color: white; padding: 16px; border-radius: 8px; font-weight: bold; font-size: 18px; display: block; transition: transform 0.2s; }
                    a.button:active { transform: scale(0.98); }
                    .accept { background-color: #28a745; }
                    .reject { background-color: #dc3545; }
                </style>
            </head>
            <body>
                <div class="card">
                    <img src="${faviconUrl}" alt="Logo Chapa Amigo" style="max-width: 150px; margin-bottom: 24px;">
                    <h1>Convite de Serviço</h1>
                    
                    <div class="details-grid">
                        <div class="detail-item"><span class="label">Empresa Contratante</span> <span class="value">${osData.cliente || "Não informado"}</span></div>
                        <div class="detail-item"><span class="label">Descrição do Serviço</span> <span class="value">${osData.descricao || "Não informado"}</span></div>
                        <div class="detail-item"><span class="label">Local</span> <span class="value">${osData.local || "Não informado"}</span></div>
                        <div class="detail-item"><span class="label">Valor</span> <span class="value">R$ ${osData.valorProposto || "Não informado"}</span></div>
                        <div class="detail-item"><span class="label">Tipo da Carga</span> <span class="value">${osData.tipoCarga || "Não informado"}</span></div>
                    </div>
                    
                    <div class="actions">
                        <a href="https://wa.me/${twilioWhatsAppNumber}?text=${encodeURIComponent(mensagemAceite)}" class="button accept">✅ ACEITAR</a>
                        <a href="https://wa.me/${twilioWhatsAppNumber}?text=${encodeURIComponent(mensagemRecusa)}" class="button reject">❌ RECUSAR</a>
                    </div>
                </div>
            </body>
            </html>
        `;
        res.status(200).send(html);
    } catch (error) {
        logger.error("Erro ao gerar página de detalhes da OS:", error);
        res.status(500).send("Ocorreu um erro ao buscar os detalhes do serviço.");
    }
});


// ===================================================================
// FUNÇÃO DE ENVIO DE CONVITE (PARA WHATSAPP SANDBOX)
// ===================================================================
exports.enviarConviteOS = onCall(
  {
    secrets: ["TWILIO_ACCOUNTSID", "TWILIO_AUTHTOKEN"],
    cors: [/localhost:\d+$/, "https://chapa-amigo-empresas.web.app"],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
    }

    const { telefoneChapa, nomeChapa, idOS, chapaId, nomeEmpresa } = request.data;
    const accountSid = process.env.TWILIO_ACCOUNTSID;
    const authToken = process.env.TWILIO_AUTHTOKEN;
    const client = twilio(accountSid, authToken);
    
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
        nomeChapa: nomeChapa, // Guardando o nome do chapa para uso posterior
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
        from: 'whatsapp:+14155238886',
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
// FUNÇÃO DE RECEBIMENTO DE RESPOSTA (V4 - CORREÇÃO DE CASE SENSITIVE)
// ===================================================================
exports.receberRespostaChapa = onRequest(async (req, res) => {
    const { From, Body } = req.body;
    logger.info(`Nova resposta de ${From}: "${Body}"`);
    
    // NÃO convertemos para maiúsculas aqui
    const respostaLimpa = Body.trim();
    const db = admin.firestore();

    const partes = respostaLimpa.split('-');
    if (partes.length !== 2) {
        logger.warn(`Formato de resposta inválido de ${From}: "${Body}". Ignorando.`);
        res.status(200).send("<Response/>");
        return;
    }

    // Convertemos SÓ a ação para maiúsculas, o ID permanece original
    const acao = partes[0].toUpperCase(); 
    const osId = partes[1]; // Mantém o ID com sua caixa original (ex: pggNGALy...)

    const telefoneRemetente = From.replace('whatsapp:', '');

    try {
        const convitesRef = db.collection("convites");
        // A query agora usará o osId com a caixa correta
        const snapshot = await convitesRef
            .where("osId", "==", osId) 
            .where("telefoneChapa", "==", telefoneRemetente)
            .where("status", "==", "pendente")
            .limit(1)
            .get();

        if (snapshot.empty) {
            logger.warn(`Nenhum convite pendente encontrado para o número ${telefoneRemetente} e OS ${osId}. A resposta pode ser duplicada ou o convite já foi processado.`);
            const twimlJaRespondido = new twilio.twiml.MessagingResponse();
            twimlJaRespondido.message('Obrigado! Já recebemos sua resposta para este convite.');
            res.writeHead(200, { 'Content-Type': 'text/xml' });
            res.end(twimlJaRespondido.toString());
            return;
        }

        const conviteDoc = snapshot.docs[0];
        const conviteData = conviteDoc.data();
        
        if (acao === "ACEITAR") {
            logger.info(`Chapa ${conviteData.chapaId} ACEITOU o convite ${conviteDoc.id} para a OS ${osId}. Realizando alocação...`);
            
            const batch = db.batch();
            
            const docConviteRef = db.collection("convites").doc(conviteDoc.id);
            batch.update(docConviteRef, { status: "aceito", dataResposta: admin.firestore.FieldValue.serverTimestamp() });
            
            const osRef = db.collection("solicitacoes").doc(osId);
            batch.update(osRef, { 
                status: "confirmado",
                chapaAlocadoId: conviteData.chapaId,
                chapaAlocadoNome: conviteData.nomeChapa
            });

            const chapaRef = db.collection("chapas_b2b").doc(conviteData.chapaId);
            batch.update(chapaRef, { status: 'Em Serviço' });
            
            await batch.commit();
            logger.info(`Alocação da OS ${osId} concluída com sucesso.`);

        } else if (acao === "RECUSAR") {
            // ... (lógica de recusa) ...
        } 
        
        // Responde com a mensagem de sucesso que agora será alcançada!
        const twimlSucesso = new twilio.twiml.MessagingResponse();
        twimlSucesso.message('Sua resposta foi registrada. A plataforma Chapa Amigo agradece a sua atenção.');
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twimlSucesso.toString());

    } catch (error) {
        logger.error("Erro ao processar resposta da Twilio:", error);
        res.status(500).send("Internal Server Error");
    }
});