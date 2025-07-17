import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, ErrorType, ErrorSeverity, createError, logError } from '@/utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: AppError) => ReactNode);
  onError?: (error: AppError) => void;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Create a standardized error
    const appError = createError(
      ErrorType.UNEXPECTED,
      error.message || 'An unexpected error occurred',
      ErrorSeverity.ERROR,
      {},
      error,
      'REACT_ERROR'
    );
    
    // Return state update
    return {
      hasError: true,
      error: appError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Create a standardized error with component stack
    const appError = createError(
      ErrorType.UNEXPECTED,
      error.message || 'An unexpected error occurred',
      ErrorSeverity.ERROR,
      { componentStack: errorInfo.componentStack },
      error,
      'REACT_ERROR'
    );
    
    // Update state
    this.setState({
      error: appError
    });
    
    // Log the error
    logError(appError);
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(appError);
    }
  }

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;
    
    if (hasError && error) {
      // If a fallback is provided, use it
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error);
        }
        return fallback;
      }
      
      // Default fallback UI
      return (
        <div className="p-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-700 mb-4">
            We apologize for the inconvenience. Please try refreshing the page.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-white rounded border border-red-200 overflow-auto">
              <p className="font-mono text-sm text-red-600">{error.message}</p>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    
    // If no error, render children normally
    return children;
  }
}

export default ErrorBoundary;
