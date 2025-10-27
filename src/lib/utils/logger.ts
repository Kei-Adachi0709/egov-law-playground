type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: string;
  detail?: unknown;
}

type LogListener = (payload: LogPayload) => void;

const listeners = new Set<LogListener>();

const LOGGER_NAMESPACE = '[Hourei]';

const emit = (payload: LogPayload) => {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (listenerError) {
      console.error(`${LOGGER_NAMESPACE} Logger listener failure`, listenerError);
    }
  });
};

const toConsoleMethod = (level: LogLevel): ((...args: unknown[]) => void) => {
  switch (level) {
    case 'error':
      return console.error;
    case 'warn':
      return console.warn;
    default:
      return console.log;
  }
};

const log = (level: LogLevel, message: string, detail?: unknown, context?: string) => {
  const payload: LogPayload = {
    level,
    message,
    timestamp: Date.now(),
    context,
    detail
  };
  const consoleMethod = toConsoleMethod(level);
  if (detail !== undefined) {
    consoleMethod(`${LOGGER_NAMESPACE} ${message}`, detail);
  } else {
    consoleMethod(`${LOGGER_NAMESPACE} ${message}`);
  }
  emit(payload);
};

export const logInfo = (message: string, detail?: unknown, context?: string) =>
  log('info', message, detail, context);

export const logWarn = (message: string, detail?: unknown, context?: string) =>
  log('warn', message, detail, context);

export const logError = (message: string, detail?: unknown, context?: string) =>
  log('error', message, detail, context);

export const registerLogListener = (listener: LogListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export type { LogLevel, LogPayload, LogListener };
