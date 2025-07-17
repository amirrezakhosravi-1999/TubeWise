// TubeWise Chrome Extension - Background Script
// This script handles background tasks and communication between the extension and the API

// Configuration
const API_BASE_URL = 'http://localhost:8000/api';

// Add debug logging
function logDebug(message, data) {
  console.log(`TubeWise Debug: ${message}`, data || '');
}

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('TubeWise extension installed');
  
  // Initialize storage with default settings
  chrome.storage.sync.set({
    apiUrl: API_BASE_URL,
    sidebarEnabled: true,
    autoSummarize: false,
    language: 'en'
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'summarizeVideo') {
    summarizeVideo(request.videoUrl)
      .then(summary => sendResponse(summary))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async sendResponse
  }
  
  if (request.action === 'chatWithVideo') {
    chatWithVideo(request.videoUrl, request.query)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async sendResponse
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['apiUrl', 'sidebarEnabled', 'autoSummarize', 'language'], (result) => {
      sendResponse(result);
    });
    return true; // Required for async sendResponse
  }
  
  if (request.action === 'saveSettings') {
    chrome.storage.sync.set(request.settings, () => {
      sendResponse({ success: true });
    });
    return true; // Required for async sendResponse
  }
});

// Function to summarize a video
async function summarizeVideo(videoUrl) {
  try {
    const settings = await getSettings();
    // Extract video ID from URL
    const videoId = new URLSearchParams(new URL(videoUrl).search).get('v');
    
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }
    
    // Use the correct endpoint format
    const response = await fetch(`${settings.apiUrl}/summarize/${videoId}`, {
      method: 'GET', // API expects GET request
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      title: data.title,
      summary: data.summary,
      key_points: data.keyPoints.map(point => ({
        timestamp: point.timestamp || '0:00',
        point: point.text
      }))
    };
  } catch (error) {
    console.error('Error summarizing video:', error);
    throw error;
  }
}

// Function to chat with a video
async function chatWithVideo(videoUrl, query) {
  try {
    const settings = await getSettings();
    logDebug('Chat settings:', settings);
    
    // Extract video ID from URL
    const videoId = new URLSearchParams(new URL(videoUrl).search).get('v');
    
    if (!videoId) {
      throw new Error('Could not extract video ID from URL');
    }
    
    logDebug('Sending chat request for video ID:', videoId);
    
    // Try a direct request to API endpoint with videoId and message parameters
    const payload = {
      videoId: videoId,  // Using videoId as in the frontend compatibility API
      message: query      
    };
    
    logDebug('Request payload:', payload);
    
    // Test the full URL before sending
    const chatEndpoint = `${settings.apiUrl}/chat`;
    logDebug('Chat endpoint:', chatEndpoint);
    
    // Send the request
    const response = await fetch(chatEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    logDebug('Response status:', response.status);
    logDebug('Response headers:', [...response.headers.entries()]);
    
    if (!response.ok) {
      const errorText = await response.text();
      logDebug('API error response text:', errorText);
      throw new Error(`API error: ${response.status}`);
    }
    
    // Log the raw response
    const responseText = await response.text();
    logDebug('Raw response text:', responseText);
    
    // Parse the response
    let data;
    try {
      data = JSON.parse(responseText);
      logDebug('Parsed response data:', data);
    } catch (parseError) {
      logDebug('Error parsing response JSON:', parseError);
      throw new Error('Failed to parse response from server');
    }
    
    return {
      success: true,
      response: data.response || data.answer || 'No response from API',
      timeline_suggestions: data.timeline_suggestions || data.timelineSuggestions || []
    };
  } catch (error) {
    console.error('Error chatting with video:', error);
    throw error;
  }
}

// Helper function to get settings
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiUrl', 'sidebarEnabled', 'autoSummarize', 'language'], (result) => {
      resolve(result);
    });
  });
}

// Listen for tab updates to inject sidebar when on YouTube
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    chrome.tabs.sendMessage(tabId, { action: 'initSidebar' });
  }
});
