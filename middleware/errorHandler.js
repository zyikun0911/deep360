/**
 * 全局错误处理中间件
 */

const winston = require('winston');

// 错误类型定义
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class AuthenticationError extends AppError {
  constructor(message = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class RateLimitError extends AppError {
  constructor(message = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

// 错误日志配置
const errorLogger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/**
 * 处理 Mongoose 验证错误
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(val => ({
    field: val.path,
    message: val.message,
    value: val.value
  }));

  return new ValidationError(`数据验证失败: ${errors.map(e => e.message).join(', ')}`, errors);
};

/**
 * 处理 Mongoose 重复键错误
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  
  return new ConflictError(`${field} '${value}' 已存在`);
};

/**
 * 处理 Mongoose 转换错误
 */
const handleCastError = (err) => {
  return new ValidationError(`无效的 ${err.path}: ${err.value}`);
};

/**
 * 处理 JWT 错误
 */
const handleJWTError = () => {
  return new AuthenticationError('无效的认证令牌');
};

const handleJWTExpiredError = () => {
  return new AuthenticationError('认证令牌已过期');
};

/**
 * 处理 Redis 错误
 */
const handleRedisError = (err) => {
  errorLogger.error('Redis error:', err);
  return new AppError('缓存服务暂时不可用', 503, 'REDIS_ERROR');
};

/**
 * 处理插件错误
 */
const handlePluginError = (err) => {
  if (err.message.includes('权限')) {
    return new AuthorizationError('插件权限不足');
  }
  if (err.message.includes('不存在')) {
    return new NotFoundError('插件不存在');
  }
  return new AppError(`插件错误: ${err.message}`, 500, 'PLUGIN_ERROR');
};

/**
 * 发送错误响应到客户端
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      status: err.status,
      code: err.code,
      message: err.message,
      stack: err.stack,
      ...(err.field && { field: err.field })
    }
  });
};

const sendErrorProd = (err, res) => {
  // 操作性错误，发送给客户端
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.field && { field: err.field })
      }
    });
  } else {
    // 编程错误，不要泄露错误详情
    errorLogger.error('UNEXPECTED ERROR:', err);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      }
    });
  }
};

/**
 * 全局错误处理中间件
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 记录错误
  const errorInfo = {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.userId || 'anonymous',
    timestamp: new Date().toISOString()
  };

  if (err.statusCode >= 500) {
    errorLogger.error('Server Error:', errorInfo);
  } else {
    errorLogger.warn('Client Error:', errorInfo);
  }

  let error = { ...err };
  error.message = err.message;

  // Mongoose 错误处理
  if (err.name === 'ValidationError') error = handleValidationError(error);
  if (err.code === 11000) error = handleDuplicateKeyError(error);
  if (err.name === 'CastError') error = handleCastError(error);

  // JWT 错误处理
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Redis 错误处理
  if (err.code === 'ECONNREFUSED' && err.port === 6379) error = handleRedisError(error);

  // 插件错误处理
  if (err.message && err.message.includes('Plugin')) error = handlePluginError(error);

  // 发送错误响应
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * 404 错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`路径 ${req.originalUrl} 不存在`);
  next(error);
};

/**
 * 异步错误捕获包装器
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 未捕获异常处理
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    errorLogger.error('UNCAUGHT EXCEPTION! Shutting down...', {
      error: err.message,
      stack: err.stack
    });
    
    process.exit(1);
  });
};

/**
 * 未处理的 Promise 拒绝
 */
const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (err) => {
    errorLogger.error('UNHANDLED REJECTION! Shutting down...', {
      error: err.message,
      stack: err.stack
    });
    
    server.close(() => {
      process.exit(1);
    });
  });
};

/**
 * 优雅关闭处理
 */
const handleGracefulShutdown = (server) => {
  const gracefulShutdown = (signal) => {
    errorLogger.info(`${signal} received, shutting down gracefully...`);
    
    server.close(() => {
      errorLogger.info('Process terminated');
      process.exit(0);
    });

    // 强制关闭超时
    setTimeout(() => {
      errorLogger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

module.exports = {
  // 错误类
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // 中间件
  globalErrorHandler,
  notFoundHandler,
  catchAsync,
  
  // 进程错误处理
  handleUncaughtException,
  handleUnhandledRejection,
  handleGracefulShutdown
};