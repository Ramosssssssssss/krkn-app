import { Database, setCurrentDatabaseId } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";

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
  isLoading: boolean;
  setCompanyCode: (
    code: string,
    companyData?: Company,
    databasesList?: Database[],
  ) => void;
  selectDatabase: (database: Database) => void;
  login: (userData: User, token: string, databaseInfo: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
  getBaseURL: () => string;
}

const AUTH_STORAGE_KEY = "@krkn_auth_session";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [companyCode, setCompanyCodeState] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(
    null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión persistida al iniciar
  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedSession = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        setCompanyCodeState(session.companyCode || null);
        setCompany(session.company || null);
        setUser(session.user || null);
        setToken(session.token || null);
        setDatabases(session.databases || []);
        setSelectedDatabase(session.selectedDatabase || null);
        setIsAuthenticated(session.isAuthenticated || false);

        // Sincronizar el databaseId con el servicio de API
        if (session.selectedDatabase?.id) {
          setCurrentDatabaseId(session.selectedDatabase.id);
        }
      }
    } catch (error) {
      console.error("Error loading stored session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSession = async (sessionData: {
    companyCode: string | null;
    company: Company | null;
    user: User | null;
    token: string | null;
    databases: Database[];
    selectedDatabase: Database | null;
    isAuthenticated: boolean;
  }) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error("Error saving session:", error);
    }
  };

  const setCompanyCode = (
    code: string,
    companyData?: Company,
    databasesList?: Database[],
  ) => {
    setCompanyCodeState(code);
    if (companyData) setCompany(companyData);
    if (databasesList) setDatabases(databasesList);

    // Guardar en storage
    saveSession({
      companyCode: code,
      company: companyData || company,
      user,
      token,
      databases: databasesList || databases,
      selectedDatabase,
      isAuthenticated,
    });
  };

  const selectDatabase = (database: Database) => {
    setSelectedDatabase(database);

    // Sincronizar el databaseId con el servicio de API
    setCurrentDatabaseId(database.id);

    // Guardar en storage
    saveSession({
      companyCode,
      company,
      user,
      token,
      databases,
      selectedDatabase: database,
      isAuthenticated,
    });
  };

  const login = async (
    userData: User,
    tokenValue: string,
    databaseInfo: any,
  ): Promise<void> => {
    setUser(userData);
    setToken(tokenValue);
    setIsAuthenticated(true);

    // Guardar sesión completa en storage
    await saveSession({
      companyCode,
      company,
      user: userData,
      token: tokenValue,
      databases,
      selectedDatabase,
      isAuthenticated: true,
    });
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    if (!user) return;

    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);

    // Guardar sesión actualizada en storage
    await saveSession({
      companyCode,
      company,
      user: updatedUser,
      token,
      databases,
      selectedDatabase,
      isAuthenticated,
    });
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setCompanyCodeState(null);
    setCompany(null);
    setUser(null);
    setToken(null);
    setDatabases([]);
    setSelectedDatabase(null);

    // Limpiar el databaseId del servicio de API
    setCurrentDatabaseId(null);

    // Limpiar storage
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing session:", error);
    }
  };

  const getBaseURL = () => {
    return "https://app.krkn.mx";
  };

  return (
    <AuthContext.Provider
      value={{
        companyCode,
        company,
        user,
        token,
        databases,
        selectedDatabase,
        isAuthenticated,
        isLoading,
        setCompanyCode,
        selectDatabase,
        login,
        logout,
        updateUser,
        getBaseURL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
