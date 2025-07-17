// تعریف انواع برای برنامه TubeWise

// تعریف نوع برای نقاط کلیدی ویدیو
export interface KeyPoint {
  timestamp: string;
  point: string;
}

// تعریف نوع برای خلاصه ویدیو
export interface Summary {
  videoId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  duration: string;
  summary: string;
  keyPoints: KeyPoint[];
}

// تعریف نوع برای پیام‌های چت
export interface ChatMessage {
  id: string;
  videoId: string;
  message: string;
  response: string;
  timelineSuggestions: Array<TimelineSuggestion>;
  timestamp: Date;
}

// تعریف نوع برای خطاهای axios
export interface AxiosError extends Error {
  response?: {
    data?: any;
    status?: number;
    headers?: any;
  };
  request?: any;
  config?: any;
}

// تعریف نوع برای پاسخ‌های API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// تعریف نوع برای نتیجه مقایسه ویدیوها
export interface ComparisonResult {
  commonTopics: string[];
  differences: string[];
  recommendation: string;
}

// تعریف نوع برای پاسخ چت
export interface ChatResponse {
  answer: string;
  timelineSuggestions?: Array<TimelineSuggestion>;
}

// تعریف نوع برای پیشنهادات زمانی
export interface TimelineSuggestion {
  timestamp: string;
  text: string;
  relevance: string;
}

// تعریف نوع برای محتوای تولید شده
export interface GeneratedContent {
  id: string;
  videoId: string;
  content: string;
  format: string;
  title: string;
  createdAt: Date;
}
