// ===================================================================
// ARQUIVO UNIFICADO - 18/07/2025
// INTEGRAÇÃO DA FUNÇÃO DE TRIAL
// ===================================================================

// ===================================================================
// SEÇÃO 1: IMPORTAÇÕES E DEPENDÊNCIAS
// ===================================================================
// Esta seção importa todas as bibliotecas necessárias para o funcionamento das Cloud Functions

const functions = require("firebase-functions/v1");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { defineString } = require('firebase-functions/params');
const {
  MercadoPagoConfig,
  PreApproval,
  Payment, // Adicionado para consultar pagamentos
  Customer,
  CustomerCard
} = require("mercadopago");
const { v4: uuidv4 } = require('uuid');
const twilio = require('twilio');
const axios =require('axios');

// Inicializa o Firebase Admin SDK para acesso ao Firestore e outras funcionalidades
admin.initializeApp();

// ===================================================================
// SEÇÃO 2: CONFIGURAÇÕES DE AMBIENTE E SEGREDOS
// ===================================================================
// Esta seção define todas as variáveis de ambiente e configurações sensíveis
// usando o sistema de parâmetros do Firebase Functions para segurança

// IDs dos Planos do Mercado Pago - Mapeia os nomes dos planos para seus IDs reais
const ID_PLANO_PROFISSIONAL = defineString("ID_PLANO_PROFISSIONAL");
const ID_PLANO_CORPORATIVO = defineString("ID_PLANO_CORPORATIVO");
const PLAN_IDS = {
  profissional: ID_PLANO_PROFISSIONAL,
  corporativo: ID_PLANO_CORPORATIVO,
};

// Mapeamento dos LIMITES para cada plano
const LIMITES_DOS_PLANOS = {
  essencial: { lojas: 1, frota: 20, usuarios: 3 },
  profissional: { lojas: 10, frota: 100, usuarios: 50 },
  corporativo: { lojas: 50, frota: 1000, usuarios: 250 },
};

