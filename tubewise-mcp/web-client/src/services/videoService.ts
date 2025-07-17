import { SavedVideo, Video, VideoSummary, KeyPoint } from '../models/Video';
import { authService } from './authService';
import { dbService } from './dbService';
import { ChatMessage, ChatResponse, ComparisonResult, GeneratedContent, TimelineSuggestion } from '../types';

// API URL configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';

export const videoService = {
  // Save a video to the user's saved videos
  saveVideo: async (video: Video): Promise<SavedVideo> => {
    // Get current user session
    const session = authService.getCurrentSession();
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    // Save video to database
    const savedVideo = await dbService.saveVideo(session.userId, video);
    
    return savedVideo;
  },
  
  // Remove a video from the user's saved videos
  removeSavedVideo: async (videoId: string): Promise<void> => {
    // Get current user session
    const session = authService.getCurrentSession();
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    // Remove video from database
    await dbService.removeSavedVideo(session.userId, videoId);
  },
  
  // Get all saved videos for the current user
  getSavedVideos: async (): Promise<SavedVideo[]> => {
    // Get current user session
    const session = authService.getCurrentSession();
    if (!session) {
      throw new Error('User not authenticated');
    }
    
    // Get saved videos from database
    return await dbService.findSavedVideosByUserId(session.userId);
  },
  
  // Save a video summary
  saveSummary: async (summary: VideoSummary): Promise<VideoSummary> => {
    // Save summary to database
    return await dbService.createSummary(summary);
  },
  
  // Get a summary for a video
  getSummary: async (videoId: string): Promise<VideoSummary | null> => {
    // Get summary from database
    return await dbService.findSummaryByVideoId(videoId) || null;
  },
  
  // Get all summaries
  getAllSummaries: async (): Promise<VideoSummary[]> => {
    // Get all summaries from database
    return await dbService.getAllSummaries();
  },
  
  // Get video summary from API
  getVideoSummary: async (videoUrl: string): Promise<VideoSummary> => {
    try {
      console.log('Requesting summary for video URL:', videoUrl);
      // Call API to get summary - simplified to match our new API
      const response = await fetch(`${API_URL}/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: videoUrl
          // Removed options as our new API doesn't use these parameters
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to get summary: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received summary data:', data);
      
      // Create a VideoSummary from the API response - updated for new API format
      const summary: VideoSummary = {
        id: Date.now().toString(),
        videoId: data.videoId,
        title: data.title || 'Unknown title',
        summary: data.summary || '',
        keyPoints: data.keyPoints?.map((kp: any) => ({
          id: Date.now().toString() + Math.random().toString(),
          summaryId: Date.now().toString(),
          point: kp.point || kp.text, // Support both formats
          timestamp: kp.timestamp || '0:00', // Keep timestamp as string
          confidence: 0.9
        })) || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Created summary object:', summary);
      
      // Save summary to database
      return await dbService.createSummary(summary);
    } catch (error) {
      console.error('Error getting video summary:', error);
      throw error;
    }
  },
  
  // Compare multiple videos
  compareVideos: async (videoUrls: string[]): Promise<ComparisonResult> => {
    try {
      // Call API to compare videos
      const response = await fetch(`${API_URL}/api/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrls }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to compare videos: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.comparison as ComparisonResult;
    } catch (error) {
      console.error('Error comparing videos:', error);
      throw error;
    }
  },
  
  // Chat with a video
  chatWithVideo: async (videoId: string, message: string): Promise<ChatResponse> => {
    try {
      console.log('Sending chat request for video ID:', videoId, 'with message:', message);
      // Call API to chat with video
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId, message }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to chat with video: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received chat response:', data);
      
      // اطمینان از وجود فیلد response یا answer در پاسخ API
      if (!data.response && !data.answer) {
        console.error('API response does not contain response or answer field:', data);
        throw new Error('Invalid API response format');
      }
      
      return data;
    } catch (error) {
      console.error('Error chatting with video:', error);
      throw error;
    }
  },
  
  // Generate content from a video summary
  generateContent: async (videoId: string, contentType: string, summary?: VideoSummary): Promise<GeneratedContent> => {
    try {
      // Prepare request body
      const requestBody: any = {
        videoId,
        contentType
      };
      
      // If summary is provided, include it in the request
      if (summary) {
        requestBody.summary = summary.summary;
        requestBody.title = summary.title;
        requestBody.keyPoints = summary.keyPoints.map(kp => ({
          timestamp: `${Math.floor(kp.timestamp / 60)}:${(kp.timestamp % 60).toString().padStart(2, '0')}`,
          point: kp.text
        }));
      }
      
      // Call API to generate content
      const response = await fetch(`${API_URL}/api/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate content: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Create a GeneratedContent from the API response
      const generatedContent: GeneratedContent = {
        id: Date.now().toString(),
        videoId,
        content: data.content,
        format: data.format,
        title: data.title,
        createdAt: new Date()
      };
      
      return generatedContent;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }
};