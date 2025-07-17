export interface KeyPoint {
  timestamp: string;
  point: string;
}

export interface Summary {
  videoId: string;
  title: string;
  summary: string;
  keyPoints: KeyPoint[];
}

export interface ComparisonResult {
  commonTopics: string[];
  differences: string[];
  recommendation: string;
  user_role?: string;
}

export interface TimelineSuggestion {
  timestamp: string;
  text: string;
  relevance: string;
}

export interface ChatResponse {
  videoId: string;
  response: string;
  answer?: string; // برای سازگاری با نسخه‌های قدیمی
  timeline_suggestions?: TimelineSuggestion[]; // برای سازگاری با API که از snake_case استفاده می‌کند
  timelineSuggestions?: TimelineSuggestion[]; // برای سازگاری با فرانت‌اند
  user_role?: string;
}

export interface ContentGenerationResult {
  content: string;
  format: string;
  title: string;
  user_role?: string;
}

export interface UsageLimit {
  limit: number;
  used: number;
  remaining: number;
  allowed: boolean;
}

export interface UserLimits {
  user_role: string;
  limits: {
    videos: UsageLimit;
    comparisons: UsageLimit;
    content_generation: UsageLimit;
    videos_compared?: UsageLimit; // برای سازگاری با API قدیمی
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  savedVideos?: string[];
  credits?: number;
  language_preference?: string;
  usageLimits?: UserLimits;
}

// اینترفیس ChatMessage با فیلدهای مورد نیاز برای سازگاری با کد فعلی
export interface ChatMessage {
  id: string;
  videoId?: string;
  message?: string;
  content?: string;
  response?: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  timelineSuggestions: TimelineSuggestion[];
}

export interface GeneratedContent {
  id: string;
  videoId: string;
  content: string;
  format: string;
  title: string;
  createdAt: Date;
}
