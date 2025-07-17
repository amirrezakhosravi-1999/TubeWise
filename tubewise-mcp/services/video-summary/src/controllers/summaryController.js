const { extractVideoId, generateMockTranscript } = require('../services/youtubeService');
const { generateMockSummary } = require('../services/summaryService');
const { Video, Summary } = require('../models');

const summaryController = async (req, res) => {
  try {
    console.log('Summary request received:', req.body);
    const { videoUrl } = req.body;
    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
      console.log('Invalid YouTube URL:', videoUrl);
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL'
      });
    }
    
    console.log('Processing video ID:', videoId);
    
    // Check if we already have this video and summary in our database
    let video = await Video.findOne({ where: { videoId } });
    
    if (!video) {
      console.log('Creating new video record for:', videoId);
      // Create new video record
      video = await Video.create({
        videoId,
        url: videoUrl
      });
    } else {
      console.log('Found existing video record:', video.id);
    }
    
    // Check if we already have a summary for this video
    let existingSummary = await Summary.findOne({
      where: { VideoId: video.id },
      order: [['createdAt', 'DESC']]
    });
    
    // If summary exists and is less than 24 hours old, return it
    if (existingSummary && 
        (new Date() - new Date(existingSummary.createdAt)) < 24 * 60 * 60 * 1000) {
      console.log('Returning cached summary:', existingSummary.id);
      return res.json({
        success: true,
        summary: {
          title: existingSummary.title,
          summary: existingSummary.overview,
          keyPoints: existingSummary.keyPoints ? JSON.parse(existingSummary.keyPoints) : []
        },
        cached: true
      });
    }
    
    console.log('Using offline mode for summary generation');
    
    // Generate mock summary directly without trying to get transcript
    const summaryData = generateMockSummary();
    console.log('Mock summary generated');
    
    // Save the summary to database
    const newSummary = await Summary.create({
      VideoId: video.id,
      title: summaryData.title,
      overview: summaryData.summary,
      keyPoints: JSON.stringify(summaryData.keyPoints),
      language: 'en' // Default language
    });
    
    console.log('New summary saved to database:', newSummary.id);
    
    res.json({
      success: true,
      summary: summaryData,
      cached: false
    });
  } catch (error) {
    console.error('Summary controller error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
};

module.exports = { summaryController };
