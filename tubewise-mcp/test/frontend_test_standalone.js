/**
 * Standalone Frontend Test for TubeWise Web Client
 * 
 * This script tests the frontend components without requiring the backend services to be running.
 * It mocks API responses to simulate backend functionality.
 */

// Mock API responses
const mockApiResponses = {
  summary: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    summary: 'The music video features Rick Astley performing his hit song "Never Gonna Give You Up". The song is about commitment and loyalty in a relationship, with Rick promising to never give up on his partner. The video shows Rick dancing in various locations while singing the song.',
    keyPoints: [
      { timestamp: '0:15', point: 'Rick begins singing the iconic chorus' },
      { timestamp: '0:53', point: 'The famous dance move sequence begins' },
      { timestamp: '1:24', point: 'Second chorus with more energetic dancing' },
      { timestamp: '2:12', point: 'Bridge section with different camera angles' },
      { timestamp: '2:45', point: 'Final chorus with full choreography' }
    ]
  },
  chat: {
    videoId: 'dQw4w9WgXcQ',
    response: 'The song "Never Gonna Give You Up" was released in 1987 and became a worldwide hit. It reached number one in many countries including the UK and US. The song has experienced a resurgence in popularity due to the "Rickrolling" internet meme.',
    timeline_suggestions: [
      { timestamp: '0:15', text: 'Start of the chorus', relevance: 'high' },
      { timestamp: '0:53', text: 'Iconic dance sequence', relevance: 'high' }
    ]
  },
  comparison: {
    commonTopics: ['1980s music', 'Pop culture', 'Dance choreography'],
    differences: ['Different release years', 'Varying musical styles', 'Different artists'],
    recommendation: 'Both videos represent iconic moments in pop music history, though they differ in style and era.'
  },
  content: {
    content: '🎵 Just analyzed "Never Gonna Give You Up" by Rick Astley (1987)\n\n1/ This iconic 80s hit became one of the most recognizable songs in internet culture\n\n2/ The song is about unwavering loyalty and commitment in a relationship\n\n3/ Key moment at 0:53 - The famous dance sequence that launched countless memes\n\n4/ The song reached #1 in 25 countries when released\n\n5/ It has over 1 billion views on YouTube today\n\n#MusicHistory #Rickroll',
    format: 'twitter',
    title: 'Rick Astley - Never Gonna Give You Up Analysis'
  }
};

// Mock fetch API
window.fetch = async (url, options) => {
  console.log(`Mock fetch called for: ${url}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Parse the request body if it exists
  let requestBody = {};
  if (options && options.body) {
    try {
      requestBody = JSON.parse(options.body);
    } catch (e) {
      console.error('Error parsing request body:', e);
    }
  }
  
  // Return appropriate mock response based on URL
  if (url.includes('/api/summarize')) {
    return {
      ok: true,
      status: 200,
      json: async () => mockApiResponses.summary
    };
  } else if (url.includes('/api/chat')) {
    return {
      ok: true,
      status: 200,
      json: async () => mockApiResponses.chat
    };
  } else if (url.includes('/api/compare')) {
    return {
      ok: true,
      status: 200,
      json: async () => mockApiResponses.comparison
    };
  } else if (url.includes('/api/generate')) {
    return {
      ok: true,
      status: 200,
      json: async () => mockApiResponses.content
    };
  } else if (url.includes('/health')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', message: 'Service is healthy' })
    };
  } else {
    return {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    };
  }
};

// Test function
const testFrontendStandalone = async () => {
  console.log('=== TubeWise Frontend Standalone Test ===');
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

  // Helper function to fill a form input
  const fillInput = (selector, value) => {
    const input = document.querySelector(selector);
    if (!input) {
      logFail(`Input not found: ${selector}`);
      return false;
    }
    
    // Set the value
    input.value = value;
    
    // Trigger input event
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
    
    logPass(`Filled input ${selector} with value: ${value}`);
    return true;
  };

  // Helper function to click a button
  const clickButton = (selector) => {
    const button = document.querySelector(selector);
    if (!button) {
      logFail(`Button not found: ${selector}`);
      return false;
    }
    
    // Click the button
    button.click();
    
    logPass(`Clicked button: ${selector}`);
    return true;
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
    
    // 2. Test Video Input Form
    console.log('\n2. Testing Video Input Form');
    
    const videoForm = document.querySelector('form input[type="text"]');
    if (videoForm) {
      logPass('Video input form found');
      
      // Fill the input with a YouTube URL
      fillInput('form input[type="text"]', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      // Submit the form
      const form = videoForm.closest('form');
      if (form) {
        // Try to find a submit button
        const submitButton = form.querySelector('button[type="submit"]') || 
                            form.querySelector('input[type="submit"]') ||
                            form.querySelector('button');
        
        if (submitButton) {
          logPass('Submit button found');
          
          // Click the submit button
          submitButton.click();
          logPass('Form submitted');
          
          // Wait for the summary to load
          console.log('Waiting for summary to load...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if summary is displayed
          if (elementExists('.summary-container') || 
              elementExists('[data-testid="summary-container"]') ||
              elementExists('[class*="summary"]')) {
            logPass('Summary component rendered after form submission');
          } else {
            logWarning('Summary component not found after form submission');
          }
        } else {
          logWarning('Submit button not found, cannot test form submission');
        }
      } else {
        logWarning('Form element not found, cannot test form submission');
      }
    } else {
      logFail('Video input form not found');
    }
    
    // 3. Test UI Components
    console.log('\n3. Testing UI Components');
    
    // Test for Chakra UI components
    if (elementExists('[class*="chakra"]')) {
      logPass('Chakra UI components detected');
    } else {
      logWarning('Chakra UI components not detected');
    }
    
    // Test for responsive design
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    console.log(`Viewport size: ${viewportWidth}x${viewportHeight}`);
    
    // Check if viewport meta tag is set correctly
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta && viewportMeta.content.includes('width=device-width')) {
      logPass('Viewport meta tag is configured correctly for responsive design');
    } else {
      logWarning('Viewport meta tag may not be configured correctly');
    }
    
    // 4. Test Navigation
    console.log('\n4. Testing Navigation');
    
    // Check for navigation links
    const navLinks = document.querySelectorAll('nav a') || document.querySelectorAll('header a');
    if (navLinks.length > 0) {
      logPass(`Found ${navLinks.length} navigation links`);
      
      // Log the navigation links
      console.log('Navigation links:');
      navLinks.forEach(link => {
        console.log(`- ${link.textContent.trim()} (${link.getAttribute('href')})`);
      });
    } else {
      logWarning('No navigation links found');
    }
    
    // 5. Test Internationalization
    console.log('\n5. Testing Internationalization');
    
    // Check for language selector
    const langSelector = document.querySelector('[data-testid="language-selector"]') || 
                        document.querySelector('select[name="language"]') ||
                        document.querySelector('[class*="language-selector"]');
    
    if (langSelector) {
      logPass('Language selector found');
    } else {
      logWarning('Language selector not found');
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
console.log('Starting frontend tests with mocked API responses...');
testFrontendStandalone().then(result => {
  console.log(`Overall test result: ${result.success ? 'PASSED' : 'FAILED'}`);
});
