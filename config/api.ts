// Configuración de API
export const API_CONFIG = {
  BASE_URL: 'https://app.krkn.mx',
  ENDPOINTS: {
    LOGIN: '/api/login.php',
    GET_DATABASES: '/api/get-databases.php',
    ARTICULOS: '/api/articulos.php',
    SUCURSALES_ALMACENES: '/api/sucursales-almacenes.php',
  }
};

// Helper para construir URLs
export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};
