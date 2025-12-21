import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ✅ Extend AxiosRequestConfig untuk include metadata
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  metadata?: {
    startTime: number;
  };
}

// ✅ Type untuk error response data
interface ApiErrorResponse {
  error?: string;
  message?: string;
}

// ✅ Create axios instance dengan optimized config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 detik (reduced dari 15)
  // ✅ Disable retry untuk prevent blocking
  maxRedirects: 3,
});

// ✅ Request queue untuk prevent concurrent requests
let pendingRequests = 0;
const MAX_CONCURRENT = 3;

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // ✅ Wait jika terlalu banyak concurrent requests
    while (pendingRequests >= MAX_CONCURRENT) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    pendingRequests++;
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // ✅ Add timestamp untuk tracking (with custom type)
    const customConfig = config as CustomAxiosRequestConfig;
    customConfig.metadata = { startTime: Date.now() };
    
    return config;
  },
  (error) => {
    pendingRequests--;
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    pendingRequests--;
    
    // ✅ Log response time
    const customConfig = response.config as CustomAxiosRequestConfig;
    const duration = Date.now() - (customConfig.metadata?.startTime || 0);
    if (duration > 3000) {
      console.warn(`Slow API response: ${response.config.url} took ${duration}ms`);
    }
    
    return response.data?.data ? response.data : response.data;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    pendingRequests--;
    
    console.error('API Error:', error.response || error);

    // ✅ Handle specific errors
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout - please try again'));
    }

    if (error.code === 'ERR_NETWORK') {
      return Promise.reject(new Error('Network error - check your connection'));
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired'));
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error'));
    }

    // Return structured error
    const errorMessage = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'An unexpected error occurred';

    return Promise.reject({
      ...error,
      message: errorMessage,
      response: error.response
    });
  }
);

// ✅ Helper untuk retry failed requests
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 400/401/403
      if (error.response?.status && [400, 401, 403].includes(error.response.status)) {
        throw error;
      }
      
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

export default api;