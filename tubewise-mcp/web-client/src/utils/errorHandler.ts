import { analyticsService } from '@/services/analyticsService';

// Error types
export enum ErrorType {
  API = 'api_error',
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  VALIDATION = 'validation_error',
  NETWORK = 'network_error',
  UNEXPECTED = 'unexpected_error',
  RESOURCE_NOT_FOUND = 'resource_not_found',
  RATE_LIMIT = 'rate_limit_error',
  SUBSCRIPTION = 'subscription_error',
  PAYMENT = 'payment_error'
}

// Error severity levels
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Error interface
export interface AppError {
  type: ErrorType;
  message: string;
  severity: ErrorSeverity;
  code?: string;
  details?: any;
  originalError?: any;
  timestamp: Date;
}

// Create a standardized error object
export function createError(
  type: ErrorType,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  details?: any,
  originalError?: any,
  code?: string
): AppError {
  return {
    type,
    message,
    severity,
    code,
    details,
    originalError,
    timestamp: new Date()
  };
}

// Handle API errors
export function handleApiError(error: any): AppError {
  // Check if it's an axios error with a response
  if (error.response) {
    const { status, data } = error.response;
    
    // Handle different HTTP status codes
    switch (status) {
      case 400:
        return createError(
          ErrorType.VALIDATION,
          data.message || 'Invalid request',
          ErrorSeverity.WARNING,
          data,
          error,
          `HTTP_${status}`
        );
      
      case 401:
        return createError(
          ErrorType.AUTHENTICATION,
          data.message || 'Authentication required',
          ErrorSeverity.WARNING,
          data,
          error,
          `HTTP_${status}`
        );
      
      case 403:
        return createError(
          ErrorType.AUTHORIZATION,
          data.message || 'You do not have permission to perform this action',
          ErrorSeverity.WARNING,
          data,
          error,
          `HTTP_${status}`
        );
      
      case 404:
        return createError(
          ErrorType.RESOURCE_NOT_FOUND,
          data.message || 'Resource not found',
          ErrorSeverity.WARNING,
          data,
          error,
          `HTTP_${status}`
        );
      
      case 429:
        return createError(
          ErrorType.RATE_LIMIT,
          data.message || 'Rate limit exceeded',
          ErrorSeverity.WARNING,
          data,
          error,
          `HTTP_${status}`
        );
      
      case 500:
      case 502:
      case 503:
      case 504:
        return createError(
          ErrorType.API,
          data.message || 'Server error',
          ErrorSeverity.ERROR,
          data,
          error,
          `HTTP_${status}`
        );
      
      default:
        return createError(
          ErrorType.API,
          data.message || 'API error',
          ErrorSeverity.ERROR,
          data,
          error,
          `HTTP_${status}`
        );
    }
  }
  
  // Handle network errors
  if (error.request) {
    return createError(
      ErrorType.NETWORK,
      'Network error. Please check your connection.',
      ErrorSeverity.WARNING,
      { request: error.request },
      error,
      'NETWORK_ERROR'
    );
  }
  
  // Handle unexpected errors
  return createError(
    ErrorType.UNEXPECTED,
    error.message || 'An unexpected error occurred',
    ErrorSeverity.ERROR,
    {},
    error,
    'UNEXPECTED_ERROR'
  );
}

// Handle subscription errors
export function handleSubscriptionError(error: any): AppError {
  return createError(
    ErrorType.SUBSCRIPTION,
    error.message || 'Subscription error',
    ErrorSeverity.WARNING,
    error.details || {},
    error,
    error.code || 'SUBSCRIPTION_ERROR'
  );
}

// Handle payment errors
export function handlePaymentError(error: any): AppError {
  return createError(
    ErrorType.PAYMENT,
    error.message || 'Payment error',
    ErrorSeverity.WARNING,
    error.details || {},
    error,
    error.code || 'PAYMENT_ERROR'
  );
}

// Log error to analytics service
export function logError(error: AppError): void {
  // Log to analytics
  analyticsService.trackEvent('Error', {
    error_type: error.type,
    error_message: error.message,
    error_severity: error.severity,
    error_code: error.code,
    error_timestamp: error.timestamp.toISOString()
  });
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', error);
    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
  }
}

// Display user-friendly error message
export function getUserFriendlyErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.AUTHENTICATION:
      return 'Please sign in to continue.';
    
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
    
    case ErrorType.VALIDATION:
      return error.message || 'Please check your input and try again.';
    
    case ErrorType.NETWORK:
      return 'Network error. Please check your connection and try again.';
    
    case ErrorType.RESOURCE_NOT_FOUND:
      return 'The requested resource was not found.';
    
    case ErrorType.RATE_LIMIT:
      return 'You have made too many requests. Please try again later.';
    
    case ErrorType.SUBSCRIPTION:
      return error.message || 'There was an issue with your subscription.';
    
    case ErrorType.PAYMENT:
      return error.message || 'There was an issue processing your payment.';
    
    case ErrorType.API:
    case ErrorType.UNEXPECTED:
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
}

// Main error handler function
export function handleError(error: any): {
  appError: AppError;
  userMessage: string;
} {
  let appError: AppError;
  
  // Determine error type and create standardized error
  if (error.response || error.request) {
    appError = handleApiError(error);
  } else if (error.type === ErrorType.SUBSCRIPTION) {
    appError = handleSubscriptionError(error);
  } else if (error.type === ErrorType.PAYMENT) {
    appError = handlePaymentError(error);
  } else if (error.type !== undefined && error.message !== undefined && error.severity !== undefined) {
    // It's already an AppError-like object
    appError = error as AppError;
  } else {
    appError = createError(
      ErrorType.UNEXPECTED,
      error.message || 'An unexpected error occurred',
      ErrorSeverity.ERROR,
      {},
      error,
      'UNEXPECTED_ERROR'
    );
  }
  
  // Log the error
  logError(appError);
  
  // Get user-friendly message
  const userMessage = getUserFriendlyErrorMessage(appError);
  
  return {
    appError,
    userMessage
  };
}
