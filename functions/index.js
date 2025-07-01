const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

const accountSid = process.env.TWILIO_ACCOUNTSID;
const authToken = process.env.TWILIO_AUTHTOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONENUMBER;

const client = twilio(accountSid, authToken);

exports.enviarConviteOS = onCall(
  {
    secrets: ["TWILIO_ACCOUNTSID", "TWILIO_AUTHTOKEN", "TWILIO_PHONENUMBER"],
    cors: [/localhost:\d+$/, "https://chapa-amigo-empresas.web.app"],
  },
  async (request) => {
    // ===================================================================
    // A LINHA DE INVESTIGAÇÃO FINAL ESTÁ AQUI
    logger.info("Dados recebidos pela função no servidor:", request.data);
    // ===================================================================

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
    }

    const { telefoneChapa, nomeChapa, nomeEmpresa, localServico } = request.data;
    if (!telefoneChapa || !nomeChapa || !nomeEmpresa || !localServico) {
      throw new HttpsError("invalid-argument", "Dados insuficientes para enviar o convite.");
    }

    const numeroLimpo = String(telefoneChapa).replace(/\D/g, "");
    const numeroFormatado = `+55${numeroLimpo}`;
    const mensagem = `Olá ${nomeChapa}, a ${nomeEmpresa} tem um serviço para você! Local: ${localServico}. Responda "ACEITO" ou "REJEITO". - Plataforma Chapa Amigo`;

    try {
      const message = await client.messages.create({
        to: numeroFormatado,
        from: twilioPhoneNumber,
        body: mensagem,
      });

      logger.info(`Mensagem enviada com sucesso para ${numeroFormatado}! SID: ${message.sid}`, { structuredData: true });
      return { success: true, messageSid: message.sid };

    } catch (error) {
      logger.error(`Erro ao enviar mensagem para ${numeroFormatado}:`, error, { structuredData: true });
      throw new HttpsError("internal", "Falha ao enviar o SMS.", error);
    }
  }
);