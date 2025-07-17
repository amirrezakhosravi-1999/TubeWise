import type { NextApiRequest, NextApiResponse } from 'next';
import { ErrorType, ErrorSeverity, createError, handleError, handleApiError, getUserFriendlyErrorMessage } from '../../utils/errorHandler';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const testResults: any = {
    createErrorTests: [],
    handleApiErrorTests: [],
    handleErrorTests: [],
  };

  // Test creating different types of errors
  const errors = [
    createError(
      ErrorType.VALIDATION,
      'Invalid input data',
      ErrorSeverity.WARNING,
      { field: 'email', value: 'invalid-email' },
      new Error('Validation failed'),
      'VALIDATION_ERROR'
    ),
    createError(
      ErrorType.AUTHENTICATION,
      'Authentication required',
      ErrorSeverity.ERROR
    ),
    createError(
      ErrorType.NETWORK,
      'Network connection lost',
      ErrorSeverity.ERROR
    ),
    createError(
      ErrorType.UNEXPECTED,
      'An unexpected error occurred',
      ErrorSeverity.CRITICAL,
      { stackTrace: 'mock stack trace' }
    )
  ];
  
  errors.forEach((error) => {
    testResults.createErrorTests.push({
      type: error.type,
      message: error.message,
      severity: error.severity,
      code: error.code || 'N/A',
      hasDetails: !!error.details,
      hasOriginalError: !!error.originalError,
      timestamp: error.timestamp.toISOString()
    });
  });

  // Test handling API errors
  const apiErrors = [
    { // 400 Bad Request
      response: {
        status: 400,
        data: {
          message: 'Invalid request parameters'
        }
      }
    },
    { // 401 Unauthorized
      response: {
        status: 401,
        data: {
          message: 'Authentication required'
        }
      }
    },
    { // 403 Forbidden
      response: {
        status: 403,
        data: {
          message: 'Insufficient permissions'
        }
      }
    },
    { // 404 Not Found
      response: {
        status: 404,
        data: {
          message: 'Resource not found'
        }
      }
    },
    { // 429 Too Many Requests
      response: {
        status: 429,
        data: {
          message: 'Rate limit exceeded'
        }
      }
    },
    { // 500 Server Error
      response: {
        status: 500,
        data: {
          message: 'Internal server error'
        }
      }
    },
    { // Network Error
      request: {},
      message: 'Network Error'
    },
    { // Unknown Error
      message: 'Unknown error'
    }
  ];
  
  apiErrors.forEach((apiError) => {
    const error = handleApiError(apiError);
    const userMessage = getUserFriendlyErrorMessage(error);
    
    testResults.handleApiErrorTests.push({
      type: error.type,
      message: error.message,
      severity: error.severity,
      code: error.code || 'N/A',
      userMessage: userMessage
    });
  });

  // Test main error handler
  const testHandleErrors = [
    // API error
    {
      response: {
        status: 404,
        data: {
          message: 'Resource not found'
        }
      }
    },
    // Subscription error
    {
      type: ErrorType.SUBSCRIPTION,
      message: 'Subscription expired',
      details: { plan: 'Pro', expiredAt: '2023-04-01' }
    },
    // Payment error
    {
      type: ErrorType.PAYMENT,
      message: 'Payment failed',
      code: 'CARD_DECLINED'
    },
    // App error
    createError(
      ErrorType.VALIDATION,
      'Invalid input',
      ErrorSeverity.WARNING
    ),
    // Unknown error
    new Error('Something went wrong')
  ];
  
  testHandleErrors.forEach((error) => {
    const result = handleError(error);
    
    testResults.handleErrorTests.push({
      appErrorType: result.appError.type,
      appErrorMessage: result.appError.message,
      userMessage: result.userMessage
    });
  });

  // Return test results
  res.status(200).json({
    success: true,
    message: 'Error handler tests completed successfully',
    results: testResults
  });
}
