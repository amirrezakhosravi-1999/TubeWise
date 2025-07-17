// Simple test script for error handler

const { ErrorType, ErrorSeverity, createError, handleError } = require('./errorHandler');

// Test creating different types of errors
function testCreateError() {
  console.log('=== Testing createError ===');
  
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
  
  errors.forEach((error, index) => {
    console.log(`\nError ${index + 1}:`);
    console.log(`- Type: ${error.type}`);
    console.log(`- Message: ${error.message}`);
    console.log(`- Severity: ${error.severity}`);
    console.log(`- Code: ${error.code || 'N/A'}`);
    console.log(`- Has details: ${error.details ? 'Yes' : 'No'}`);
    console.log(`- Has original error: ${error.originalError ? 'Yes' : 'No'}`);
    console.log(`- Timestamp: ${error.timestamp}`);
  });
  
  return errors;
}

// Test handling API errors
function testHandleApiError() {
  console.log('\n=== Testing handleApiError ===');
  
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
  
  apiErrors.forEach((apiError, index) => {
    const { handleApiError } = require('./errorHandler');
    const error = handleApiError(apiError);
    
    console.log(`\nAPI Error ${index + 1}:`);
    console.log(`- Type: ${error.type}`);
    console.log(`- Message: ${error.message}`);
    console.log(`- Severity: ${error.severity}`);
    console.log(`- Code: ${error.code || 'N/A'}`);
    
    // Get user-friendly message
    const { getUserFriendlyErrorMessage } = require('./errorHandler');
    const userMessage = getUserFriendlyErrorMessage(error);
    console.log(`- User Message: ${userMessage}`);
  });
}

// Test main error handler
function testHandleError() {
  console.log('\n=== Testing handleError ===');
  
  const errors = [
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
  
  errors.forEach((error, index) => {
    const result = handleError(error);
    
    console.log(`\nHandled Error ${index + 1}:`);
    console.log(`- App Error Type: ${result.appError.type}`);
    console.log(`- App Error Message: ${result.appError.message}`);
    console.log(`- User Message: ${result.userMessage}`);
  });
}

// Run all tests
function runAllTests() {
  console.log('STARTING ERROR HANDLER TESTS\n');
  
  const errors = testCreateError();
  testHandleApiError();
  testHandleError();
  
  console.log('\nALL TESTS COMPLETED');
}

runAllTests();