// Configurações do Twilio para envio de mensagens WhatsApp
const twilioAccountSid = defineString("TWILIO_ACCOUNT_SID");
const twilioAuthToken = defineString("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = defineString("TWILIO_PHONE_NUMBER");
const twilioTemplateSid = defineString("TWILIO_TEMPLATE_SID");

// Chave da API do Google Maps para geocodificação de endereços
const googleMapsApiKey = defineString("Maps_API_KEY");

// Token de acesso do Mercado Pago para transações financeiras
const accessToken = defineString("MERCADOPAGO_TOKEN");

// ===================================================================
// SEÇÃO 3: FUNÇÃO PRINCIPAL - CRIAÇÃO DE ASSINATURAS
// ===================================================================
// Esta função é responsável por criar assinaturas recorrentes no Mercado Pago
// para os planos de pagamento da empresa

exports.createSubscription = onCall(
  {
    // Configuração de CORS para permitir chamadas do frontend
    cors: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://chapa-amigo-empresas.web.app"
    ],
  },
  async (request) => {

  logger.info(`Função 'createSubscription' acionadaa.`);

  // VALIDAÇÃO DE AUTENTICAÇÃO
  // Verifica se o usuário está autenticado antes de prosseguir
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "A função só pode ser chamada por um usuário autenticado.");
  }

  // EXTRAÇÃO DOS DADOS DA REQUISIÇÃO
  // Obtém os dados do plano e do cartão enviados pelo frontend
  const { planId, cardData } = request.data; 
  const userId = request.auth.uid;

  // VALIDAÇÃO DOS PARÂMETROS OBRIGATÓRIOS
  if (!planId || !cardData) {
    throw new HttpsError("invalid-argument", "Os argumentos 'planId' e 'cardTokenId' são obrigatórios.");
  }

  // Extrai o token do cartão dos dados enviados
  const cardTokenId = cardData.token

  try {
    // CONFIGURAÇÃO DO CLIENTE MERCADO PAGO
    // Inicializa o cliente do Mercado Pago com token de acesso e configurações
    const client = new MercadoPagoConfig({ accessToken: accessToken.value(), options: { timeout: 5000, integratorId: "dev_aa2d89add88111ebb2fb0242ac130004" } });

    // BUSCA DOS DADOS DO USUÁRIO NO FIRESTORE
    // Recupera informações da empresa no banco de dados
    const userDocRef = admin.firestore().collection("empresas").doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Usuário não encontrado no Firestore.");
    }
    const userData = userDoc.data();
    
    // VALIDAÇÃO DO PLANO SOLICITADO
    // Verifica se o plano existe no mapeamento configurado
    if (!PLAN_IDS[planId]) {
      throw new HttpsError("invalid-argument", `O plano '${planId}' não é válido.`);
    }

    logger.info(`Criando assinatura para: ${userData.email}, plano: ${planId}`);

    // PREPARAÇÃO PARA CRIAÇÃO DA ASSINATURA
    const preapprovalClient = new PreApproval(client);
    const idempotencyKey = uuidv4(); // Chave única para evitar duplicações

    // MONTAGEM DO CORPO DA REQUISIÇÃO PARA O MERCADO PAGO
    // Estrutura os dados necessários para criar a assinatura recorrente
    const subscriptionBody = {
      preapproval_plan_id: PLAN_IDS[planId].value(), // ID do plano pré-configurado no MP
      reason: `Assinatura Plano ${planId} - Chapa Empresa`, // Descrição da assinatura
      external_reference: userId, // Referência interna para vincular ao usuário
      payer_email: userData.email, // Email do pagador
      card_token_id: cardTokenId, // Token do cartão de crédito
      status: "authorized" // Status inicial da assinatura
    };

    logger.info(subscriptionBody);
    
    // CRIAÇÃO DA ASSINATURA NO MERCADO PAGO
    // Faz a chamada para a API do Mercado Pago
    const response = await preapprovalClient.create({
      body: subscriptionBody,
      requestOptions: { idempotencyKey: idempotencyKey }
    });

    logger.info("VITÓRIA! Assinatura criada com sucesso:", response);
    const subscriptionId = response.id;

    // ATUALIZAÇÃO DOS DADOS NO FIRESTORE
    // Salva as informações da assinatura no banco de dados
    // Padroniza o campo para 'plan' e remove o campo antigo 'plano' para limpeza.
    await userDocRef.update({
      plan: planId,
      plano: admin.firestore.FieldValue.delete(), // <-- Remove o campo antigo
      statusAssinatura: 'ativa',
      mpSubscriptionId: subscriptionId,
      mpPayerId: String(response.payer_id),
      mpCardId: response.card_id,
      dataAssinatura: admin.firestore.FieldValue.serverTimestamp(),
    });

    // RETORNO DE SUCESSO
    return { success: true, subscriptionId: subscriptionId };

  } catch (error) {
    // TRATAMENTO DE ERROS
    // Captura e formata erros para retorno ao frontend
    logger.error("Erro detalhado ao criar assinatura:", JSON.stringify(error, null, 2));
    const errorMessage = error.cause?.error?.message || error.cause?.[0]?.description || error.message || "Não foi possível criar a assinatura.";
    throw new HttpsError("internal", errorMessage, error.cause);
  }
}
);

// ===================================================================
// SEÇÃO 4: FUNÇÃO DE TESTE - ENVIO DE MENSAGEM WHATSAPP
// ===================================================================
// Esta função serve para testar a integração com o Twilio/WhatsApp
// Permite enviar mensagens de teste para verificar se a configuração está funcionando

exports.enviarMensagemTeste = onCall(
  {
    // Configuração de CORS para permitir chamadas do frontend
    cors: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://chapa-amigo-empresas.web.app"
    ],
  },
  async (request) => {
    logger.info("DIAGNÓSTICO: Função 'enviarMensagemTeste' acionada.");
    
    // VALIDAÇÃO DE AUTENTICAÇÃO
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Apenas usuários autenticados podem rodar este teste.");
    }
    
    // EXTRAÇÃO DO NÚMERO DE TELEFONE DE DESTINO
    const { telefoneDestino } = request.data;
    if (!telefoneDestino) {
      throw new HttpsError("invalid-argument", "O telefone de destino é necessário.");
    }
    
    // INICIALIZAÇÃO DO CLIENTE TWILIO
    let client;
    try {
      client = new twilio(twilioAccountSid.value(), twilioAuthToken.value());
    } catch (error) {
      logger.error("FALHA CRÍTICA ao inicializar o cliente da Twilio", error);
      throw new HttpsError("internal", "Falha ao instanciar o cliente da Twilio.", error.message);
    }
    
    // FORMATAÇÃO DO NÚMERO DE TELEFONE
    // Adiciona código do país (+55) e remove caracteres não numéricos
    const numeroFormatado = `+55${String(telefoneDestino).replace(/\D/g, "")}`;
    const templateSid = "HX2041b38f8b5ca76e977d2d99f3abe71de";
    
    try {
      // ENVIO DA MENSAGEM VIA WHATSAPP
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
      // TRATAMENTO DE ERROS DA API TWILIO
      logger.error("FALHA na chamada da API da Twilio.", error);
      throw new HttpsError("internal", "Falha ao enviar o template.", { code: error.code, message: error.message, details: error.moreInfo });
    }
  }
);

