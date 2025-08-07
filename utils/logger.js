/**
 * 专业日志系统
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 自定义日志格式
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

/**
 * 控制台日志格式
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

/**
 * 日志传输配置
 */
const transports = [
  // 错误日志
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    format: customFormat
  }),

  // 警告日志
  new winston.transports.File({
    filename: path.join(logDir, 'warn.log'),
    level: 'warn',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: customFormat
  }),

  // 完整日志
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    maxsize: 10485760, // 10MB
    maxFiles: 15,
    format: customFormat
  }),

  // 应用日志
  new winston.transports.File({
    filename: path.join(logDir, 'app.log'),
    level: 'info',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
    format: customFormat
  })
];

// 开发环境添加控制台输出
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
} else {
  // 生产环境仅输出错误到控制台
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'error'
    })
  );
}

/**
 * 创建主日志器
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  format: customFormat,
  transports,
  exitOnError: false
});

/**
 * 创建特定模块的日志器
 */
const createModuleLogger = (module) => {
  return {
    debug: (message, meta = {}) => logger.debug(message, { module, ...meta }),
    info: (message, meta = {}) => logger.info(message, { module, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { module, ...meta }),
    error: (message, meta = {}) => logger.error(message, { module, ...meta })
  };
};

/**
 * HTTP 请求日志中间件
 */
const httpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

const httpLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // 拦截响应
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // 记录请求日志
    httpLogger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
      duration: `${duration}ms`,
      userId: req.user?.userId || 'anonymous',
      timestamp: new Date().toISOString()
    });

    originalSend.call(this, data);
  };

  next();
};

/**
 * 性能监控日志
 */
const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

/**
 * 性能计时器
 */
class PerformanceTimer {
  constructor(operation) {
    this.operation = operation;
    this.startTime = process.hrtime.bigint();
    this.markers = [];
  }

  mark(label) {
    const currentTime = process.hrtime.bigint();
    this.markers.push({
      label,
      time: currentTime,
      duration: Number(currentTime - this.startTime) / 1000000 // 转换为毫秒
    });
    return this;
  }

  end(metadata = {}) {
    const endTime = process.hrtime.bigint();
    const totalDuration = Number(endTime - this.startTime) / 1000000; // 毫秒

    performanceLogger.info('Performance Measurement', {
      operation: this.operation,
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      markers: this.markers,
      ...metadata
    });

    return totalDuration;
  }
}

/**
 * 安全日志器（用于记录安全相关事件）
 */
const securityLogger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      level: 'error',
      format: winston.format.simple()
    })
  ]
});

/**
 * 业务日志器（用于记录业务操作）
 */
const businessLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'business.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 15
    })
  ]
});

/**
 * 系统监控日志器
 */
const systemLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'system.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

/**
 * 日志轮转和清理
 */
const logRotation = {
  cleanOldLogs: (maxAgeInDays = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

    fs.readdir(logDir, (err, files) => {
      if (err) {
        logger.error('Failed to read log directory', { error: err.message });
        return;
      }

      files.forEach(file => {
        const filePath = path.join(logDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;

          if (stats.mtime < cutoffDate) {
            fs.unlink(filePath, (err) => {
              if (err) {
                logger.error('Failed to delete old log file', { file, error: err.message });
              } else {
                logger.info('Deleted old log file', { file });
              }
            });
          }
        });
      });
    });
  },

  getLogStats: () => {
    return new Promise((resolve, reject) => {
      fs.readdir(logDir, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        const stats = {
          totalFiles: 0,
          totalSize: 0,
          files: []
        };

        let pending = files.length;
        if (pending === 0) {
          resolve(stats);
          return;
        }

        files.forEach(file => {
          const filePath = path.join(logDir, file);
          fs.stat(filePath, (err, fileStat) => {
            if (!err) {
              stats.totalFiles++;
              stats.totalSize += fileStat.size;
              stats.files.push({
                name: file,
                size: fileStat.size,
                modified: fileStat.mtime
              });
            }

            pending--;
            if (pending === 0) {
              resolve(stats);
            }
          });
        });
      });
    });
  }
};

/**
 * 紧急情况下的简单日志函数
 */
const emergencyLog = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} [${level.toUpperCase()}] ${message} ${JSON.stringify(data)}\n`;
  
  try {
    fs.appendFileSync(path.join(logDir, 'emergency.log'), logEntry);
  } catch (err) {
    console.error('Emergency logging failed:', err);
    console.error('Original log:', logEntry);
  }
};

module.exports = {
  logger,
  createModuleLogger,
  httpLoggerMiddleware,
  performanceLogger,
  PerformanceTimer,
  securityLogger,
  businessLogger,
  systemLogger,
  logRotation,
  emergencyLog
};