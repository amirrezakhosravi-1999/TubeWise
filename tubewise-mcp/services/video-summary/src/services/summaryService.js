const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a summary from video transcript
 * @param {Array} transcript - Video transcript with timestamps
 * @returns {Promise<Object>} - Summary with key points and timestamps
 */
const generateSummary = async (transcript) => {
  // Always use mock summary in offline mode
  console.log('Using offline mode - generating mock summary');
  return generateMockSummary();
};

/**
 * Generate a simple summary locally without using OpenAI
 * @param {Array} transcript - Video transcript with timestamps
 * @returns {Object} - Summary with key points and timestamps
 */
const generateLocalSummary = (transcript) => {
  console.log('Generating local summary for transcript with length:', transcript.length);
  
  // Extract a title from the first few lines
  const firstFewLines = transcript.slice(0, 5).map(item => item.text).join(' ');
  const title = `Summary of Video: ${firstFewLines.substring(0, 50)}...`;
  
  // Create a simple summary
  const summary = `This video contains ${transcript.length} segments of content. It covers various topics that are highlighted in the key points below.`;
  
  // Select key points (every Nth item from the transcript)
  const keyPoints = [];
  const step = Math.max(1, Math.floor(transcript.length / 6)); // Aim for about 6 key points
  
  for (let i = 0; i < transcript.length; i += step) {
    if (keyPoints.length < 6) { // Limit to 6 key points
      keyPoints.push({
        timestamp: transcript[i].startTime,
        point: transcript[i].text
      });
    }
  }
  
  return {
    title,
    summary,
    keyPoints
  };
};

/**
 * Generate a mock summary for testing
 * @returns {Object} - Mock summary
 */
const generateMockSummary = () => {
  console.log('Generating mock summary as fallback');
  
  return {
    title: "Understanding Key Concepts in This Topic",
    summary: "This video provides an overview of important concepts and their practical applications. The presenter explains the fundamentals and demonstrates how to implement them effectively.",
    keyPoints: [
      { timestamp: "0:00:05", point: "Introduction to the main topic" },
      { timestamp: "0:00:15", point: "Explanation of the first key concept" },
      { timestamp: "0:00:25", point: "Demonstration of practical application" },
      { timestamp: "0:00:35", point: "Common challenges and how to overcome them" },
      { timestamp: "0:00:45", point: "Advanced techniques for implementation" },
      { timestamp: "0:00:55", point: "Summary of best practices" }
    ]
  };
};

module.exports = {
  generateSummary,
  generateMockSummary
};
