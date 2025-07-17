// ===================================================================
// ARQUIVO UNIFICADO - 16/07/2025
// CORREÇÃO FINAL v16 (PROTOCOLO REAL): A vitória.
// ===================================================================

const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { defineString } = require('firebase-functions/params');
const {
  MercadoPagoConfig,
  PreApproval,
  PaymentMethod,
  Customer
} = require("mercadopago");
const { v4: uuidv4 } = require('uuid');
const twilio = require('twilio');
const axios = require('axios'); // Adicionado import do axios

admin.initializeApp();

// ===================================================================
// CONTROLE DE AMBIENTE E SEGREDOS
// ===================================================================
const MODO_TESTE = true;

// Segredos
const mpAccessTokenProducao = defineString("MERCADOPAGO_ACCESSTOKEN");
const mpAccessTokenTeste = defineString("MERCADOPAGO_TEST_ACCESSTOKEN");

// IDs dos Planos do Mercado Pago
const PLAN_IDS = {
  profissional: "2c93808497f5faa70198139f16000bc4",
  corporativo: "2c93808497f5fac30198139fb18a0b36",
};

// Twilio Configurations
const twilioAccountSid = defineString("TWILIO_ACCOUNT_SID");
const twilioAuthToken = defineString("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = defineString("TWILIO_PHONE_NUMBER");
const twilioTemplateSid = defineString("TWILIO_TEMPLATE_SID");

// Google Maps API Key
const googleMapsApiKey = defineString("GOOGLE_MAPS_API_KEY");

// ===================================================================
// FUNÇÃO: Criar Assinatura (ESTRATÉGIA FINAL "PROTOCOLO REAL")
// ===================================================================
exports.createSubscription = onCall(
  {
    cors: [
      "http://localhost:5173",
      "https://chapa-amigo-empresas.web.app"
    ],
  },
  async (request) => {
    logger.info(`Função 'createSubscription' acionada em MODO ${MODO_TESTE ? 'TESTE' : 'PRODUÇÃO'}.`);

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "A função só pode ser chamada por um usuário autenticado.");
    }

    const accessToken = MODO_TESTE ? mpAccessTokenTeste.value() : mpAccessTokenProducao.value();
    const { planId, cardData } = request.data;
    const userId = request.auth.uid;

    if (!planId || !cardData) {
      throw new HttpsError("invalid-argument", "Os argumentos 'planId' e 'cardData' são obrigatórios.");
    }

    try {
      const client = new MercadoPagoConfig({ accessToken: accessToken, options: { timeout: 5000 } });

      const userDocRef = admin.firestore().collection("empresas").doc(userId);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Usuário não encontrado no Firestore.");
      }
      const userData = userDoc.data();

      logger.info(`Iniciando "Protocolo Real" para: ${userData.email}, plano: ${planId}`);

      // --- PASSO 1: CRIAR OU ENCONTRAR O CLIENTE NO MERCADO PAGO ---
      const customerClient = new Customer(client);
      let customer;
      const searchResult = await customerClient.search({ options: { email: userData.email } });

      if (searchResult.results && searchResult.results.length > 0) {
        customer = searchResult.results[0];
        logger.info(`Cliente MP encontrado: ${customer.id}`);
      } else {
        customer = await customerClient.create({ body: { email: userData.email } });
        logger.info(`Novo cliente MP criado: ${customer.id}`);
      }
      await userDocRef.update({ mpCustomerId: customer.id });

      // --- PASSO 2: CRIAR O TOKEN DO CARTÃO (Ainda necessário para registrar o cartão) ---
      const cardTokenResponse = await new PaymentMethod(client).create({
        body: {
          site_id: 'MLB', // Brasil
          customer_id: customer.id,
          token: cardData.token // O token gerado pelo Brick no frontend
        }
      });
      
      logger.info('Token de cartão processado para registrar o meio de pagamento.');

      // --- PASSO 3: CRIAR A ASSINATURA ---
      const preapprovalClient = new PreApproval(client);
      const idempotencyKey = uuidv4(); // Chave para evitar cobranças duplicadas

      const subscriptionBody = {
        reason: `Assinatura Plano ${planId.charAt(0).toUpperCase() + planId.slice(1)} - Chapa Amigo`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: planId === "profissional" ? 199.00 : 499.00,
          currency_id: "BRL",
        },
        back_url: "https://chapa-amigo-empresas.web.app/dashboard",
        payer_email: userData.email,
        preapproval_plan_id: PLAN_IDS[planId],
        card_token_id: cardData.token, // Usamos o token original do frontend aqui
        status: "authorized",
      };

      const response = await preapprovalClient.create({
        body: subscriptionBody,
        requestOptions: { idempotencyKey: idempotencyKey }
      });

      logger.info("VITÓRIA! Assinatura criada com sucesso:", response);
      const subscriptionId = response.id;

      await userDocRef.update({
        plano: planId,
        statusAssinatura: 'ativa',
        mpSubscriptionId: subscriptionId,
        mpPayerId: response.payer_id,
        dataAssinatura: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, subscriptionId: subscriptionId };

    } catch (error) {
      logger.error("Erro detalhado no 'Protocolo Real':", JSON.stringify(error, null, 2));
      const errorMessage = error.cause?.[0]?.description || error.message || "Não foi possível criar a assinatura.";
      throw new HttpsError("internal", errorMessage, error.cause);
    }
  }
);

