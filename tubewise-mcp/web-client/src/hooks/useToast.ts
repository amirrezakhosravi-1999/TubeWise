import { useCallback } from 'react';
import { toast, ToastOptions } from 'react-toastify';

interface UseToastResult {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  custom: (message: string, options?: ToastOptions) => void;
  dismiss: (id?: string | number) => void;
  dismissAll: () => void;
}

/**
 * Hook for showing toast notifications
 */
export function useToast(): UseToastResult {
  // Default toast options
  const defaultOptions: ToastOptions = {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };
  
  // Success toast
  const success = useCallback((message: string, options?: ToastOptions) => {
    return toast.success(message, {
      ...defaultOptions,
      ...options,
    });
  }, []);
  
  // Error toast
  const error = useCallback((message: string, options?: ToastOptions) => {
    return toast.error(message, {
      ...defaultOptions,
      ...options,
    });
  }, []);
  
  // Info toast
  const info = useCallback((message: string, options?: ToastOptions) => {
    return toast.info(message, {
      ...defaultOptions,
      ...options,
    });
  }, []);
  
  // Warning toast
  const warning = useCallback((message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      ...defaultOptions,
      ...options,
    });
  }, []);
  
  // Custom toast
  const custom = useCallback((message: string, options?: ToastOptions) => {
    return toast(message, {
      ...defaultOptions,
      ...options,
    });
  }, []);
  
  // Dismiss a specific toast
  const dismiss = useCallback((id?: string | number) => {
    if (id) {
      toast.dismiss(id);
    } else {
      toast.dismiss();
    }
  }, []);
  
  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);
  
  return {
    success,
    error,
    info,
    warning,
    custom,
    dismiss,
    dismissAll,
  };
}
