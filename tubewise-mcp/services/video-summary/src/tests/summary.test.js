const { extractVideoId } = require('../services/youtubeService');
const { generateSummary } = require('../services/summaryService');

// Mock data for tests
const mockTranscript = [
  { startTime: '0:00:00', text: 'Hello and welcome to this tutorial.' },
  { startTime: '0:00:05', text: 'Today we will learn about microservices architecture.' },
  { startTime: '0:00:10', text: 'Microservices are a way to build applications as a collection of small services.' },
  { startTime: '0:00:15', text: 'Each service runs in its own process and communicates with lightweight mechanisms.' }
];

describe('YouTube Service', () => {
  test('extractVideoId should extract video ID from YouTube URL', () => {
    const url1 = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const url2 = 'https://youtu.be/dQw4w9WgXcQ';
    const url3 = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    const invalidUrl = 'https://www.example.com';
    
    expect(extractVideoId(url1)).toBe('dQw4w9WgXcQ');
    expect(extractVideoId(url2)).toBe('dQw4w9WgXcQ');
    expect(extractVideoId(url3)).toBe('dQw4w9WgXcQ');
    expect(extractVideoId(invalidUrl)).toBeNull();
  });
});

// This test requires an OpenAI API key to run
// It's commented out to avoid API calls during automated testing
/*
describe('Summary Service', () => {
  test('generateSummary should create a summary from transcript', async () => {
    const summary = await generateSummary(mockTranscript);
    
    expect(summary).toHaveProperty('title');
    expect(summary).toHaveProperty('summary');
    expect(summary).toHaveProperty('keyPoints');
    expect(Array.isArray(summary.keyPoints)).toBe(true);
  }, 30000); // Increase timeout for API call
});
*/