// ===================================================================
// SEÇÃO 5: FUNÇÃO DE CONVITE - ENVIO DE ORDEM DE SERVIÇO
// ===================================================================
// Esta função é responsável por enviar convites de ordem de serviço
// para os chapas via WhatsApp, incluindo um link para visualizar detalhes

exports.enviarConviteOS = onCall(
  {
    // Configuração de CORS para permitir chamadas do frontend
    cors: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://chapa-amigo-empresas.web.app"
    ],
  },
  async (request) => {
    // VALIDAÇÃO DE AUTENTICAÇÃO
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
    }
    
    // EXTRAÇÃO DOS DADOS DA ORDEM DE SERVIÇO
    const { telefoneChapa, nomeChapa, idOS, chapaId, solicitacaoData } = request.data;
    
    // VALIDAÇÃO DOS PARÂMETROS OBRIGATÓRIOS
    if (!telefoneChapa || !nomeChapa || !idOS || !chapaId || !solicitacaoData) {
      throw new HttpsError("invalid-argument", "Dados insuficientes.");
    }
    
    // INICIALIZAÇÃO DO CLIENTE TWILIO
    const client = new twilio(twilioAccountSid.value(), twilioAuthToken.value());
    const numeroFormatado = `+55${String(telefoneChapa).replace(/\D/g, "")}`;
    
    try {
      // CRIAÇÃO DO REGISTRO DE CONVITE NO FIRESTORE
      // Salva informações do convite para controle e rastreamento
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
      
      // GERAÇÃO DO LINK PÚBLICO PARA VISUALIZAR DETALHES
      const linkPublico = `https://us-central1-chapa-amigo-empresas.cloudfunctions.net/exibirDetalhesOS?id=${conviteRef.id}`;
      
      // ENVIO DA MENSAGEM COM TEMPLATE PERSONALIZADO
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
      // TRATAMENTO DE ERROS NO ENVIO
      logger.error(`Erro ao enviar WhatsApp para ${numeroFormatado}:`, error);
      throw new HttpsError("internal", "Falha ao enviar a mensagem via WhatsApp.", error);
    }
  }
);

// ===================================================================
// SEÇÃO 6: FUNÇÃO WEB - EXIBIÇÃO DE DETALHES DA ORDEM DE SERVIÇO
// ===================================================================
// Esta função HTTP gera uma página web que exibe detalhes da ordem de serviço
// e permite ao chapa aceitar ou recusar o trabalho através de links do WhatsApp

exports.exibirDetalhesOS = onRequest({ cors: true }, async (req, res) => {
  // EXTRAÇÃO DO ID DA ORDEM DE SERVIÇO DA URL
  const osId = req.query.id;
  if (!osId) {
    return res.status(400).send("Falta o parâmetro 'id' da OS na URL.");
  }
  
  try {
    // BUSCA DOS DADOS DA ORDEM DE SERVIÇO NO FIRESTORE
    const osDoc = await admin.firestore().collection("solicitacoes").doc(osId).get();
    if (!osDoc.exists) {
      return res.status(404).send("Ordem de Serviço não encontrada.");
    }
    
    const osData = osDoc.data();
    
    // PREPARAÇÃO DAS MENSAGENS DE RESPOSTA
    const nossoNumeroOficial = twilioPhoneNumber.value().replace('+', '');
    const mensagemAceite = `ACEITAR-${osId}`;
    const mensagemRecusa = `RECUSAR-${osId}`;
    
    // GERAÇÃO DO HTML DA PÁGINA DE DETALHES
    // Cria uma página web simples com botões para aceitar/recusar
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
    // TRATAMENTO DE ERROS NA GERAÇÃO DA PÁGINA
    logger.error("Erro ao gerar página de detalhes da OS:", error);
    return res.status(500).send("Ocorreu um erro ao buscar os detalhes do serviço.");
  }
});

