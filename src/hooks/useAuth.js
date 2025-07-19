import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // ===== NOVO ESTADO PARA OS DADOS DA EMPRESA =====
  const [empresaData, setEmpresaData] = useState(null);

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuário está logado, buscar o perfil da empresa
        const userDocRef = doc(db, 'empresas', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setCurrentUser(user);
          setUserRole(userData.role || 'cliente');
          // ===== AQUI ESTÁ A MUDANÇA: Salvamos TODOS os dados da empresa =====
          setEmpresaData(userData); 
        } else {
          // Documento da empresa não encontrado
          setCurrentUser(user);
          setUserRole(null); 
          setEmpresaData(null); // Limpa os dados da empresa
        }
      } else {
        // Usuário está deslogado
        setCurrentUser(null);
        setUserRole(null);
        setEmpresaData(null); // Limpa os dados da empresa
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  // ===== RETORNAMOS TAMBÉM OS DADOS DA EMPRESA =====
  return { currentUser, userRole, loading, empresaData };
}