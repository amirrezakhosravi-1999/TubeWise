export enum ContentType {
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  NOTION = 'notion'
}

export interface GeneratedContent {
  id: string;
  userId: string;
  summaryId: string; // Reference to VideoSummary.id
  contentType: ContentType;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageStats {
  id: string;
  userId: string;
  videosSummarized: number;
  videosCompared: number;
  contentGenerated: number;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}