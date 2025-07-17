import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
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
          // Define a role do usuário. Se não existir, define como 'cliente' por padrão.
          setUserRole(userData.role || 'cliente');
        } else {
          // Documento da empresa não encontrado, talvez durante o processo de registro
          setCurrentUser(user);
          setUserRole(null); 
        }
      } else {
        // Usuário está deslogado
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    // Limpa o listener quando o componente desmontar
    return () => unsubscribe();
  }, [auth, db]);

  return { currentUser, userRole, loading };
}