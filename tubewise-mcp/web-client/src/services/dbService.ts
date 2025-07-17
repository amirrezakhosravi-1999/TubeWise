import { User, UserRole } from '../models/User';
import { SavedVideo, Video, VideoSummary, KeyPoint } from '../models/Video';
import { GeneratedContent, ContentType, UsageStats } from '../models/Content';

// In a real app, these would be stored in a PostgreSQL database
// For this demo, we'll use in-memory storage with persistence to localStorage

// Database collections
let users: User[] = [];
let videos: Video[] = [];
let savedVideos: SavedVideo[] = [];
let videoSummaries: VideoSummary[] = [];
let keyPoints: KeyPoint[] = [];
let generatedContents: GeneratedContent[] = [];
let usageStats: UsageStats[] = [];

// Initialize database from localStorage if available
const initializeDb = () => {
  if (typeof window !== 'undefined') {
    try {
      const dbData = localStorage.getItem('tubewise_db');
      if (dbData) {
        const parsedData = JSON.parse(dbData);
        users = parsedData.users || [];
        videos = parsedData.videos || [];
        savedVideos = parsedData.savedVideos || [];
        videoSummaries = parsedData.videoSummaries || [];
        keyPoints = parsedData.keyPoints || [];
        generatedContents = parsedData.generatedContents || [];
        usageStats = parsedData.usageStats || [];
      } else {
        // Add default admin user if no data exists
        initializeDefaultData();
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      // Initialize with default data if there's an error
      initializeDefaultData();
    }
  } else {
    // Server-side rendering, initialize with default data
    initializeDefaultData();
  }
};

// Initialize with default data
const initializeDefaultData = () => {
  // Add default users
  users = [
    {
      id: '1',
      email: 'admin@tubewise.com',
      name: 'Admin User',
      password: 'admin123', // In a real app, this would be hashed
      role: UserRole.ADMIN,
      credits: 999,
      languagePreference: 'en',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      email: 'user@example.com',
      name: 'Demo User',
      password: 'password123', // In a real app, this would be hashed
      role: UserRole.FREE,
      credits: 10,
      languagePreference: 'en',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      email: 'free@test.com',
      name: 'Test Free User',
      password: 'test_password_hash', // In a real app, this would be hashed
      role: UserRole.FREE,
      credits: 10,
      languagePreference: 'en',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '4',
      email: 'pro@test.com',
      name: 'Test Pro User',
      password: 'test_password_hash', // In a real app, this would be hashed
      role: UserRole.PRO,
      credits: 100,
      languagePreference: 'en',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  videos = [];
  savedVideos = [];
  videoSummaries = [];
  keyPoints = [];
  generatedContents = [];
  usageStats = [];
};

// Save database to localStorage
const saveDbToStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      const dbData = {
        users,
        videos,
        savedVideos,
        videoSummaries,
        keyPoints,
        generatedContents,
        usageStats
      };
      
      localStorage.setItem('tubewise_db', JSON.stringify(dbData));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }
};

// Initialize database on import
initializeDb();

// Database service
export const dbService = {
  // User operations
  findUserByEmail: (email: string): User | undefined => {
    return users.find(user => user.email === email);
  },
  
  findUserById: (id: string): User | undefined => {
    return users.find(user => user.id === id);
  },
  
  createUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    const newUser: User = {
      ...user,
      id: (users.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.push(newUser);
    saveDbToStorage();
    
    return newUser;
  },
  
  updateUser: (id: string, data: Partial<User>): User | undefined => {
    const index = users.findIndex(user => user.id === id);
    if (index === -1) return undefined;
    
    users[index] = {
      ...users[index],
      ...data,
      updatedAt: new Date()
    };
    
    saveDbToStorage();
    return users[index];
  },
  
  // Video operations
  findVideoById: (videoId: string): Video | undefined => {
    return videos.find(video => video.videoId === videoId);
  },
  
  createVideo: (video: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>): Video => {
    // Check if video already exists
    const existingVideo = videos.find(v => v.videoId === video.videoId);
    if (existingVideo) return existingVideo;
    
    const newVideo: Video = {
      ...video,
      id: (videos.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    videos.push(newVideo);
    saveDbToStorage();
    
    return newVideo;
  },
  
  // Saved video operations
  findSavedVideosByUserId: (userId: string): SavedVideo[] => {
    return savedVideos.filter(sv => sv.userId === userId);
  },
  
  saveVideo: (userId: string, video: Video, summary?: VideoSummary): SavedVideo => {
    // Check if video already exists
    let existingVideo = videos.find(v => v.videoId === video.videoId);
    
    if (!existingVideo) {
      // Create new video
      existingVideo = {
        ...video,
        id: (videos.length + 1).toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      videos.push(existingVideo);
    }
    
    // Check if already saved
    const existingSaved = savedVideos.find(
      sv => sv.videoId === existingVideo!.id && sv.userId === userId
    );
    
    if (existingSaved) {
      return existingSaved;
    }
    
    // Create new saved video
    const savedVideo: SavedVideo = {
      id: (savedVideos.length + 1).toString(),
      userId,
      videoId: existingVideo.id,
      savedAt: new Date(),
      video: existingVideo
    };
    
    savedVideos.push(savedVideo);
    saveDbToStorage();
    
    return savedVideo;
  },
  
  removeSavedVideo: (userId: string, videoId: string): boolean => {
    const index = savedVideos.findIndex(
      sv => sv.videoId === videoId && sv.userId === userId
    );
    
    if (index === -1) return false;
    
    savedVideos.splice(index, 1);
    saveDbToStorage();
    
    return true;
  },
  
  // Video summary operations
  findSummaryByVideoId: (videoId: string): VideoSummary | undefined => {
    return videoSummaries.find(summary => summary.videoId === videoId);
  },
  
  createSummary: (summary: Omit<VideoSummary, 'id' | 'createdAt' | 'updatedAt'>): VideoSummary => {
    // Check if summary already exists
    const existingSummary = videoSummaries.find(s => s.videoId === summary.videoId);
    if (existingSummary) {
      // Update existing summary
      existingSummary.title = summary.title;
      existingSummary.summary = summary.summary;
      existingSummary.keyPoints = summary.keyPoints;
      existingSummary.updatedAt = new Date();
      
      saveDbToStorage();
      return existingSummary;
    }
    
    // Create new summary
    const newSummary: VideoSummary = {
      ...summary,
      id: (videoSummaries.length + 1).toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    videoSummaries.push(newSummary);
    saveDbToStorage();
    
    return newSummary;
  },
  
  getAllSummaries: (): VideoSummary[] => {
    return [...videoSummaries];
  },
  
  // Usage stats operations
  findUsageStatsByUserId: (userId: string): UsageStats | undefined => {
    return usageStats.find(stats => stats.userId === userId);
  },
  
  incrementVideoSummarized: (userId: string): UsageStats => {
    let stats = usageStats.find(s => s.userId === userId);
    
    if (!stats) {
      // Create new stats
      stats = {
        id: (usageStats.length + 1).toString(),
        userId,
        videosSummarized: 1,
        videosCompared: 0,
        contentGenerated: 0,
        lastActive: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      usageStats.push(stats);
    } else {
      // Update existing stats
      stats.videosSummarized += 1;
      stats.lastActive = new Date();
      stats.updatedAt = new Date();
    }
    
    saveDbToStorage();
    return stats;
  },
  
  incrementVideosCompared: (userId: string): UsageStats => {
    let stats = usageStats.find(s => s.userId === userId);
    
    if (!stats) {
      // Create new stats
      stats = {
        id: (usageStats.length + 1).toString(),
        userId,
        videosSummarized: 0,
        videosCompared: 1,
        contentGenerated: 0,
        lastActive: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      usageStats.push(stats);
    } else {
      // Update existing stats
      stats.videosCompared += 1;
      stats.lastActive = new Date();
      stats.updatedAt = new Date();
    }
    
    saveDbToStorage();
    return stats;
  },
  
  incrementContentGenerated: (userId: string): UsageStats => {
    let stats = usageStats.find(s => s.userId === userId);
    
    if (!stats) {
      // Create new stats
      stats = {
        id: (usageStats.length + 1).toString(),
        userId,
        videosSummarized: 0,
        videosCompared: 0,
        contentGenerated: 1,
        lastActive: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      usageStats.push(stats);
    } else {
      // Update existing stats
      stats.contentGenerated += 1;
      stats.lastActive = new Date();
      stats.updatedAt = new Date();
    }
    
    saveDbToStorage();
    return stats;
  }
};
