import React, { useState } from 'react';
import { Box, Button, VStack, Heading, Text, useColorModeValue, SimpleGrid, Divider } from '@chakra-ui/react';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useApiError } from '../hooks/useApiError';
import { useToast } from '../hooks/useToast';
import { ErrorType, ErrorSeverity, createError, handleError } from '../utils/errorHandler';
import { logger, LogCategory } from '../utils/logger';

// Component that will throw an error
const ErrorThrower = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  
  if (shouldThrow) {
    throw new Error('این یک خطای آزمایشی است!');
  }
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="md">
      <Heading size="md" mb={4}>تست ErrorBoundary</Heading>
      <Text mb={4}>این کامپوننت برای تست ErrorBoundary طراحی شده است.</Text>
      <Button colorScheme="red" onClick={() => setShouldThrow(true)}>
        ایجاد خطای رندرینگ
      </Button>
    </Box>
  );
};

// Test page for error handling
const TestErrorHandling = () => {
  const toast = useToast();
  const { handleApiError, error, isError, clearError } = useApiError();
  const bgColor = useColorModeValue('white', 'gray.800');
  
  // Test toast notifications
  const testToastNotifications = () => {
    toast.success('این یک پیام موفقیت است');
    setTimeout(() => {
      toast.error('این یک پیام خطا است');
    }, 1000);
    setTimeout(() => {
      toast.info('این یک پیام اطلاعات است');
    }, 2000);
    setTimeout(() => {
      toast.warning('این یک پیام هشدار است');
    }, 3000);
    
    logger.info(LogCategory.USER_ACTION, 'کاربر تست اعلان‌ها را اجرا کرد');
  };
  
  // Test error handler
  const testErrorHandler = () => {
    try {
      // Simulate an error
      throw new Error('این یک خطای آزمایشی است');
    } catch (err) {
      const appError = createError(
        ErrorType.UNEXPECTED,
        'این یک خطای آزمایشی است',
        ErrorSeverity.ERROR,
        { test: true },
        err
      );
      
      const { userMessage } = handleError(appError);
      toast.error(userMessage);
      
      logger.error(LogCategory.SYSTEM, 'خطای آزمایشی ایجاد شد', { error: appError });
    }
  };
  
  // Test API error handling
  const testApiErrorHandling = () => {
    // Simulate an API error
    const apiError = {
      response: {
        status: 404,
        data: {
          message: 'منبع مورد نظر یافت نشد'
        }
      }
    };
    
    handleApiError(apiError);
    logger.error(LogCategory.API, 'خطای API آزمایشی', { error: apiError });
  };
  
  // Test different error types
  const testDifferentErrorTypes = () => {
    const errorTypes = [
      { type: ErrorType.VALIDATION, message: 'خطای اعتبارسنجی', severity: ErrorSeverity.WARNING },
      { type: ErrorType.AUTHENTICATION, message: 'خطای احراز هویت', severity: ErrorSeverity.ERROR },
      { type: ErrorType.AUTHORIZATION, message: 'خطای مجوز', severity: ErrorSeverity.ERROR },
      { type: ErrorType.NETWORK, message: 'خطای شبکه', severity: ErrorSeverity.WARNING },
      { type: ErrorType.RESOURCE_NOT_FOUND, message: 'منبع یافت نشد', severity: ErrorSeverity.WARNING },
      { type: ErrorType.RATE_LIMIT, message: 'محدودیت نرخ', severity: ErrorSeverity.WARNING },
      { type: ErrorType.SUBSCRIPTION, message: 'خطای اشتراک', severity: ErrorSeverity.WARNING },
      { type: ErrorType.PAYMENT, message: 'خطای پرداخت', severity: ErrorSeverity.ERROR }
    ];
    
    errorTypes.forEach((item, index) => {
      setTimeout(() => {
        const appError = createError(item.type, item.message, item.severity);
        const { userMessage } = handleError(appError);
        toast.error(userMessage);
        
        logger.error(LogCategory.SYSTEM, `خطای آزمایشی: ${item.type}`, { error: appError });
      }, index * 1000);
    });
  };
  
  return (
    <Box p={8} maxWidth="1200px" mx="auto">
      <Heading mb={8} textAlign="center">تست سیستم مدیریت خطا</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
        <ErrorBoundary>
          <ErrorThrower />
        </ErrorBoundary>
        
        <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor}>
          <Heading size="md" mb={4}>تست اعلان‌ها (Toast)</Heading>
          <Text mb={4}>این بخش برای تست اعلان‌های مختلف طراحی شده است.</Text>
          <Button colorScheme="blue" onClick={testToastNotifications}>
            نمایش اعلان‌ها
          </Button>
        </Box>
      </SimpleGrid>
      
      <Divider my={8} />
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
        <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor}>
          <Heading size="md" mb={4}>تست Error Handler</Heading>
          <Text mb={4}>این بخش برای تست سیستم مدیریت خطا طراحی شده است.</Text>
          <Button colorScheme="purple" onClick={testErrorHandler}>
            ایجاد خطا
          </Button>
        </Box>
        
        <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor}>
          <Heading size="md" mb={4}>تست API Error</Heading>
          <Text mb={4}>این بخش برای تست مدیریت خطاهای API طراحی شده است.</Text>
          <Button colorScheme="orange" onClick={testApiErrorHandling}>
            شبیه‌سازی خطای API
          </Button>
        </Box>
        
        <Box p={4} borderWidth="1px" borderRadius="md" bg={bgColor}>
          <Heading size="md" mb={4}>تست انواع خطا</Heading>
          <Text mb={4}>این بخش برای تست انواع مختلف خطا طراحی شده است.</Text>
          <Button colorScheme="teal" onClick={testDifferentErrorTypes}>
            نمایش انواع خطا
          </Button>
        </Box>
      </SimpleGrid>
      
      {isError && (
        <Box mt={8} p={4} borderWidth="1px" borderRadius="md" bg="red.50">
          <Heading size="md" mb={4}>خطای فعلی</Heading>
          <Text mb={2}><strong>نوع:</strong> {error?.type}</Text>
          <Text mb={2}><strong>پیام:</strong> {error?.message}</Text>
          <Text mb={2}><strong>شدت:</strong> {error?.severity}</Text>
          <Text mb={4}><strong>کد:</strong> {error?.code || 'بدون کد'}</Text>
          <Button colorScheme="red" onClick={clearError}>
            پاک کردن خطا
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TestErrorHandling;
