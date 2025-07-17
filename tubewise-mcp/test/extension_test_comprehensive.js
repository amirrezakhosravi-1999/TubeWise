/**
 * Comprehensive Test for TubeWise Chrome Extension
 * 
 * This script tests all major components and functionality of the TubeWise Chrome extension.
 * Run this in the browser console when on a YouTube page with the extension active.
 */

const testExtensionComprehensive = async () => {
  console.log('=== TubeWise Chrome Extension Comprehensive Test ===');
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
    // 1. Test YouTube Page Detection
    console.log('\n1. Testing YouTube Page Detection');
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    if (isYouTube) {
      logPass('YouTube page detected');
      
      // Check if it's a video page
      const isVideoPage = window.location.pathname === '/watch' && new URLSearchParams(window.location.search).has('v');
      if (isVideoPage) {
        logPass('YouTube video page detected');
        
        // Get video ID
        const videoId = new URLSearchParams(window.location.search).get('v');
        console.log(`Video ID: ${videoId}`);
      } else {
        logWarning('Not on a YouTube video page, some tests may fail');
      }
    } else {
      logFail('Not on a YouTube page');
      return {
        success: false,
        results
      };
    }
    
    // 2. Test Extension Sidebar Injection
    console.log('\n2. Testing Extension Sidebar Injection');
    
    // Try different possible selectors for the TubeWise sidebar
    const sidebarExists = testComponent('TubeWise Sidebar', '#tubewise-sidebar') || 
                         testComponent('TubeWise Sidebar', '.tubewise-sidebar') ||
                         testComponent('TubeWise Sidebar', '[data-extension="tubewise"]');
    
    if (!sidebarExists) {
      logFail('TubeWise sidebar not found. Is the extension active?');
      return {
        success: false,
        results
      };
    }
    
    // 3. Test Sidebar Functionality
    console.log('\n3. Testing Sidebar Functionality');
    
    // Test summary tab
    testComponent('Summary Tab', '#tubewise-summary-tab') || 
    testComponent('Summary Tab', '.tubewise-summary-tab') ||
    testComponent('Summary Tab', '[data-tab="summary"]');
    
    // Test chat tab
    testComponent('Chat Tab', '#tubewise-chat-tab') || 
    testComponent('Chat Tab', '.tubewise-chat-tab') ||
    testComponent('Chat Tab', '[data-tab="chat"]');
    
    // Test transcript tab
    testComponent('Transcript Tab', '#tubewise-transcript-tab') || 
    testComponent('Transcript Tab', '.tubewise-transcript-tab') ||
    testComponent('Transcript Tab', '[data-tab="transcript"]');
    
    // 4. Test Summary Functionality
    console.log('\n4. Testing Summary Functionality');
    
    // Check for summary content
    const summaryContent = document.querySelector('#tubewise-summary-content') || 
                          document.querySelector('.tubewise-summary-content') ||
                          document.querySelector('[data-content="summary"]');
    
    if (summaryContent) {
      logPass('Summary content container found');
      
      // Check if summary is loaded or has a loading state
      if (summaryContent.textContent.trim() !== '') {
        logPass('Summary content is not empty');
      } else {
        // Check for loading indicator
        const loadingIndicator = summaryContent.querySelector('.loading') || 
                                summaryContent.querySelector('[data-loading]') ||
                                summaryContent.querySelector('.spinner');
        
        if (loadingIndicator) {
          logPass('Summary loading indicator found');
        } else {
          logWarning('Summary content is empty and no loading indicator found');
        }
      }
    } else {
      logFail('Summary content container not found');
    }
    
    // 5. Test Chat Functionality
    console.log('\n5. Testing Chat Functionality');
    
    // Check for chat input
    const chatInput = document.querySelector('#tubewise-chat-input') || 
                     document.querySelector('.tubewise-chat-input') ||
                     document.querySelector('input[placeholder*="Ask"]') ||
                     document.querySelector('textarea[placeholder*="Ask"]');
    
    if (chatInput) {
      logPass('Chat input found');
      
      // Check for chat messages container
      const chatMessages = document.querySelector('#tubewise-chat-messages') || 
                          document.querySelector('.tubewise-chat-messages') ||
                          document.querySelector('[data-content="chat-messages"]');
      
      if (chatMessages) {
        logPass('Chat messages container found');
      } else {
        logFail('Chat messages container not found');
      }
    } else {
      logFail('Chat input not found');
    }
    
    // 6. Test Transcript Functionality
    console.log('\n6. Testing Transcript Functionality');
    
    // Check for transcript container
    const transcriptContainer = document.querySelector('#tubewise-transcript') || 
                               document.querySelector('.tubewise-transcript') ||
                               document.querySelector('[data-content="transcript"]');
    
    if (transcriptContainer) {
      logPass('Transcript container found');
      
      // Check if transcript is loaded or has a loading state
      if (transcriptContainer.textContent.trim() !== '') {
        logPass('Transcript content is not empty');
      } else {
        // Check for loading indicator
        const loadingIndicator = transcriptContainer.querySelector('.loading') || 
                                transcriptContainer.querySelector('[data-loading]') ||
                                transcriptContainer.querySelector('.spinner');
        
        if (loadingIndicator) {
          logPass('Transcript loading indicator found');
        } else {
          logWarning('Transcript content is empty and no loading indicator found');
        }
      }
    } else {
      logFail('Transcript container not found');
    }
    
    // 7. Test YouTube Player Integration
    console.log('\n7. Testing YouTube Player Integration');
    
    // Check if YouTube player is available
    const youtubePlayer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
    if (youtubePlayer) {
      logPass('YouTube player found');
      
      // Check for timestamp links
      const timestampLinks = document.querySelectorAll('a[href*="t="]') || 
                            document.querySelectorAll('[data-timestamp]') ||
                            document.querySelectorAll('.timestamp');
      
      if (timestampLinks.length > 0) {
        logPass(`${timestampLinks.length} timestamp links found`);
      } else {
        logWarning('No timestamp links found');
      }
    } else {
      logFail('YouTube player not found');
    }
    
    // 8. Test Extension UI
    console.log('\n8. Testing Extension UI');
    
    // Check for extension toggle button
    const toggleButton = document.querySelector('#tubewise-toggle') || 
                        document.querySelector('.tubewise-toggle') ||
                        document.querySelector('[data-action="toggle-sidebar"]');
    
    if (toggleButton) {
      logPass('Extension toggle button found');
    } else {
      logWarning('Extension toggle button not found');
    }
    
    // Check for extension settings
    const settingsButton = document.querySelector('#tubewise-settings') || 
                          document.querySelector('.tubewise-settings') ||
                          document.querySelector('[data-action="settings"]');
    
    if (settingsButton) {
      logPass('Extension settings button found');
    } else {
      logWarning('Extension settings button not found');
    }
    
    // 9. Test API Communication
    console.log('\n9. Testing API Communication');
    
    // This is difficult to test directly from the console
    // We'll check for signs that API communication is working
    
    // Check localStorage for API URL or token
    const hasApiConfig = localStorage.getItem('tubewise_api_url') || 
                        localStorage.getItem('tubewise_token') ||
                        localStorage.getItem('tubewise_auth');
    
    if (hasApiConfig) {
      logPass('API configuration found in localStorage');
    } else {
      logWarning('No API configuration found in localStorage');
    }
    
    // 10. Test Authentication
    console.log('\n10. Testing Authentication');
    
    // Check for user info or login button
    const userInfo = document.querySelector('#tubewise-user-info') || 
                    document.querySelector('.tubewise-user-info') ||
                    document.querySelector('[data-user]');
    
    const loginButton = document.querySelector('#tubewise-login') || 
                       document.querySelector('.tubewise-login') ||
                       document.querySelector('[data-action="login"]');
    
    if (userInfo) {
      logPass('User info found, user is logged in');
    } else if (loginButton) {
      logPass('Login button found, user is not logged in');
    } else {
      logWarning('Neither user info nor login button found');
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
testExtensionComprehensive().then(result => {
  console.log(`Overall test result: ${result.success ? 'PASSED' : 'FAILED'}`);
});
