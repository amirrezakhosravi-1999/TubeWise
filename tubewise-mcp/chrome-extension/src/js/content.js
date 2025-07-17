// TubeWise Chrome Extension - Content Script
// This script injects the sidebar into YouTube pages and handles user interactions

// Main class for the TubeWise sidebar
class TubeWiseSidebar {
  constructor() {
    this.sidebarContainer = null;
    this.chatHistory = [];
    this.currentVideoId = null;
    this.currentVideoUrl = null;
    this.isLoading = false;
    
    // Bind methods
    this.initSidebar = this.initSidebar.bind(this);
    this.toggleSidebar = this.toggleSidebar.bind(this);
    this.summarizeVideo = this.summarizeVideo.bind(this);
    this.handleChatSubmit = this.handleChatSubmit.bind(this);
    this.renderChatMessage = this.renderChatMessage.bind(this);
    this.jumpToTimestamp = this.jumpToTimestamp.bind(this);
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'initSidebar') {
        this.initSidebar();
      }
    });
    
    // Initialize when the page loads
    this.initSidebar();
  }
  
  // Extract video ID from URL
  getVideoIdFromUrl(url) {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('v');
  }
  
  // Initialize the sidebar
  initSidebar() {
    // Check if we're on a YouTube video page
    if (!window.location.href.includes('youtube.com/watch')) {
      return;
    }
    
    // Get current video information
    this.currentVideoUrl = window.location.href;
    this.currentVideoId = this.getVideoIdFromUrl(this.currentVideoUrl);
    
    // If the sidebar already exists, just update the video ID
    if (this.sidebarContainer) {
      this.updateVideoInfo();
      return;
    }
    
    // Create sidebar container
    this.sidebarContainer = document.createElement('div');
    this.sidebarContainer.className = 'tubewise-sidebar';
    this.sidebarContainer.innerHTML = `
      <div class="tubewise-sidebar-header">
        <div class="tubewise-logo">TubeWise</div>
        <button class="tubewise-close-btn">×</button>
      </div>
      <div class="tubewise-sidebar-tabs">
        <button class="tubewise-tab-btn active" data-tab="summary">Summary</button>
        <button class="tubewise-tab-btn" data-tab="chat">Chat</button>
      </div>
      <div class="tubewise-sidebar-content">
        <div class="tubewise-tab-content active" id="tubewise-summary-tab">
          <button class="tubewise-summarize-btn">Summarize Video</button>
          <div class="tubewise-summary-content"></div>
        </div>
        <div class="tubewise-tab-content" id="tubewise-chat-tab">
          <div class="tubewise-chat-messages"></div>
          <div class="tubewise-chat-input">
            <textarea placeholder="Ask about this video..."></textarea>
            <button class="tubewise-chat-send-btn">Send</button>
          </div>
        </div>
      </div>
    `;
    
    // Add sidebar to the page
    document.body.appendChild(this.sidebarContainer);
    
    // Add toggle button to YouTube's player
    this.addToggleButton();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Check if auto-summarize is enabled
    chrome.storage.sync.get(['autoSummarize'], (result) => {
      if (result.autoSummarize) {
        this.summarizeVideo();
      }
    });
  }
  
  // Add toggle button to YouTube's player
  addToggleButton() {
    const playerControls = document.querySelector('.ytp-right-controls');
    if (!playerControls) return;
    
    // Check if button already exists
    if (document.querySelector('.tubewise-toggle-btn')) return;
    
    const toggleButton = document.createElement('button');
    toggleButton.className = 'ytp-button tubewise-toggle-btn';
    toggleButton.title = 'Toggle TubeWise Sidebar';
    toggleButton.innerHTML = `
      <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%">
        <path d="M 12,12 L 24,12 L 24,24 L 12,24 Z" fill="#fff"></path>
      </svg>
    `;
    
    toggleButton.addEventListener('click', this.toggleSidebar);
    playerControls.prepend(toggleButton);
  }
  
  // Set up event listeners for the sidebar
  setupEventListeners() {
    // Close button
    const closeBtn = this.sidebarContainer.querySelector('.tubewise-close-btn');
    closeBtn.addEventListener('click', this.toggleSidebar);
    
    // Tab buttons
    const tabBtns = this.sidebarContainer.querySelectorAll('.tubewise-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all tabs
        tabBtns.forEach(b => b.classList.remove('active'));
        this.sidebarContainer.querySelectorAll('.tubewise-tab-content').forEach(tab => {
          tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        btn.classList.add('active');
        const tabId = `tubewise-${btn.dataset.tab}-tab`;
        document.getElementById(tabId).classList.add('active');
      });
    });
    
    // Summarize button
    const summarizeBtn = this.sidebarContainer.querySelector('.tubewise-summarize-btn');
    summarizeBtn.addEventListener('click', this.summarizeVideo);
    
    // Chat send button
    const chatSendBtn = this.sidebarContainer.querySelector('.tubewise-chat-send-btn');
    const chatInput = this.sidebarContainer.querySelector('.tubewise-chat-input textarea');
    
    const sendChat = () => {
      const query = chatInput.value.trim();
      if (query && !this.isLoading) {
        this.handleChatSubmit(query);
        chatInput.value = '';
      }
    };
    
    chatSendBtn.addEventListener('click', sendChat);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }
  
  // Toggle sidebar visibility
  toggleSidebar() {
    this.sidebarContainer.classList.toggle('tubewise-sidebar-open');
  }
  
  // Update video information when navigating to a new video
  updateVideoInfo() {
    this.currentVideoUrl = window.location.href;
    this.currentVideoId = this.getVideoIdFromUrl(this.currentVideoUrl);
    
    // Clear previous content
    const summaryContent = this.sidebarContainer.querySelector('.tubewise-summary-content');
    summaryContent.innerHTML = '';
    
    const chatMessages = this.sidebarContainer.querySelector('.tubewise-chat-messages');
    chatMessages.innerHTML = '';
    
    this.chatHistory = [];
    
    // Check if auto-summarize is enabled
    chrome.storage.sync.get(['autoSummarize'], (result) => {
      if (result.autoSummarize) {
        this.summarizeVideo();
      }
    });
  }
  
  // Summarize the current video
  summarizeVideo() {
    if (this.isLoading) return;
    
    const summaryContent = this.sidebarContainer.querySelector('.tubewise-summary-content');
    summaryContent.innerHTML = '<div class="tubewise-loading">Generating summary...</div>';
    
    this.isLoading = true;
    
    chrome.runtime.sendMessage(
      { action: 'summarizeVideo', videoUrl: this.currentVideoUrl },
      (response) => {
        this.isLoading = false;
        
        if (response && response.success) {
          // Render summary
          summaryContent.innerHTML = `
            <h3>${response.title || 'Video Summary'}</h3>
            <div class="tubewise-summary-text">${response.summary}</div>
            <h4>Key Points</h4>
            <ul class="tubewise-key-points">
              ${response.key_points.map(point => `
                <li>
                  <span class="tubewise-timestamp" data-time="${point.timestamp}">
                    [${point.timestamp}]
                  </span>
                  ${point.point}
                </li>
              `).join('')}
            </ul>
          `;
          
          // Add click event to timestamps
          const timestamps = summaryContent.querySelectorAll('.tubewise-timestamp');
          timestamps.forEach(ts => {
            ts.addEventListener('click', () => {
              this.jumpToTimestamp(ts.dataset.time);
            });
          });
        } else {
          // Show error
          summaryContent.innerHTML = `
            <div class="tubewise-error">
              Failed to generate summary: ${response?.error || 'Unknown error'}
            </div>
          `;
        }
      }
    );
  }
  
  // Handle chat submission
  handleChatSubmit(query) {
    if (this.isLoading) return;
    
    const chatMessages = this.sidebarContainer.querySelector('.tubewise-chat-messages');
    
    // Add user message to chat
    this.renderChatMessage(chatMessages, { role: 'user', content: query });
    
    // Add loading message
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'tubewise-chat-message tubewise-loading-message';
    loadingMsg.innerHTML = '<div class="tubewise-loading">Thinking...</div>';
    chatMessages.appendChild(loadingMsg);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    this.isLoading = true;
    
    // Send request to background script
    console.log('Sending chat request with query:', query, 'and video URL:', this.currentVideoUrl);
    chrome.runtime.sendMessage(
      { 
        action: 'chatWithVideo', 
        videoUrl: this.currentVideoUrl, 
        query: query,  // Make sure this is explicitly set
        message: query // Also include as message for compatibility
      },
      (response) => {
        this.isLoading = false;
        console.log('Received chat response:', response);
        
        // Remove loading message
        chatMessages.removeChild(loadingMsg);
        
        if (response && response.success) {
          // Add AI response to chat
          this.renderChatMessage(chatMessages, { role: 'assistant', content: response.response });
          
          // Add timeline suggestions if available
          if (response.timeline_suggestions && response.timeline_suggestions.length > 0) {
            const suggestionsHtml = `
              <div class="tubewise-timeline-suggestions">
                <p>Relevant parts of the video:</p>
                <ul>
                  ${response.timeline_suggestions.map(suggestion => `
                    <li>
                      <span class="tubewise-timestamp" data-time="${suggestion.timestamp}">
                        [${suggestion.timestamp}]
                      </span>
                      ${suggestion.text}
                    </li>
                  `).join('')}
                </ul>
              </div>
            `;
            
            const suggestionsElement = document.createElement('div');
            suggestionsElement.className = 'tubewise-chat-message tubewise-suggestions-message';
            suggestionsElement.innerHTML = suggestionsHtml;
            chatMessages.appendChild(suggestionsElement);
            
            // Add click event to timestamps
            const timestamps = suggestionsElement.querySelectorAll('.tubewise-timestamp');
            timestamps.forEach(ts => {
              ts.addEventListener('click', () => {
                this.jumpToTimestamp(ts.dataset.time);
              });
            });
          }
        } else {
          // Add error message to chat
          this.renderChatMessage(chatMessages, { 
            role: 'assistant', 
            content: `Sorry, I encountered an error: ${response?.error || 'Unknown error'}`
          });
        }
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    );
  }
  
  // Render a chat message
  renderChatMessage(container, message) {
    const messageElement = document.createElement('div');
    messageElement.className = `tubewise-chat-message tubewise-${message.role}-message`;
    
    // Format message content (handle markdown-like formatting)
    let formattedContent = message.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
      .replace(/\n/g, '<br>');                           // Line breaks
    
    messageElement.innerHTML = `
      <div class="tubewise-message-avatar">${message.role === 'user' ? 'You' : 'AI'}</div>
      <div class="tubewise-message-content">${formattedContent}</div>
    `;
    
    container.appendChild(messageElement);
    this.chatHistory.push(message);
  }
  
  // Jump to a specific timestamp in the video
  jumpToTimestamp(timestamp) {
    // Convert timestamp (00:01:15) to seconds
    const parts = timestamp.split(':').map(Number);
    let seconds = 0;
    
    if (parts.length === 3) {
      // Hours:Minutes:Seconds
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // Minutes:Seconds
      seconds = parts[0] * 60 + parts[1];
    } else {
      // Just seconds
      seconds = parts[0];
    }
    
    // Get video player and set current time
    const videoPlayer = document.querySelector('video');
    if (videoPlayer) {
      videoPlayer.currentTime = seconds;
      videoPlayer.play();
    }
  }
}

// Initialize the sidebar when the page loads
window.addEventListener('load', () => {
  // Wait a bit for YouTube to fully load
  setTimeout(() => {
    window.tubeWiseSidebar = new TubeWiseSidebar();
  }, 1000);
});

// Listen for page navigation (YouTube is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    
    // Check if we're on a video page
    if (window.location.href.includes('youtube.com/watch') && window.tubeWiseSidebar) {
      window.tubeWiseSidebar.updateVideoInfo();
    }
  }
}).observe(document, { subtree: true, childList: true });
