// TubeWise Chrome Extension - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements - Settings
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const autoSummarize = document.getElementById('auto-summarize');
  const languageSelect = document.getElementById('language-select');
  const apiUrl = document.getElementById('api-url');
  const saveBtn = document.getElementById('save-btn');
  
  // Get DOM elements - Auth
  const loggedOutView = document.getElementById('logged-out-view');
  const loggedInView = document.getElementById('logged-in-view');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const authMessage = document.getElementById('auth-message');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  
  // Get DOM elements - Video Queue
  const emptyQueueMessage = document.getElementById('empty-queue-message');
  const videoQueue = document.getElementById('video-queue');
  const queueItems = document.getElementById('queue-items');
  const compareBtn = document.getElementById('compare-btn');
  const clearQueueBtn = document.getElementById('clear-queue-btn');
  
  // Add event listener for API test button
  const testApiBtn = document.getElementById('test-api-btn');
  const apiStatus = document.getElementById('api-status');
  
  testApiBtn.addEventListener('click', async () => {
    apiStatus.textContent = 'Testing API connection...';
    apiStatus.className = 'status-message loading';
    
    try {
      const apiEndpoint = apiUrl.value || 'http://localhost:8000/api';
      console.log('Testing API connection to:', apiEndpoint);
      
      const response = await fetch(`${apiEndpoint}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }).catch(error => {
        console.error('Network error:', error);
        throw new Error('Network error: API server unreachable');
      });
      
      console.log('API response status:', response.status);
      
      if (response.ok) {
        apiStatus.textContent = 'API connection successful!';
        apiStatus.className = 'status-message success';
      } else {
        apiStatus.textContent = `API error: ${response.status}`;
        apiStatus.className = 'status-message error';
      }
    } catch (error) {
      console.error('API test error:', error);
      apiStatus.textContent = error.message;
      apiStatus.className = 'status-message error';
    }
  });
  
  // Load settings from storage
  chrome.storage.sync.get([
    'apiUrl', 
    'sidebarEnabled', 
    'autoSummarize', 
    'language', 
    'authToken', 
    'user',
    'videoQueue'
  ], (result) => {
    // Set default values if settings don't exist
    const settings = {
      apiUrl: 'http://localhost:8000/api', // Updated to match the AI service port
      sidebarEnabled: true,
      autoSummarize: false,
      language: 'en',
      authToken: null,
      user: null,
      videoQueue: [],
      ...result
    };
    
    // Update UI with settings
    sidebarToggle.checked = settings.sidebarEnabled;
    autoSummarize.checked = settings.autoSummarize;
    languageSelect.value = settings.language;
    apiUrl.value = settings.apiUrl;
    
    // Update auth UI
    updateAuthUI(settings.authToken, settings.user);
    
    // Update video queue UI
    updateVideoQueueUI(settings.videoQueue);
  });
  
  // Auth functions
  function updateAuthUI(token, user) {
    if (token && user) {
      // Show logged in view
      loggedOutView.style.display = 'none';
      loggedInView.style.display = 'block';
      
      // Update user info
      userName.textContent = user.name || 'TubeWise User';
      userEmail.textContent = user.email || '';
    } else {
      // Show logged out view
      loggedOutView.style.display = 'block';
      loggedInView.style.display = 'none';
    }
  }
  
  // Login functionality
  loginBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
      authMessage.textContent = 'Please enter both email and password';
      return;
    }
    
    authMessage.textContent = 'Logging in...';
    
    console.log('Logging in with API URL:', apiUrl.value.trim());
    // Call the backend API to authenticate
    fetch(`${apiUrl.value.trim()}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Login failed');
      }
      return response.json();
    })
    .then(data => {
      console.log('Login successful:', data);
      // Store the token and user info
      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        credits: data.credits,
        languagePreference: data.languagePreference,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionPlan: data.subscriptionPlan
      };
      
      chrome.storage.sync.set({
        authToken: data.token,
        user: userData
      }, () => {
        updateAuthUI(data.token, data.user);
        authMessage.textContent = '';
      });
    })
    .catch(error => {
      authMessage.textContent = 'Login failed. Please check your credentials.';
      console.error('Login error:', error);
    });
  });
  
  // Signup functionality
  signupBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!email || !password) {
      authMessage.textContent = 'Please enter both email and password';
      return;
    }
    
    authMessage.textContent = 'Creating account...';
    
    console.log('Signing up with API URL:', apiUrl.value.trim());
    // Call the backend API to register
    fetch(`${apiUrl.value.trim()}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, name: email.split('@')[0] })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Signup failed');
      }
      return response.json();
    })
    .then(data => {
      console.log('Login successful:', data);
      // Store the token and user info
      const userData = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        credits: data.credits,
        languagePreference: data.languagePreference,
        subscriptionStatus: data.subscriptionStatus,
        subscriptionPlan: data.subscriptionPlan
      };
      
      chrome.storage.sync.set({
        authToken: data.token,
        user: userData
      }, () => {
        updateAuthUI(data.token, data.user);
        authMessage.textContent = '';
      });
    })
    .catch(error => {
      authMessage.textContent = 'Signup failed. This email may already be registered.';
      console.error('Signup error:', error);
    });
  });
  
  // Logout functionality
  logoutBtn.addEventListener('click', () => {
    chrome.storage.sync.set({
      authToken: null,
      user: null
    }, () => {
      updateAuthUI(null, null);
      emailInput.value = '';
      passwordInput.value = '';
    });
  });
  
  // Video Queue functions
  function updateVideoQueueUI(queue) {
    if (!queue || queue.length === 0) {
      emptyQueueMessage.style.display = 'block';
      videoQueue.style.display = 'none';
      return;
    }
    
    emptyQueueMessage.style.display = 'none';
    videoQueue.style.display = 'block';
    
    // Clear current queue items
    queueItems.innerHTML = '';
    
    // Add each video to the queue
    queue.forEach(video => {
      const queueItem = document.createElement('div');
      queueItem.className = 'queue-item';
      queueItem.innerHTML = `
        <div class="video-thumbnail">
          <img src="https://i.ytimg.com/vi/${video.id}/default.jpg" alt="">
        </div>
        <div class="video-info">
          <div class="video-title">${video.title}</div>
          <div class="video-channel">${video.channelTitle || 'YouTube Channel'}</div>
        </div>
        <button class="remove-video" data-video-id="${video.id}">×</button>
      `;
      
      queueItems.appendChild(queueItem);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-video').forEach(button => {
      button.addEventListener('click', (e) => {
        const videoId = e.target.getAttribute('data-video-id');
        removeVideoFromQueue(videoId);
      });
    });
  }
  
  function removeVideoFromQueue(videoId) {
    chrome.storage.sync.get(['videoQueue'], (result) => {
      const queue = result.videoQueue || [];
      const updatedQueue = queue.filter(video => video.id !== videoId);
      
      chrome.storage.sync.set({ videoQueue: updatedQueue }, () => {
        updateVideoQueueUI(updatedQueue);
      });
    });
  }
  
  // Compare videos functionality
  compareBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['videoQueue', 'authToken'], (result) => {
      const queue = result.videoQueue || [];
      const token = result.authToken;
      
      if (queue.length < 2) {
        alert('Please add at least 2 videos to compare');
        return;
      }
      
      if (!token) {
        alert('Please log in to compare videos');
        return;
      }
      
      // Open comparison page in a new tab
      const videoIds = queue.map(video => video.id).join(',');
      const comparisonUrl = `https://tubewise.app/compare?videos=${videoIds}`;
      chrome.tabs.create({ url: comparisonUrl });
    });
  });
  
  // Clear video queue
  clearQueueBtn.addEventListener('click', () => {
    chrome.storage.sync.set({ videoQueue: [] }, () => {
      updateVideoQueueUI([]);
    });
  });
  
  // Save settings
  saveBtn.addEventListener('click', () => {
    const settings = {
      apiUrl: apiUrl.value.trim(),
      sidebarEnabled: sidebarToggle.checked,
      autoSummarize: autoSummarize.checked,
      language: languageSelect.value
    };
    
    // Save to storage
    chrome.storage.sync.set(settings, () => {
      // Show save confirmation
      saveBtn.textContent = 'Saved!';
      saveBtn.disabled = true;
      
      // Reset button after 1.5 seconds
      setTimeout(() => {
        saveBtn.textContent = 'Save Settings';
        saveBtn.disabled = false;
      }, 1500);
      
      // Send message to update settings in content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('youtube.com')) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSettings', settings });
        }
      });
    });
  });
  
  // Check if current tab is a YouTube video and add to queue option
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url.includes('youtube.com/watch')) {
      // Extract video ID
      const url = new URL(tabs[0].url);
      const videoId = url.searchParams.get('v');
      
      if (videoId) {
        // Add an "Add to Queue" button at the bottom of the popup
        const footerDiv = document.querySelector('.popup-footer');
        const addToQueueBtn = document.createElement('button');
        addToQueueBtn.id = 'add-to-queue-btn';
        addToQueueBtn.className = 'secondary-btn';
        addToQueueBtn.textContent = 'Add Current Video to Queue';
        addToQueueBtn.style.marginRight = 'auto';
        
        // Insert before the save button
        footerDiv.insertBefore(addToQueueBtn, saveBtn);
        
        // Add event listener
        addToQueueBtn.addEventListener('click', () => {
          // Get video details from the page
          chrome.tabs.sendMessage(tabs[0].id, { action: 'getVideoDetails' }, (response) => {
            if (response && response.title) {
              addVideoToQueue({
                id: videoId,
                title: response.title,
                channelTitle: response.channelTitle || 'YouTube Channel',
                url: tabs[0].url
              });
            } else {
              // Fallback if content script doesn't respond
              addVideoToQueue({
                id: videoId,
                title: 'YouTube Video',
                channelTitle: 'YouTube Channel',
                url: tabs[0].url
              });
            }
          });
        });
      }
    }
  });
  
  function addVideoToQueue(video) {
    chrome.storage.sync.get(['videoQueue'], (result) => {
      const queue = result.videoQueue || [];
      
      // Check if video already exists in queue
      if (!queue.some(item => item.id === video.id)) {
        const updatedQueue = [...queue, video];
        
        chrome.storage.sync.set({ videoQueue: updatedQueue }, () => {
          updateVideoQueueUI(updatedQueue);
        });
      } else {
        alert('This video is already in your comparison queue');
      }
    });
  }
});
