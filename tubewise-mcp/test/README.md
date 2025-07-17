# TubeWise Test Suite

This directory contains test scripts for verifying the functionality of the TubeWise application.

## Test Scripts

### 1. System Test

The `system_test.py` script is a comprehensive test that checks the entire TubeWise system:

- Verifies environment configuration
- Checks dependencies
- Starts all services
- Runs API tests
- Opens the web client for manual testing

To run the system test:

```bash
python system_test.py
```

### 2. API Test

The `api_test.py` script tests the TubeWise API endpoints:

- Health check
- Video summarization
- Chat with video
- Content generation

To run the API tests:

```bash
python api_test.py
```

### 3. Web Client Tests

#### Basic Web Client Test

The `web_client_test.js` script tests the TubeWise web client:

- API configuration
- UI components
- Video input form
- Internationalization

#### Comprehensive Frontend Test

The `frontend_test.js` script provides a comprehensive test of the web client:

- Core components (Header, Footer, Main Content)
- Routing
- Authentication context
- Video input form
- Internationalization
- Responsive design
- API connection
- Feature components
- UI framework
- Performance
- Error handling
- Accessibility

To run the web client tests, open the browser console on the TubeWise web app and paste the contents of the script.

### 4. Chrome Extension Tests

#### Basic Extension Test

The `extension_test.js` script tests the TubeWise Chrome extension:

- YouTube page detection
- Sidebar injection
- Video information access
- API communication

#### Comprehensive Extension Test

The `extension_test_comprehensive.js` script provides a comprehensive test of the Chrome extension:

- YouTube page detection
- Extension sidebar injection
- Sidebar functionality
- Summary functionality
- Chat functionality
- Transcript functionality
- YouTube player integration
- Extension UI
- API communication
- Authentication

To run the extension tests, open the browser console on a YouTube page with the extension active and paste the contents of the script.

### 5. Start and Test Script

The `start_and_test.py` script automates the process of starting the application and running tests:

- Starts the AI service
- Starts the web client
- Opens the web client in a browser
- Provides instructions for testing

To run the start and test script:

```bash
python start_and_test.py
```

## Manual Testing Checklist

For complete testing, verify the following features manually:

1. **Video Summarization**
   - Enter a YouTube URL and get a summary
   - Check if timestamps are accurate
   - Verify summary quality

2. **Chat Feature**
   - Ask questions about a video
   - Check if answers are relevant
   - Verify timeline suggestions

3. **Content Generation**
   - Generate Twitter threads
   - Generate LinkedIn posts
   - Generate Notion summaries
   - Check quality and formatting

4. **Multi-Video Comparison**
   - Compare multiple videos
   - Check for common topics and differences
   - Verify recommendation quality

5. **User Interface**
   - Test responsiveness on desktop, tablet, and mobile
   - Verify internationalization (switch languages)
   - Check accessibility

6. **Chrome Extension**
   - Install the extension
   - Navigate to a YouTube video
   - Test the sidebar functionality
   - Test the chat feature
   - Test the transcript navigation

## Cleanup

After testing, make sure to stop all services:

- Stop the AI service
- Stop the web client
- Close any browser windows

## Note

These test scripts are for development and testing purposes only. They should not be included in the production build.
