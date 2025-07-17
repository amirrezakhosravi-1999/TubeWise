import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger, LogCategory } from './logger';
import { handleApiError } from './errorHandler';

// Create a unique request ID for each HTTP request
const generateRequestId = (): string => {
  return uuidv4();
};

// Create a configured axios instance with interceptors for logging and error handling
export const createHttpClient = (baseURL: string, timeout: number = 30000): AxiosInstance => {
  const httpClient = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  httpClient.interceptors.request.use(
    (config: AxiosRequestConfig) => {
      // Generate a unique request ID
      const requestId = generateRequestId();
      
      // Add request ID to headers for tracing
      if (config.headers) {
        config.headers['X-Request-ID'] = requestId;
      } else {
        config.headers = {
          'X-Request-ID': requestId,
        };
      }
      
      // Store start time for performance measurement
      config.metadata = {
        ...config.metadata,
        requestId,
        startTime: new Date().getTime(),
      };
      
      // Log the request
      logger.logApiRequest(
        config.method?.toUpperCase() || 'UNKNOWN',
        `${config.baseURL || ''}${config.url || ''}`,
        config.data,
        requestId
      );
      
      return config;
    },
    (error: AxiosError) => {
      // Log request error
      logger.error(
        LogCategory.API,
        'Request error',
        error,
        error.config?.metadata?.requestId
      );
      
      return Promise.reject(error);
    }
  );

  // Response interceptor
  httpClient.interceptors.response.use(
    (response: AxiosResponse) => {
      const { config } = response;
      const requestId = config.headers?.['X-Request-ID'] || config.metadata?.requestId;
      
      // Calculate request duration
      const startTime = config.metadata?.startTime;
      const endTime = new Date().getTime();
      const duration = startTime ? endTime - startTime : undefined;
      
      // Log the response
      logger.logApiResponse(
        config.method?.toUpperCase() || 'UNKNOWN',
        `${config.baseURL || ''}${config.url || ''}`,
        response.status,
        response.data,
        duration,
        requestId as string
      );
      
      // Add performance metrics to response
      if (duration) {
        logger.logPerformance(
          `API ${config.method?.toUpperCase() || 'UNKNOWN'} ${config.url || ''}`,
          duration,
          { status: response.status },
          requestId as string
        );
      }
      
      return response;
    },
    (error: AxiosError) => {
      const { config, response } = error;
      const requestId = config?.headers?.['X-Request-ID'] || config?.metadata?.requestId;
      
      // Calculate request duration
      const startTime = config?.metadata?.startTime;
      const endTime = new Date().getTime();
      const duration = startTime ? endTime - startTime : undefined;
      
      // Log the error
      logger.logApiError(
        config?.method?.toUpperCase() || 'UNKNOWN',
        `${config?.baseURL || ''}${config?.url || ''}`,
        response?.status || 0,
        {
          status: response?.status,
          statusText: response?.statusText,
          data: response?.data,
          duration,
        },
        requestId as string
      );
      
      // Handle API error
      const appError = handleApiError(error);
      
      return Promise.reject(appError);
    }
  );

  return httpClient;
};

// Create default API client
export const apiClient = createHttpClient(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  30000
);

// Export a function to add auth token to requests
export const setAuthToken = (token: string | null): void => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// HTTP methods wrapper for cleaner API calls
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => apiClient.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.post<T>(url, data, config),
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.put<T>(url, data, config),
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig) => apiClient.patch<T>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => apiClient.delete<T>(url, config),
};