// ===================================================================
// SEÇÃO 7: WEBHOOK - RECEBIMENTO DE RESPOSTAS DO WHATSAPP
// ===================================================================
// Esta função recebe as respostas dos chapas via WhatsApp (aceitar/recusar)
// e processa as mensagens recebidas

exports.receberRespostaChapa = onRequest(async (req, res) => {
  // EXTRAÇÃO DOS DADOS DA MENSAGEM RECEBIDA
  const { From, Body } = req.body;
  const _respostaLimpa = Body.trim();
  
  // PREPARAÇÃO DA RESPOSTA TWILIO (TwiML)
  const twiml = new twilio.twiml.MessagingResponse();
  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
  
  // NOTA: Esta função está incompleta - falta a lógica de processamento
  // das respostas "ACEITAR" ou "RECUSAR" recebidas
});

// ===================================================================
// SEÇÃO 8: WEBHOOK - RECEBIMENTO DE NOTIFICAÇÕES MERCADO PAGO (VERSÃO FINAL)
// ===================================================================
// Esta função ouve os sinais do Mercado Pago e usa o ID do Pagador (payer_id)
// para identificar e atualizar a empresa correta no Firestore.

exports.receberNotificacaoMercadoPago = onRequest(async (request, response) => {
    logger.info("Nova notificação do Mercado Pago recebida.", { body: request.body, query: request.query });

    if (request.method !== 'POST') {
        response.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const mpAccessToken = process.env.MERCADOPAGO_TOKEN;
        if (!mpAccessToken) {
            throw new Error("FALHA CRÍTICA: O Access Token do Mercado Pago não foi encontrado nas variáveis de ambiente.");
        }

        const { body } = request;
        const topic = body.type;

        if (topic !== "payment") {
            logger.info(`Tópico "${topic}" não relevante. Ignorando.`);
            response.status(200).send("Notificação não relevante ignorada.");
            return;
        }

        const paymentId = body.data.id;
        if (!paymentId) {
            throw new Error("ID do pagamento não encontrado na notificação.");
        }

        const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
        const payment = new Payment(client);
        const paymentInfo = await payment.get({ id: paymentId });

        logger.info("Detalhes do Pagamento obtidos do MP:", { status: paymentInfo.status, id: paymentInfo.id });

        if (paymentInfo.status === "approved") {
            const payerId = String(paymentInfo.payer?.id);
            if (!payerId) {
                throw new Error(`ID do pagador (payer.id) não encontrado no pagamento ${paymentId}.`);
            }

            logger.info(`Pagamento ${paymentId} aprovado. Procurando empresa com mpPayerId: ${payerId}`);

            const empresasRef = admin.firestore().collection("empresas");
            const q = empresasRef.where("mpPayerId", "==", payerId);
            const querySnapshot = await q.get();

            if (querySnapshot.empty) {
                throw new Error(`Nenhuma empresa encontrada com o mpPayerId: ${payerId}.`);
            }

            const empresaDoc = querySnapshot.docs[0];
            const empresaId = empresaDoc.id;
            const empresaData = empresaDoc.data();
            
            // ===== LÓGICA DE PRECISÃO FINAL (À PROVA DE FALHAS) =====
            // Usamos o ID da assinatura que JÁ TEMOS em nosso banco de dados.
            const subscriptionId = empresaData.mpSubscriptionId;
            if (!subscriptionId) {
                throw new Error(`ID da assinatura (mpSubscriptionId) não foi encontrado no documento da empresa ${empresaId}.`);
            }

            const preapprovalClient = new PreApproval(client);
            const subscriptionInfo = await preapprovalClient.get({ id: subscriptionId });
            
            const idDoPlanoPago = subscriptionInfo.preapproval_plan_id;
            const nomeDoPlano = Object.keys(PLAN_IDS).find(key => PLAN_IDS[key].value() === idDoPlanoPago) || 'essencial';

            const novosLimites = LIMITES_DOS_PLANOS[nomeDoPlano];
            logger.info(`Empresa encontrada: ${empresaId}. Atualizando para o plano ${nomeDoPlano} com os limites:`, novosLimites);

            await empresaDoc.ref.update({
                plan: nomeDoPlano,
                plano: admin.firestore.FieldValue.delete(),
                statusPagamento: "aprovado",
                ultimoPaymentId: paymentId,
                dataUpgrade: admin.firestore.FieldValue.serverTimestamp(),
                "limits.lojas": novosLimites.lojas,
                "limits.frota": novosLimites.frota,
                "limits.usuarios": novosLimites.usuarios
            });

            logger.info(`SUCESSO: Empresa ${empresaId} atualizada para o plano ${nomeDoPlano} e limites expandidos!`);
        } else {
            logger.info(`Status do pagamento ${paymentId} é "${paymentInfo.status}". Nenhuma ação necessária.`);
        }

        response.status(200).send("Notificação recebida com sucesso.");

    } catch (error) {
        logger.error("ERRO GRAVE ao processar notificação do Mercado Pago:", error);
        response.status(500).send("Erro interno ao processar a notificação.");
    }
});

