import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

// Cria o contexto
const AuthContext = createContext();

// Cria o Provedor (AuthProvider)
// Ele vai "envelopar" nossa aplicação
export function AuthProvider({ children }) {
  const authData = useAuth(); // Nosso hook em ação!

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
}

// Cria um hook customizado para consumir o contexto facilmente
// Em vez de importar useContext e AuthContext em todo lugar, só importamos useAuthContext
export function useAuthContext() {
  return useContext(AuthContext);
}