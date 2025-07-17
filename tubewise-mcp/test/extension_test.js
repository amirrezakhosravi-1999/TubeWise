/**
 * Simple test script for TubeWise Chrome Extension
 * This script can be run in the browser console when the extension is loaded on a YouTube page
 */

const testExtension = async () => {
  console.log('=== TubeWise Chrome Extension Tests ===');
  
  // Test 1: Check if we're on YouTube
  console.log('\n1. Testing YouTube Page Detection');
  try {
    const isYouTube = window.location.hostname.includes('youtube.com');
    if (!isYouTube) {
      console.error('❌ FAIL: Not on a YouTube page');
      return false;
    }
    console.log('✅ PASS: YouTube page detected');
  } catch (error) {
    console.error(`❌ FAIL: Error detecting YouTube page: ${error.message}`);
    return false;
  }
  
  // Test 2: Check if the extension sidebar is injected
  console.log('\n2. Testing Extension Sidebar Injection');
  try {
    // This assumes the extension adds an element with a specific ID or class
    const sidebar = document.querySelector('#tubewise-sidebar') || 
                    document.querySelector('.tubewise-sidebar');
    if (!sidebar) {
      console.error('❌ FAIL: TubeWise sidebar not found');
      console.log('This could mean the extension is not active or not properly injected');
      return false;
    }
    console.log('✅ PASS: TubeWise sidebar found');
  } catch (error) {
    console.error(`❌ FAIL: Error checking sidebar: ${error.message}`);
    return false;
  }
  
  // Test 3: Check if the extension can access video information
  console.log('\n3. Testing Video Information Access');
  try {
    // Get video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    
    if (!videoId) {
      console.error('❌ FAIL: Could not extract video ID from URL');
      return false;
    }
    
    console.log(`Video ID: ${videoId}`);
    console.log('✅ PASS: Video ID extracted successfully');
  } catch (error) {
    console.error(`❌ FAIL: Error accessing video information: ${error.message}`);
    return false;
  }
  
  // Test 4: Check if the extension can communicate with the API
  console.log('\n4. Testing API Communication');
  try {
    // This assumes the extension stores its API URL in localStorage or a similar place
    const apiUrl = localStorage.getItem('tubewise_api_url') || 'http://localhost:8000';
    
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`❌ FAIL: API communication failed with status ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    console.log('API response:', data);
    console.log('✅ PASS: API communication successful');
  } catch (error) {
    console.error(`❌ FAIL: Error communicating with API: ${error.message}`);
    console.log('This could mean the API server is not running or the extension is not configured correctly');
    return false;
  }
  
  console.log('\n=== Test Summary ===');
  console.log('Extension appears to be functioning correctly');
  console.log('For complete testing, please interact with the extension UI manually');
  
  return true;
};

// Run the tests
testExtension().then(result => {
  console.log(`Overall test result: ${result ? 'PASS' : 'FAIL'}`);
});
