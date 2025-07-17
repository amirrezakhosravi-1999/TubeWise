const axios = require('axios');
const YouTubeTranscript = require('youtube-transcript');

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube video URL
 * @returns {string} - Video ID
 */
const extractVideoId = (url) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

/**
 * Get video transcript from YouTube
 * @param {string} videoUrl - YouTube video URL
 * @returns {Promise<Array>} - Video transcript with timestamps
 */
const getVideoTranscript = async (videoUrl) => {
  // Always use mock transcript in offline mode
  console.log('Using offline mode - generating mock transcript');
  const videoId = extractVideoId(videoUrl);
  return generateMockTranscript(videoId);
};

/**
 * Format seconds to HH:MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Generate a mock transcript for testing
 * @param {string} videoId - YouTube video ID
 * @returns {Array} - Mock transcript with timestamps
 */
const generateMockTranscript = (videoId) => {
  // This is just for testing purposes
  console.log('Creating mock transcript data for video:', videoId);
  
  return [
    { startTime: '0:00:00', text: 'Hello and welcome to this video.' },
    { startTime: '0:00:05', text: 'Today we will be discussing an important topic.' },
    { startTime: '0:00:10', text: 'This is a key point that you should remember.' },
    { startTime: '0:00:15', text: 'Another important concept to understand.' },
    { startTime: '0:00:20', text: 'Let me explain this in more detail.' },
    { startTime: '0:00:25', text: 'This is how you can apply this knowledge.' },
    { startTime: '0:00:30', text: 'Let\'s summarize what we\'ve learned.' },
    { startTime: '0:00:35', text: 'Thank you for watching this video.' },
    { startTime: '0:00:40', text: 'Don\'t forget to like and subscribe.' },
    { startTime: '0:00:45', text: 'See you in the next video!' }
  ];
};

module.exports = {
  getVideoTranscript,
  extractVideoId,
  generateMockTranscript
};
