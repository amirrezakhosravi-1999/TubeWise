/**
 * Simple test script for TubeWise web client
 * This script can be run in a browser console when visiting the TubeWise web app
 */

const testWebClient = async () => {
  console.log('=== TubeWise Web Client Tests ===');
  
  // Test 1: Check if API connection is configured
  console.log('\n1. Testing API Configuration');
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.NEXT_PUBLIC_API_URL;
    console.log(`API URL configured as: ${apiUrl}`);
    if (!apiUrl) {
      console.error('❌ FAIL: API URL is not configured');
      return false;
    }
    console.log('✅ PASS: API URL is configured');
  } catch (error) {
    console.error(`❌ FAIL: Error checking API configuration: ${error.message}`);
    return false;
  }
  
  // Test 2: Check if the main components are loaded
  console.log('\n2. Testing UI Components');
  try {
    const components = [
      { name: 'Header', selector: 'header' },
      { name: 'Footer', selector: 'footer' },
      { name: 'Main Content', selector: 'main' },
    ];
    
    let allComponentsLoaded = true;
    for (const component of components) {
      const element = document.querySelector(component.selector);
      if (!element) {
        console.error(`❌ FAIL: ${component.name} component not found`);
        allComponentsLoaded = false;
      } else {
        console.log(`✅ PASS: ${component.name} component loaded`);
      }
    }
    
    if (!allComponentsLoaded) {
      return false;
    }
  } catch (error) {
    console.error(`❌ FAIL: Error checking UI components: ${error.message}`);
    return false;
  }
  
  // Test 3: Check if video input form exists
  console.log('\n3. Testing Video Input Form');
  try {
    const videoForm = document.querySelector('form input[type="text"]');
    if (!videoForm) {
      console.error('❌ FAIL: Video input form not found');
      return false;
    }
    console.log('✅ PASS: Video input form found');
  } catch (error) {
    console.error(`❌ FAIL: Error checking video form: ${error.message}`);
    return false;
  }
  
  // Test 4: Check if i18n is working
  console.log('\n4. Testing Internationalization');
  try {
    // This assumes you have a global i18n object or function
    const i18n = window.i18n || window.__NEXT_DATA__?.props?.pageProps?.i18n;
    if (!i18n) {
      console.warn('⚠️ WARNING: i18n object not found, cannot verify internationalization');
    } else {
      console.log(`Current language: ${i18n.language || 'unknown'}`);
      console.log('✅ PASS: i18n is configured');
    }
  } catch (error) {
    console.error(`❌ FAIL: Error checking i18n: ${error.message}`);
  }
  
  console.log('\n=== Test Summary ===');
  console.log('Web client appears to be functioning correctly');
  console.log('For complete testing, please interact with the UI manually');
  
  return true;
};

// Export for Node.js environment or run directly in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testWebClient };
} else {
  testWebClient().then(result => {
    console.log(`Overall test result: ${result ? 'PASS' : 'FAIL'}`);
  });
}
