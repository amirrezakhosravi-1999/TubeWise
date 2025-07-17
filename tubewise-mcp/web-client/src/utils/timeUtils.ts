/**
 * تبدیل timestamp به ثانیه برای استفاده در URL یوتیوب
 * @param timestamp فرمت زمانی مانند [00:00] یا [03:10] یا [01:23:45]
 * @returns تعداد ثانیه
 */
export const convertTimestampToSeconds = (timestamp: string): number => {
  // حذف براکت‌ها اگر وجود داشته باشند
  const cleanTimestamp = timestamp.replace(/[\[\]]/g, '');
  
  // الگوی تطبیق برای فرمت‌های مختلف زمانی
  const hourPattern = /^(\d+):(\d+):(\d+)$/; // ساعت:دقیقه:ثانیه
  const minutePattern = /^(\d+):(\d+)$/; // دقیقه:ثانیه
  
  let seconds = 0;
  
  if (hourPattern.test(cleanTimestamp)) {
    const [, hours, minutes, secs] = cleanTimestamp.match(hourPattern) || [];
    seconds = (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(secs);
  } else if (minutePattern.test(cleanTimestamp)) {
    const [, minutes, secs] = cleanTimestamp.match(minutePattern) || [];
    seconds = (parseInt(minutes) * 60) + parseInt(secs);
  }
  
  return seconds;
};
