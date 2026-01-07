// Configuración base de la API

const API_BASE_URL = 'https://fyttsanet.com/backend/fyttsa';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Función base para hacer peticiones a la API
 * Maneja errores y retries automáticamente
 */
export async function apiRequest<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error(`API Error [${endpoint}]:`, error?.message);
    throw error;
  }
}

/**
 * Función con reintentos automáticos
 */
export async function apiRequestWithRetry<T>(
  endpoint: string,
  options: FetchOptions = {},
  maxRetries: number = 3,
  onRetry?: (attempt: number) => void
): Promise<ApiResponse<T>> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest<T>(endpoint, options);
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries) {
        onRetry?.(attempt + 1);
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export { API_BASE_URL };

