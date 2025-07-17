import '../styles/globals.css';
import '../styles/custom.css';
import '../styles/summary.css';
import type { AppProps } from 'next/app';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { appWithTranslation } from 'next-i18next';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { useEffect } from 'react';
import { analyticsService } from '../services/analyticsService';
import ErrorBoundary from '../components/common/ErrorBoundary';
import ToastContainer from '../components/common/ToastContainer';
import { AppError, ErrorSeverity, ErrorType, createError, logError } from '../utils/errorHandler';

// تم سفارشی Chakra UI
const theme = extendTheme({
  colors: {
    brand: {
      50: '#f5e9ff',
      100: '#dac1ff',
      200: '#c098ff',
      300: '#a66eff',
      400: '#8c45ff',
      500: '#722be6',
      600: '#5a21b4',
      700: '#411882',
      800: '#290f51',
      900: '#130521',
    },
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: true,
  },
});

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  useEffect(() => {
    // Clear localStorage to reset the database on app start
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tubewise_db');
    }
    
    // Initialize analytics service
    analyticsService.init();
    
  }, []);
  
  // Handle global errors
  const handleGlobalError = (error: AppError) => {
    // Log error to analytics
    logError(error);
    
    // You could also implement additional error handling here
    // such as showing a modal for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      // Handle critical errors
      console.error('Critical error:', error);
    }
  };
  
  return (
    <ErrorBoundary
      onError={handleGlobalError}
      fallback={(error) => (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">خطایی رخ داده است</h2>
            <p className="text-gray-700 mb-6">متأسفانه خطایی در برنامه رخ داده است. لطفاً صفحه را بارگذاری مجدد کنید.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              بارگذاری مجدد صفحه
            </button>
          </div>
        </div>
      )}
    >
      <SessionProvider session={session}>
        <AuthProvider>
          <ChakraProvider theme={theme}>
            <Layout>
              <Component {...pageProps} />
            </Layout>
            <ToastContainer />
          </ChakraProvider>
        </AuthProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}

export default appWithTranslation(MyApp);
