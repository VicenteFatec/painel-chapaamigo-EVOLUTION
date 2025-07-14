// Importa as funções que precisamos do Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// A configuração do seu app para o projeto ORIGINAL
const firebaseConfig = {
  apiKey: "AIzaSyBOzvTb9IAQ2-x9JhZq2cE1x-KtBK9wucE",
  authDomain: "chapa-amigo-empresas.firebaseapp.com",
  projectId: "chapa-amigo-empresas",
  storageBucket: "chapa-amigo-empresas.appspot.com", // Atenção ao .appspot.com
  messagingSenderId: "912991691952",
  appId: "1:912991691952:web:339b7883ee6aee528c8775",
  measurementId: "G-SRM8HCL53Z"
};

// Inicializa a conexão com o Firebase
const app = initializeApp(firebaseConfig);

// Prepara os serviços que vamos usar, todos a partir do mesmo 'app'
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, 'us-central1');

// Este código cria a "ponte" para testes apenas em modo de desenvolvimento
if (import.meta.env.DEV) {
  console.log(">> MODO DE DESENVOLVIMENTO ATIVO: Ponte de teste para o console foi criada.");
  window.chapaFunctions = functions;
}

// Exporta TODOS os serviços para que nossas páginas possam usá-los
export { auth, db, storage, functions };