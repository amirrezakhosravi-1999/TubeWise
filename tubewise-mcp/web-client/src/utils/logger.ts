import { analyticsService } from '../services/analyticsService';

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Log categories
export enum LogCategory {
  API = 'api',
  AUTH = 'auth',
  PAYMENT = 'payment',
  SUBSCRIPTION = 'subscription',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action',
  SYSTEM = 'system',
  SECURITY = 'security'
}

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: Date;
  data?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

// Logger class
class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;
  private sessionId: string | null = null;
  private userId: string | null = null;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.sessionId = this.generateSessionId();
  }

  // Generate a unique session ID
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Set user ID
  public setUserId(userId: string | null): void {
    this.userId = userId;
  }

  // Create a log entry
  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    requestId?: string
  ): LogEntry {
    return {
      level,
      category,
      message,
      timestamp: new Date(),
      data,
      userId: this.userId || undefined,
      sessionId: this.sessionId || undefined,
      requestId
    };
  }

  // Log to console
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, entry.message, entry.data || '');
        break;
    }
  }

  // Log to analytics
  private logToAnalytics(entry: LogEntry): void {
    // Only log warnings, errors, and critical issues to analytics in production
    if (this.isProduction && 
        (entry.level === LogLevel.WARN || 
         entry.level === LogLevel.ERROR || 
         entry.level === LogLevel.CRITICAL)) {
      analyticsService.trackEvent('Log', {
        log_level: entry.level,
        log_category: entry.category,
        log_message: entry.message,
        log_timestamp: entry.timestamp.toISOString(),
        log_user_id: entry.userId,
        log_session_id: entry.sessionId,
        log_request_id: entry.requestId
      });
    }
  }

  // Main log method
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: any,
    requestId?: string
  ): LogEntry {
    const entry = this.createLogEntry(level, category, message, data, requestId);
    
    // Always log to console in development
    if (this.isDevelopment || level !== LogLevel.DEBUG) {
      this.logToConsole(entry);
    }
    
    // Log to analytics service
    this.logToAnalytics(entry);
    
    return entry;
  }

  // Public logging methods
  public debug(category: LogCategory, message: string, data?: any, requestId?: string): LogEntry {
    return this.log(LogLevel.DEBUG, category, message, data, requestId);
  }

  public info(category: LogCategory, message: string, data?: any, requestId?: string): LogEntry {
    return this.log(LogLevel.INFO, category, message, data, requestId);
  }

  public warn(category: LogCategory, message: string, data?: any, requestId?: string): LogEntry {
    return this.log(LogLevel.WARN, category, message, data, requestId);
  }

  public error(category: LogCategory, message: string, data?: any, requestId?: string): LogEntry {
    return this.log(LogLevel.ERROR, category, message, data, requestId);
  }

  public critical(category: LogCategory, message: string, data?: any, requestId?: string): LogEntry {
    return this.log(LogLevel.CRITICAL, category, message, data, requestId);
  }

  // Log API requests
  public logApiRequest(
    method: string,
    url: string,
    data?: any,
    requestId?: string
  ): LogEntry {
    return this.info(
      LogCategory.API,
      `API Request: ${method} ${url}`,
      { method, url, data },
      requestId
    );
  }

  // Log API responses
  public logApiResponse(
    method: string,
    url: string,
    status: number,
    data?: any,
    duration?: number,
    requestId?: string
  ): LogEntry {
    return this.info(
      LogCategory.API,
      `API Response: ${method} ${url} (${status})`,
      { method, url, status, data, duration },
      requestId
    );
  }

  // Log API errors
  public logApiError(
    method: string,
    url: string,
    status: number,
    error: any,
    requestId?: string
  ): LogEntry {
    return this.error(
      LogCategory.API,
      `API Error: ${method} ${url} (${status})`,
      { method, url, status, error },
      requestId
    );
  }

  // Log authentication events
  public logAuth(action: string, success: boolean, data?: any, requestId?: string): LogEntry {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    return this.log(
      level,
      LogCategory.AUTH,
      `Auth ${action}: ${success ? 'Success' : 'Failed'}`,
      data,
      requestId
    );
  }

  // Log payment events
  public logPayment(action: string, success: boolean, data?: any, requestId?: string): LogEntry {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    return this.log(
      level,
      LogCategory.PAYMENT,
      `Payment ${action}: ${success ? 'Success' : 'Failed'}`,
      data,
      requestId
    );
  }

  // Log performance metrics
  public logPerformance(action: string, duration: number, data?: any, requestId?: string): LogEntry {
    // Determine log level based on duration thresholds
    let level = LogLevel.DEBUG;
    if (duration > 5000) {
      level = LogLevel.WARN;
    } else if (duration > 1000) {
      level = LogLevel.INFO;
    }
    
    return this.log(
      level,
      LogCategory.PERFORMANCE,
      `Performance ${action}: ${duration}ms`,
      { ...data, duration },
      requestId
    );
  }

  // Log user actions
  public logUserAction(action: string, data?: any, requestId?: string): LogEntry {
    return this.info(
      LogCategory.USER_ACTION,
      `User Action: ${action}`,
      data,
      requestId
    );
  }

  // Log security events
  public logSecurity(action: string, success: boolean, data?: any, requestId?: string): LogEntry {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    return this.log(
      level,
      LogCategory.SECURITY,
      `Security ${action}: ${success ? 'Success' : 'Failed'}`,
      data,
      requestId
    );
  }
}

// Create a singleton instance
const loggerInstance = new Logger();

// Export the logger
export { loggerInstance as logger };
export default loggerInstance;
