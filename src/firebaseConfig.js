// Importa as funções que precisamos do Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // <-- A linha que faltava para o banco de dados

// A configuração do seu app que você copiou do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBOzvTb9IAQ2-x9JhZq2cE1x-KtBK9wucE",
  authDomain: "chapa-amigo-empresas.firebaseapp.com",
  projectId: "chapa-amigo-empresas",
  storageBucket: "chapa-amigo-empresas.appspot.com",
  messagingSenderId: "912991691952",
  appId: "1:912991691952:web:339b7883ee6aee528c8775",
  measurementId: "G-SRM8HCL53Z"
};

// Inicializa a conexão com o Firebase
const app = initializeApp(firebaseConfig);

// Prepara os serviços que vamos usar
const auth = getAuth(app);
const db = getFirestore(app); // <-- Inicializa o serviço do Firestore

// Exporta os serviços para que nossas outras páginas possam usá-los
export { auth, db }; // <-- Agora exporta tanto o 'auth' quanto o 'db'
