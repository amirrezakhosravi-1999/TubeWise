const { OpenAI } = require('openai');
const axios = require('axios');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Controller for comparing multiple videos
 */
const compareController = async (req, res) => {
  try {
    const { videoUrls } = req.body;
    
    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least two video URLs are required'
      });
    }
    
    // Get summaries for each video from the summary service
    const summaryPromises = videoUrls.map(url => 
      axios.post('http://video-summary:3000/api/summarize', { videoUrl: url })
    );
    
    const summaryResponses = await Promise.all(summaryPromises);
    const summaries = summaryResponses.map(response => response.data.summary);
    
    // Generate comparison using OpenAI
    const comparison = await generateComparison(summaries);
    
    res.json({
      success: true,
      summaries,
      comparison
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare videos'
    });
  }
};

/**
 * Generate comparison between multiple video summaries
 * @param {Array} summaries - Array of video summaries
 * @returns {Promise<Object>} - Comparison result
 */
const generateComparison = async (summaries) => {
  try {
    // Create a prompt for OpenAI
    const summariesText = summaries.map((summary, index) => 
      `Video ${index + 1}: "${summary.title}"\n${summary.summary}\nKey Points:\n${summary.keyPoints.map(kp => `- ${kp.point}`).join('\n')}`
    ).join('\n\n');
    
    const prompt = `
      I need to compare the following video summaries and identify commonalities, differences, and provide recommendations.
      
      ${summariesText}
      
      Please analyze these summaries and provide:
      1. Common topics or themes across all videos
      2. Key differences between the videos
      3. A recommendation on which video(s) might be most useful for different purposes
      
      Format the output as JSON with the following structure:
      {
        "commonTopics": ["topic 1", "topic 2", ...],
        "differences": ["difference 1", "difference 2", ...],
        "recommendation": "detailed recommendation text"
      }
    `;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing and comparing educational content."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse and return the comparison
    const comparisonText = response.choices[0].message.content;
    const comparison = JSON.parse(comparisonText);
    
    return comparison;
  } catch (error) {
    console.error('Error generating comparison:', error);
    throw new Error('Failed to generate comparison');
  }
};

module.exports = {
  compareController
};
