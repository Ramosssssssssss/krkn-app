import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

// URL base del servidor - cambiar según ambiente
const BASE_URL = 'https://fyttsanet.com/backend/krkn';

interface AuthContextType {
  companyCode: string | null;
  isAuthenticated: boolean;
  setCompanyCode: (code: string) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  getBaseURL: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [companyCode, setCompanyCodeState] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const setCompanyCode = (code: string) => {
    setCompanyCodeState(code);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simular validación - aquí conectarías con tu API
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (email && password) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCompanyCodeState(null);
  };

  const getBaseURL = useCallback(() => {
    // Si hay código de empresa, construir URL dinámica
    // Por ahora retorna la URL base estática
    return BASE_URL;
  }, [companyCode]);

  return (
    <AuthContext.Provider value={{ 
      companyCode, 
      isAuthenticated, 
      setCompanyCode, 
      login, 
      logout,
      getBaseURL,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
