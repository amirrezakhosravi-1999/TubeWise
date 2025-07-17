export interface Video {
  id: string;
  videoId: string; // YouTube video ID
  title: string;
  url: string;
  thumbnailUrl: string;
  duration: string; // Format: "HH:MM:SS"
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedVideo {
  id: string;
  userId: string;
  videoId: string; // Reference to Video.id
  savedAt: Date;
  video: Video;
}

export interface KeyPoint {
  id: string;
  summaryId: string; // Reference to VideoSummary.id
  point: string;
  timestamp: string; // Format: "MM:SS"
  confidence: number; // 0-1 value indicating confidence in this key point
}

export interface VideoSummary {
  id: string;
  videoId: string; // YouTube video ID
  title: string;
  summary: string;
  keyPoints: KeyPoint[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedContent {
  id: string;
  userId: string;
  summaryId: string; // Reference to VideoSummary.id
  contentType: 'twitter' | 'linkedin' | 'notion';
  content: string;
  createdAt: Date;
}
