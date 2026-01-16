type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const formatMessage = (level: LogLevel, message: string, data?: unknown): string => {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
};

export const logger = {
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(formatMessage('debug', message, data));
    }
  },
  info: (message: string, data?: unknown) => {
    console.log(formatMessage('info', message, data));
  },
  warn: (message: string, data?: unknown) => {
    console.warn(formatMessage('warn', message, data));
  },
  error: (message: string, data?: unknown) => {
    console.error(formatMessage('error', message, data));
  },
};
