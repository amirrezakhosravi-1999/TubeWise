import { useState, useCallback } from 'react';
import { handleError, AppError } from '../utils/errorHandler';
import { useToast } from '../hooks/useToast';

interface UseApiErrorResult {
  error: AppError | null;
  isError: boolean;
  handleApiError: (error: any) => void;
  clearError: () => void;
}

/**
 * Hook for handling API errors in components
 * @param showToast Whether to automatically show a toast notification for errors
 * @param onError Optional callback to run when an error occurs
 */
export function useApiError(
  showToast: boolean = true,
  onError?: (error: AppError) => void
): UseApiErrorResult {
  const [error, setError] = useState<AppError | null>(null);
  const toast = useToast();
  
  const handleApiError = useCallback((error: any) => {
    const { appError, userMessage } = handleError(error);
    
    // Set the error state
    setError(appError);
    
    // Show toast if enabled
    if (showToast) {
      toast.error(userMessage);
    }
    
    // Call onError callback if provided
    if (onError) {
      onError(appError);
    }
    
    return appError;
  }, [showToast, onError, toast]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    error,
    isError: !!error,
    handleApiError,
    clearError
  };
}
