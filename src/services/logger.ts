/**
 * Logger service for AI Medica UG
 * Provides consistent logging levels and potential for remote monitoring
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    if (level === 'error') {
      console.error(formattedMessage, data || '');
      // In a real app, we might send this to Sentry or a custom backend
    } else if (level === 'warn') {
      console.warn(formattedMessage, data || '');
    } else if (!this.isProduction || level === 'info') {
      console.log(formattedMessage, data || '');
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
}

export const logger = new Logger();