// ===================================================================
// SEÇÃO 9: TRIGGER FIRESTORE - GEOCODIFICAÇÃO AUTOMÁTICA
// ===================================================================
// Esta função é acionada automaticamente sempre que um novo documento
// é criado na coleção "solicitacoes" do Firestore
// Ela converte endereços em coordenadas geográficas (latitude/longitude)

exports.geocodeAddressOnCreate = onDocumentCreated("solicitacoes/{solicitacaoId}", async (event) => {
  // VALIDAÇÃO DA EXISTÊNCIA DO DOCUMENTO
  const snapshot = event.data;
  if (!snapshot) { 
    return; 
  }
  
  const osData = snapshot.data();
  
  // VERIFICAÇÃO SE JÁ POSSUI COORDENADAS
  // Se já tem latitude e longitude, não precisa geocodificar novamente
  if (osData.latitude && osData.longitude) { 
    return; 
  }
  
  // MONTAGEM DO ENDEREÇO COMPLETO
  // Combina os campos do endereço em uma string para geocodificação
  const address = `${osData.endereco.logradouro}, ${osData.endereco.numero}, ${osData.endereco.bairro}, ${osData.endereco.cidade}, ${osData.endereco.estado}`;
  
  // VERIFICAÇÃO DA CHAVE DA API GOOGLE MAPS
  const apiKey = googleMapsApiKey.value();
  if (!apiKey) { 
    return; 
  }
  
  // CONSTRUÇÃO DA URL DA API DE GEOCODIFICAÇÃO
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  
  try {
    // CHAMADA PARA A API DO GOOGLE MAPS
    const response = await axios.get(url);
    
    // PROCESSAMENTO DA RESPOSTA E ATUALIZAÇÃO DO DOCUMENTO
    if (response.data.status === "OK") {
      const location = response.data.results[0].geometry.location;
      
      // ATUALIZAÇÃO DO DOCUMENTO COM AS COORDENADAS
      return snapshot.ref.update({ 
        latitude: location.lat, 
        longitude: location.lng 
      });
    }
    
  } catch (error) {
    // TRATAMENTO DE ERROS NA GEOCODIFICAÇÃO
    logger.error("Erro ao chamar a API de Geocodificação:", error);
  }
});


// ===================================================================
// SEÇÃO 10: TRIGGER DE AUTENTICAÇÃO - CONFIGURAÇÃO DE NOVA EMPRESA (CORRIGIDO)
// ===================================================================
// Esta função é acionada automaticamente sempre que um novo usuário é
// criado no Firebase Authentication e configura o período de teste gratuito.

exports.setupNewCompanyTrial = functions.auth.user().onCreate(async (user) => {
    // O restante do código da função permanece exatamente o mesmo
    const uid = user.uid;
    const email = user.email;

    logger.info(`Novo usuário criado: ${uid}, email: ${email}. Configurando período de teste.`);

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const companyData = {
        status: "trialing",
        plan: "profissional",
        trialEndDate: admin.firestore.Timestamp.fromDate(trialEndDate),
        email: email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        limits: LIMITES_DOS_PLANOS.profissional 
    };

    try {
        const companyDocRef = admin.firestore().collection("empresas").doc(uid);
        await companyDocRef.set(companyData, { merge: true });

        logger.info(`Empresa ${uid} configurada com sucesso para o período de teste até ${trialEndDate.toLocaleDateString('pt-BR')}.`);
        return null;

    } catch (error) {
        logger.error(`Falha ao configurar a empresa ${uid} para o teste:`, error);
        return null;
    }
});