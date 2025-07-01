// VERSÃO 2ª GERAÇÃO - functions/index.js

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

// As credenciais agora são lidas como "secrets" na 2ª Geração
const accountSid = process.env.TWILIO_ACCOUNTSID;
const authToken = process.env.TWILIO_AUTHTOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONENUMBER;

// Inicializa o cliente da Twilio
const client = twilio(accountSid, authToken);

exports.enviarConviteOS = onCall({ secrets: ["TWILIO_ACCOUNTSID", "TWILIO_AUTHTOKEN", "TWILIO_PHONENUMBER"] }, async (request) => {
  // Verificação de Segurança: O usuário está logado?
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "A função só pode ser chamada por usuários autenticados.",
    );
  }

  // Pega os dados enviados pelo nosso painel
  const { telefoneChapa, nomeChapa, nomeEmpresa, localServico } = request.data;
  if (!telefoneChapa || !nomeChapa || !nomeEmpresa || !localServico) {
    throw new HttpsError(
        "invalid-argument",
        "Dados insuficientes para enviar o convite.",
    );
  }

  // Monta a mensagem do convite
  const mensagem = `Olá ${nomeChapa}, a ${nomeEmpresa} tem um serviço para você! Local: ${localServico}. Responda "ACEITO" ou "REJEITO". - Plataforma Chapa Amigo`;

  try {
    // Envia a mensagem usando a API da Twilio
    const message = await client.messages.create({
      to: telefoneChapa,
      from: twilioPhoneNumber,
      body: mensagem,
    });

    logger.info(`Mensagem enviada com sucesso! SID: ${message.sid}`, { structuredData: true });
    return { success: true, messageSid: message.sid };

  } catch (error) {
    logger.error("Erro ao enviar mensagem via Twilio:", error, { structuredData: true });
    throw new HttpsError(
        "internal",
        "Falha ao enviar o SMS.",
        error,
    );
  }
});