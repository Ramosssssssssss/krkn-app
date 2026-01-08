import React, { createContext, ReactNode, useContext, useState } from 'react';

interface Database {
  id: number;
  nombre: string;
  ip_servidor: string;
  ubicacion: string;
  puerto_bd: number;
}

interface Company {
  EMPRESA_ID: number;
  CODIGO: string;
}

interface User {
  USUARIO_ID: number;
  CODIGO: string;
  USERNAME: string;
  EMAIL: string;
  NOMBRE: string;
  APELLIDO_PATERNO: string;
  APELLIDO_MATERNO: string;
  TELEFONO: string;
  AVATAR_URL: string;
  ROL_ID: number;
}

interface AuthContextType {
  companyCode: string | null;
  company: Company | null;
  user: User | null;
  token: string | null;
  databases: Database[];
  selectedDatabase: Database | null;
  isAuthenticated: boolean;
  setCompanyCode: (code: string, companyData?: Company, databasesList?: Database[]) => void;
  selectDatabase: (database: Database) => void;
  login: (userData: User, token: string, databaseInfo: any) => Promise<void>;
  logout: () => void;
  getBaseURL: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [companyCode, setCompanyCodeState] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const setCompanyCode = (code: string, companyData?: Company, databasesList?: Database[]) => {
    setCompanyCodeState(code);
    if (companyData) setCompany(companyData);
    if (databasesList) setDatabases(databasesList);
  };

  const selectDatabase = (database: Database) => {
    setSelectedDatabase(database);
  };

  const login = async (userData: User, tokenValue: string, databaseInfo: any): Promise<void> => {
    setUser(userData);
    setToken(tokenValue);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCompanyCodeState(null);
    setCompany(null);
    setUser(null);
    setToken(null);
    setDatabases([]);
    setSelectedDatabase(null);
  };

  const getBaseURL = () => {
    return 'https://app.krkn.mx';
  };

  return (
    <AuthContext.Provider value={{ 
      companyCode,
      company,
      user,
      token,
      databases,
      selectedDatabase,
      isAuthenticated, 
      setCompanyCode,
      selectDatabase,
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
