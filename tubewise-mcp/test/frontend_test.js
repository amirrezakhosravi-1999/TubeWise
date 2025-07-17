/**
 * Comprehensive Frontend Test for TubeWise Web Client
 * 
 * This script tests all major components and functionality of the TubeWise web client.
 * Run this in the browser console when visiting the TubeWise web app.
 */

const testFrontend = async () => {
  console.log('=== TubeWise Frontend Comprehensive Test ===');
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    total: 0
  };

  const logPass = (message) => {
    console.log(`✅ PASS: ${message}`);
    results.passed++;
    results.total++;
  };

  const logFail = (message) => {
    console.error(`❌ FAIL: ${message}`);
    results.failed++;
    results.total++;
  };

  const logWarning = (message) => {
    console.warn(`⚠️ WARNING: ${message}`);
    results.warnings++;
    results.total++;
  };

  // Helper function to test if an element exists
  const elementExists = (selector) => {
    return document.querySelector(selector) !== null;
  };

  // Helper function to test if a component renders properly
  const testComponent = (name, selector) => {
    console.log(`\nTesting ${name} Component`);
    if (elementExists(selector)) {
      logPass(`${name} component rendered successfully`);
      return true;
    } else {
      logFail(`${name} component not found`);
      return false;
    }
  };

  try {
    // 1. Test Core Components
    console.log('\n1. Testing Core Components');
    
    // Header
    testComponent('Header', 'header');
    
    // Footer
    testComponent('Footer', 'footer');
    
    // Main Content
    testComponent('Main Content', 'main');
    
    // 2. Test Routing
    console.log('\n2. Testing Routing');
    
    // Check if Next.js router is available
    if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
      logPass('Next.js router is available');
      
      // Log current route
      const currentPath = window.location.pathname;
      console.log(`Current route: ${currentPath}`);
    } else {
      logWarning('Next.js router not detected, routing tests skipped');
    }
    
    // 3. Test Authentication Context
    console.log('\n3. Testing Authentication Context');
    
    // Check if auth context is available
    if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      // This is a hacky way to check for React context, but it's the best we can do in the console
      logPass('React is available for context testing');
    } else {
      logWarning('Cannot directly test React context in console');
    }
    
    // Check for login/signup links or user info
    if (elementExists('a[href="/login"]') || elementExists('a[href="/signup"]') || elementExists('[data-testid="user-menu"]')) {
      logPass('Authentication UI elements found');
    } else {
      logFail('Authentication UI elements not found');
    }
    
    // 4. Test Video Input Form
    console.log('\n4. Testing Video Input Form');
    
    const videoForm = document.querySelector('form input[type="text"]');
    if (videoForm) {
      logPass('Video input form found');
      
      // Test form submission (just check if the form has an onSubmit handler)
      const form = videoForm.closest('form');
      if (form && form.onsubmit) {
        logPass('Form has submit handler');
      } else {
        logWarning('Form may not have submit handler');
      }
    } else {
      logFail('Video input form not found');
    }
    
    // 5. Test Internationalization
    console.log('\n5. Testing Internationalization');
    
    // Check if i18n is available
    const i18n = window.i18n || window.__NEXT_DATA__?.props?.pageProps?.i18n;
    if (i18n) {
      logPass('i18n is configured');
      console.log(`Current language: ${i18n.language || 'unknown'}`);
    } else {
      // Try to find language selector
      if (elementExists('[data-testid="language-selector"]') || elementExists('select[name="language"]')) {
        logPass('Language selector found');
      } else {
        logWarning('i18n not detected, but this might be normal depending on the implementation');
      }
    }
    
    // 6. Test Responsive Design
    console.log('\n6. Testing Responsive Design');
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    console.log(`Viewport size: ${viewportWidth}x${viewportHeight}`);
    
    // Check if viewport meta tag is set correctly
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta && viewportMeta.content.includes('width=device-width')) {
      logPass('Viewport meta tag is configured correctly');
    } else {
      logWarning('Viewport meta tag may not be configured correctly');
    }
    
    // Check for media queries (indirect test)
    const bodyStyles = window.getComputedStyle(document.body);
    const hasFlex = bodyStyles.display === 'flex' || bodyStyles.display === 'grid';
    if (hasFlex) {
      logPass('Modern layout techniques detected (flex/grid)');
    } else {
      logWarning('Modern layout techniques not detected, might affect responsiveness');
    }
    
    // 7. Test API Connection
    console.log('\n7. Testing API Connection');
    
    // Check if API URL is configured
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      logPass(`API URL configured as: ${apiUrl}`);
      
      // Test API health endpoint
      try {
        const response = await fetch(`${apiUrl}/health`);
        if (response.ok) {
          const data = await response.json();
          logPass(`API health check successful: ${JSON.stringify(data)}`);
        } else {
          logFail(`API health check failed with status: ${response.status}`);
        }
      } catch (error) {
        logFail(`API health check failed: ${error.message}`);
      }
    } else {
      logFail('API URL is not configured');
    }
    
    // 8. Test Feature Components
    console.log('\n8. Testing Feature Components');
    
    // Summary component
    testComponent('Summary', '[data-testid="summary-container"]') || 
    testComponent('Summary', '.summary-container') ||
    testComponent('Summary', '[class*="summary"]');
    
    // Chat component
    testComponent('Chat', '[data-testid="chat-container"]') || 
    testComponent('Chat', '.chat-container') ||
    testComponent('Chat', '[class*="chat"]');
    
    // Content generation component
    testComponent('Content Generation', '[data-testid="content-generation"]') || 
    testComponent('Content Generation', '.content-generation') ||
    testComponent('Content Generation', '[class*="generation"]');
    
    // Comparison component
    testComponent('Comparison', '[data-testid="comparison-container"]') || 
    testComponent('Comparison', '.comparison-container') ||
    testComponent('Comparison', '[class*="comparison"]');
    
    // 9. Test UI Framework
    console.log('\n9. Testing UI Framework');
    
    // Check for Chakra UI
    if (document.querySelector('[class*="chakra"]')) {
      logPass('Chakra UI detected');
    } else if (document.querySelector('[class*="MuiBox"]') || document.querySelector('[class*="MuiButton"]')) {
      logPass('Material UI detected');
    } else if (document.querySelector('[class*="ant-"]')) {
      logPass('Ant Design detected');
    } else {
      logWarning('Could not detect UI framework');
    }
    
    // 10. Test Performance
    console.log('\n10. Testing Performance');
    
    // Check if the page loaded quickly
    if (window.performance) {
      const pageLoadTime = window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart;
      console.log(`Page load time: ${pageLoadTime}ms`);
      
      if (pageLoadTime < 1000) {
        logPass('Page loaded quickly (< 1s)');
      } else if (pageLoadTime < 3000) {
        logPass('Page loaded in acceptable time (< 3s)');
      } else {
        logWarning('Page load time is slow (> 3s)');
      }
    } else {
      logWarning('Performance API not available');
    }
    
    // 11. Test Error Handling
    console.log('\n11. Testing Error Handling');
    
    // Check if error boundaries are in place (indirect test)
    if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
      logPass('React is available for error boundaries');
    } else {
      logWarning('Cannot directly test error boundaries in console');
    }
    
    // Check for toast/notification components
    if (document.querySelector('[role="alert"]') || 
        document.querySelector('[class*="toast"]') || 
        document.querySelector('[class*="notification"]') ||
        document.querySelector('[class*="alert"]')) {
      logPass('Notification/alert components detected');
    } else {
      logWarning('Notification/alert components not detected');
    }
    
    // 12. Test Accessibility
    console.log('\n12. Testing Accessibility');
    
    // Check for basic accessibility features
    const hasAltTags = Array.from(document.querySelectorAll('img')).every(img => img.alt);
    if (hasAltTags) {
      logPass('All images have alt tags');
    } else {
      logWarning('Some images may be missing alt tags');
    }
    
    // Check for ARIA attributes
    const hasAriaAttributes = document.querySelector('[aria-label]') || 
                             document.querySelector('[aria-describedby]') || 
                             document.querySelector('[role]');
    if (hasAriaAttributes) {
      logPass('ARIA attributes detected');
    } else {
      logWarning('ARIA attributes not detected');
    }
    
    // Final Results
    console.log('\n=== Test Results ===');
    console.log(`Total tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Warnings: ${results.warnings}`);
    
    const passRate = (results.passed / results.total) * 100;
    console.log(`Pass rate: ${passRate.toFixed(2)}%`);
    
    if (results.failed === 0) {
      console.log('\n✅ All critical tests passed!');
      if (results.warnings > 0) {
        console.log(`⚠️ But there are ${results.warnings} warnings to address.`);
      }
    } else {
      console.log(`\n❌ ${results.failed} tests failed. Please fix these issues.`);
    }
    
    return {
      success: results.failed === 0,
      results
    };
  } catch (error) {
    console.error('Test suite error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Run the tests
testFrontend().then(result => {
  console.log(`Overall test result: ${result.success ? 'PASSED' : 'FAILED'}`);
});
