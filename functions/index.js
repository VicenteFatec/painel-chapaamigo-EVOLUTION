const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

// ===================================================================
// FUNÇÃO PÚBLICA PARA EXIBIR DETALHES DA OS NO LINK
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
        const twilioPhoneNumber = process.env.TWILIO_PHONENUMBER;

        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Convite de Serviço</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; background-color: #f4f4f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; box-sizing: border-box; }
                    .card { background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 24px; width: 100%; max-width: 400px; text-align: center; }
                    h1 { color: #333; font-size: 24px; margin-bottom: 8px; }
                    h2 { color: #555; font-size: 18px; margin-top: 0; margin-bottom: 24px; font-weight: normal; }
                    .detail { text-align: left; margin: 12px 0; color: #444; line-height: 1.5; }
                    .label { font-weight: bold; }
                    .actions { margin-top: 32px; display: flex; flex-direction: column; gap: 12px; }
                    a.button { text-decoration: none; color: white; padding: 16px; border-radius: 8px; font-weight: bold; font-size: 18px; display: block; transition: transform 0.2s; }
                    a.button:active { transform: scale(0.98); }
                    .accept { background-color: #28a745; }
                    .reject { background-color: #dc3545; }
                </style>
            </head>
            <body>
                <div class="card">
                    <img src="https://chapaamigo.com.br/wp-content/uploads/2024/04/Logo-Chapa-Amigo-Horizontal-1.png" alt="Logo Chapa Amigo" style="max-width: 150px; margin-bottom: 16px;">
                    <h1>Convite de Serviço</h1>
                    <h2>da empresa ${osData.cliente || "Empresa Contratante"}</h2>
                    <div class="detail"><span class="label">Local:</span> ${osData.local || "Não informado"}</div>
                    <div class="detail"><span class="label">Valor:</span> R$ ${osData.valorProposto || "Não informado"}</div>
                    <div class="detail"><span class="label">Tipo da Carga:</span> ${osData.tipoCarga || "Não especificado"}</div>
                    
                    <div class="actions">
                        <a href="sms:${twilioPhoneNumber}?&body=1" class="button accept">✅ ACEITAR</a>
                        <a href="sms:${twilioPhoneNumber}?&body=2" class="button reject">❌ RECUSAR</a>
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
// FUNÇÃO DE RECEBIMENTO DE RESPOSTA (COM LÓGICA DE ALOCAÇÃO)
// ===================================================================
exports.receberRespostaChapa = onRequest(async (req, res) => {
  const { From, Body } = req.body;
  logger.info(`Nova resposta de ${From}: "${Body}"`);
  const respostaLimpa = Body.trim();
  const db = admin.firestore();

  try {
    const convitesRef = db.collection("convites");
    const snapshot = await convitesRef
      .where("telefoneChapa", "==", From)
      .where("status", "==", "pendente")
      .orderBy("dataEnvio", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      logger.warn(`Nenhum convite pendente encontrado para o número ${From}. Ignorando.`);
      const twimlVazio = new twilio.twiml.MessagingResponse();
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twimlVazio.toString());
      return;
    }

    const conviteDoc = snapshot.docs[0];
    const conviteData = conviteDoc.data();
    
    if (respostaLimpa === "1") {
        logger.info(`Chapa ${conviteData.chapaId} ACEITOU o convite ${conviteDoc.id} para a OS ${conviteData.osId}. Realizando alocação...`);
        
        const batch = db.batch();
        
        const docConviteRef = db.collection("convites").doc(conviteDoc.id);
        batch.update(docConviteRef, { status: "aceito", dataResposta: admin.firestore.FieldValue.serverTimestamp() });
        
        const osRef = db.collection("solicitacoes").doc(conviteData.osId);
        batch.update(osRef, { 
            status: "confirmado",
            chapaAlocadoId: conviteData.chapaId,
            chapaAlocadoNome: conviteData.nomeChapa
        });

        const chapaRef = db.collection("chapas_b2b").doc(conviteData.chapaId);
        batch.update(chapaRef, { status: 'Em Serviço' });
        
        await batch.commit();
        logger.info(`Alocação da OS ${conviteData.osId} concluída com sucesso.`);

    } else if (respostaLimpa === "2") {
        logger.info(`Chapa ${conviteData.chapaId} RECUSOU o convite ${conviteDoc.id}.`);
        await conviteDoc.ref.update({ status: "recusado", dataResposta: admin.firestore.FieldValue.serverTimestamp() });
    } else {
        logger.warn(`Resposta inválida recebida de ${From}: "${Body}". Nenhuma ação tomada.`);
    }

  } catch (error) {
    logger.error("Erro ao processar resposta da Twilio:", error);
    res.status(500).send("Internal Server Error");
    return;
  }

  const twiml = new twilio.twiml.MessagingResponse();
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});