// ===================================================================
// OUTRAS FUNÇÕES
// ===================================================================
exports.enviarMensagemTeste = onCall(
  {
    cors: [
      "http://localhost:5173",
      "https://chapa-amigo-empresas.web.app"
    ],
  },
  async (request) => {
    logger.info("DIAGNÓSTICO: Função 'enviarMensagemTeste' acionada.");
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Apenas usuários autenticados podem rodar este teste.");
    }
    const { telefoneDestino } = request.data;
    if (!telefoneDestino) {
      throw new HttpsError("invalid-argument", "O telefone de destino é necessário.");
    }
    let client;
    try {
      client = new twilio(twilioAccountSid.value(), twilioAuthToken.value());
    } catch (error) {
      logger.error("FALHA CRÍTICA ao inicializar o cliente da Twilio", error);
      throw new HttpsError("internal", "Falha ao instanciar o cliente da Twilio.", error.message);
    }
    const numeroFormatado = `+55${String(telefoneDestino).replace(/\D/g, "")}`;
    const templateSid = "HX2041b38f8b5ca76e977d2d99f3abe71de";
    try {
      const from = `whatsapp:${twilioPhoneNumber.value()}`;
      const to = `whatsapp:${numeroFormatado}`;
      const message = await client.messages.create({
        contentSid: templateSid,
        from: from,
        to: to,
      });
      logger.info(`SUCESSO! Mensagem de teste enviada! SID: ${message.sid}`);
      return { success: true, message: "Template enviado com sucesso!", messageId: message.sid };
    } catch (error) {
      logger.error("FALHA na chamada da API da Twilio.", error);
      throw new HttpsError("internal", "Falha ao enviar o template.", { code: error.code, message: error.message, details: error.moreInfo });
    }
  }
);

exports.enviarConviteOS = onCall(
  {
    cors: [
      "http://localhost:5173",
      "https://chapa-amigo-empresas.web.app"
    ],
  },
  async (request) => {
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
        contentVariables: {
          '1': nomeChapa,
          '2': solicitacaoData.cliente,
          '3': linkPublico
        },
      });
      
      return { success: true, conviteId: conviteRef.id };
    } catch (error) {
      logger.error(`Erro ao enviar WhatsApp para ${numeroFormatado}:`, error);
      throw new HttpsError("internal", "Falha ao enviar a mensagem via WhatsApp.", error);
    }
  }
);

exports.exibirDetalhesOS = onRequest({ cors: true }, async (req, res) => {
  const osId = req.query.id;
  if (!osId) {
    return res.status(400).send("Falta o parâmetro 'id' da OS na URL.");
  }
  try {
    const osDoc = await admin.firestore().collection("solicitacoes").doc(osId).get();
    if (!osDoc.exists) {
      return res.status(404).send("Ordem de Serviço não encontrada.");
    }
    const osData = osDoc.data();
    const nossoNumeroOficial = twilioPhoneNumber.value().replace('+', '');
    const mensagemAceite = `ACEITAR-${osId}`;
    const mensagemRecusa = `RECUSAR-${osId}`;
    const htmlCompleto = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Convite de Serviço</title>
      </head>
      <body>
        <h1>Convite para ${osData.cliente || "Serviço"}</h1>
        <p>Clique para responder.</p>
        <a href="https://wa.me/${nossoNumeroOficial}?text=${encodeURIComponent(mensagemAceite)}">ACEITAR</a>
        <a href="https://wa.me/${nossoNumeroOficial}?text=${encodeURIComponent(mensagemRecusa)}">RECUSAR</a>
      </body>
      </html>
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
  if (!snapshot) { 
    return; 
  }
  const osData = snapshot.data();
  if (osData.latitude && osData.longitude) { 
    return; 
  }
  
  const address = `${osData.endereco.logradouro}, ${osData.endereco.numero}, ${osData.endereco.bairro}, ${osData.endereco.cidade}, ${osData.endereco.estado}`;
  const apiKey = googleMapsApiKey.value();
  if (!apiKey) { 
    return; 
  }
  
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  
  try {
    const response = await axios.get(url);
    if (response.data.status === "OK") {
      const location = response.data.results[0].geometry.location;
      return snapshot.ref.update({ 
        latitude: location.lat, 
        longitude: location.lng 
      });
    }
  } catch (error) {
    logger.error("Erro ao chamar a API de Geocodificação:", error);
  }
});