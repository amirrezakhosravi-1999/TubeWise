import axios from 'axios';
import { UserLimits } from '../types';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * سرویس مدیریت محدودیت‌های استفاده
 */
const usageLimitsService = {
  /**
   * دریافت محدودیت‌های استفاده کاربر
   * @param userId شناسه کاربر
   * @returns محدودیت‌های استفاده کاربر
   */
  getUserLimits: async (userId: string): Promise<UserLimits> => {
    try {
      const response = await axios.get(`${apiUrl}/api/user/${userId}/usage`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user limits:', error);
      throw error;
    }
  },

  /**
   * بررسی آیا کاربر می‌تواند از ویژگی مقایسه استفاده کند
   * @param userLimits محدودیت‌های استفاده کاربر
   * @returns آیا کاربر می‌تواند از ویژگی مقایسه استفاده کند
   */
  canCompareVideos: (userLimits: UserLimits | null): boolean => {
    if (!userLimits) return false;
    
    // کاربران رایگان نمی‌توانند از ویژگی مقایسه استفاده کنند
    if (userLimits.user_role === 'free') return false;
    
    // بررسی محدودیت استفاده
    return userLimits.limits.videos_compared.allowed;
  },

  /**
   * بررسی آیا کاربر می‌تواند از ویژگی خلاصه‌سازی استفاده کند
   * @param userLimits محدودیت‌های استفاده کاربر
   * @returns آیا کاربر می‌تواند از ویژگی خلاصه‌سازی استفاده کند
   */
  canSummarizeVideos: (userLimits: UserLimits | null): boolean => {
    if (!userLimits) return true; // کاربران مهمان می‌توانند خلاصه‌سازی کنند
    
    // بررسی محدودیت استفاده
    return userLimits.limits.videos_summarized.allowed;
  },

  /**
   * بررسی آیا کاربر می‌تواند از ویژگی تولید محتوا استفاده کند
   * @param userLimits محدودیت‌های استفاده کاربر
   * @returns آیا کاربر می‌تواند از ویژگی تولید محتوا استفاده کند
   */
  canGenerateContent: (userLimits: UserLimits | null): boolean => {
    if (!userLimits) return false;
    
    // بررسی محدودیت استفاده
    return userLimits.limits.content_generated.allowed;
  },

  /**
   * دریافت حداکثر تعداد ویدیوهایی که کاربر می‌تواند مقایسه کند
   * @param userRole نقش کاربر
   * @returns حداکثر تعداد ویدیوها
   */
  getMaxCompareVideos: (userRole: string): number => {
    return userRole === 'pro' ? 10 : 3;
  }
};

export default usageLimitsService;
