/**
 * Comprehensive Logging Middleware for Backend Service
 * Logs all requests, responses, database operations, and errors
 */
import winston from 'winston';

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'backend-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        })
      )
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json()
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json()
    })
  ]
});

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

/**
 * Request/Response Logging Middleware
 */
export const requestLogger = (req, res, next) => {
  const requestStart = Date.now();

  // Log request
  const requestLog = {
    type: 'request',
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    user_id: req.user?.id || null,
    user_role: req.user?.role || null,
    ip: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent')
  };

  // Don't log sensitive fields
  if (req.body) {
    const sanitizedBody = { ...req.body };
    delete sanitizedBody.password;
    delete sanitizedBody.password_hash;
    requestLog.body = sanitizedBody;
  }

  logger.info('Incoming request', requestLog);

  // Capture response
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - requestStart;

    const responseLog = {
      type: 'response',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration_ms: duration,
      user_id: req.user?.id || null,
      user_role: req.user?.role || null
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error('Response (Server Error)', responseLog);
    } else if (res.statusCode >= 400) {
      logger.warn('Response (Client Error)', responseLog);
    } else {
      logger.info('Response (Success)', responseLog);
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Database Query Logger Wrapper
 */
export const logDatabaseQuery = (queryType, queryText, params, startTime, result, error) => {
  const duration = Date.now() - startTime;

  const logData = {
    type: 'database',
    query_type: queryType,
    query: queryText.substring(0, 200), // Limit query length
    params_count: Array.isArray(params) ? params.length : 0,
    duration_ms: duration,
    rows_affected: result?.rowCount || 0,
    success: !error
  };

  if (error) {
    logger.error('Database query failed', {
      ...logData,
      error: error.message,
      stack: error.stack
    });
  } else if (duration > 1000) {
    // Warn on slow queries
    logger.warn('Slow database query', logData);
  } else {
    logger.debug('Database query', logData);
  }
};

/**
 * Business Logic Logger
 */
export const logBusinessEvent = (event, details) => {
  logger.info(`Business Event: ${event}`, {
    type: 'business',
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error Logger
 */
export const logError = (error, context = {}) => {
  logger.error('Application error', {
    type: 'error',
    message: error.message,
    stack: error.stack,
    ...context
  });
};

/**
 * Export logger instance for direct use
 */
export default logger;
