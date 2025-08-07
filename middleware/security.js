/**
 * 安全中间件模块
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const validator = require('validator');
const { AppError, ValidationError } = require('./errorHandler');

/**
 * 基础安全配置
 */
const basicSecurity = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: "no-referrer" },
    xssFilter: true
  });
};

/**
 * 请求频率限制
 */
const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // 跳过内部健康检查
      return req.path === '/health' || req.path === '/metrics';
    },
    keyGenerator: (req) => {
      return req.ip + ':' + req.user?.userId || 'anonymous';
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * API 专用频率限制
 */
const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // API 允许更高频率
  message: {
    success: false,
    error: {
      code: 'API_RATE_LIMIT_EXCEEDED',
      message: 'API 请求频率超限，请稍后再试'
    }
  }
});

/**
 * 认证接口频率限制
 */
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 认证接口限制更严格
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: '登录尝试次数过多，请稍后再试'
    }
  },
  skipSuccessfulRequests: true
});

/**
 * 密码重置频率限制
 */
const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 每小时最多3次密码重置
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: '密码重置请求过于频繁，请稍后再试'
    }
  }
});

/**
 * 数据清理中间件
 */
const dataSanitization = () => {
  return [
    // 防止 NoSQL 注入
    mongoSanitize({
      replaceWith: '_'
    }),
    
    // 防止 XSS 攻击
    xss(),
    
    // 防止 HTTP 参数污染
    hpp({
      whitelist: ['tags', 'categories', 'fields'] // 允许的数组参数
    })
  ];
};

/**
 * 输入验证中间件
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return next(new ValidationError('输入数据验证失败', details));
    }

    req.body = value;
    next();
  };
};

/**
 * 文件上传安全验证
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
  } = options;

  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];
    
    for (const file of files) {
      // 检查文件大小
      if (file.size > maxSize) {
        return next(new ValidationError(`文件大小不能超过 ${maxSize / 1024 / 1024}MB`));
      }

      // 检查文件类型
      if (!allowedTypes.includes(file.mimetype)) {
        return next(new ValidationError(`不支持的文件类型: ${file.mimetype}`));
      }

      // 检查文件扩展名
      const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (!allowedExtensions.includes(ext)) {
        return next(new ValidationError(`不支持的文件扩展名: ${ext}`));
      }

      // 检查文件名安全性
      if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
        return next(new ValidationError('文件名包含非法字符'));
      }
    }

    next();
  };
};

/**
 * IP 白名单验证
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next();
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      return next(new AppError('访问被拒绝', 403, 'IP_NOT_ALLOWED'));
    }

    next();
  };
};

/**
 * User-Agent 验证
 */
const validateUserAgent = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    return next(new AppError('缺少 User-Agent 头', 400, 'MISSING_USER_AGENT'));
  }

  // 检查是否为可疑的 User-Agent
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /crawler/i,
    /spider/i
  ];

  if (process.env.NODE_ENV === 'production') {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(userAgent)) {
        return next(new AppError('可疑的请求来源', 403, 'SUSPICIOUS_USER_AGENT'));
      }
    }
  }

  next();
};

/**
 * API 密钥验证
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.get('X-API-Key');
  
  if (!apiKey) {
    return next(new AppError('缺少 API 密钥', 401, 'MISSING_API_KEY'));
  }

  // 验证 API 密钥格式
  if (!validator.isUUID(apiKey, 4)) {
    return next(new AppError('无效的 API 密钥格式', 401, 'INVALID_API_KEY_FORMAT'));
  }

  // 这里应该从数据库验证 API 密钥
  // const isValid = await validateApiKeyInDatabase(apiKey);
  // if (!isValid) {
  //   return next(new AppError('无效的 API 密钥', 401, 'INVALID_API_KEY'));
  // }

  next();
};

/**
 * CORS 预检请求处理
 */
const handleCorsPreflightManually = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.sendStatus(200);
  } else {
    next();
  }
};

/**
 * 请求日志记录
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求开始
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} - ${req.ip}`);

  // 记录响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });

  next();
};

/**
 * 防止暴力破解
 */
const preventBruteForce = (options = {}) => {
  const attempts = new Map();
  const {
    maxAttempts = 10,
    windowMs = 15 * 60 * 1000, // 15 minutes
    blockDuration = 60 * 60 * 1000 // 1 hour
  } = options;

  return (req, res, next) => {
    const key = req.ip + ':' + req.originalUrl;
    const now = Date.now();
    
    // 清理过期记录
    for (const [k, v] of attempts.entries()) {
      if (now - v.firstAttempt > windowMs) {
        attempts.delete(k);
      }
    }

    const attempt = attempts.get(key);
    
    if (attempt) {
      if (attempt.blocked && now - attempt.blockedAt < blockDuration) {
        return next(new AppError('IP 已被临时封禁', 429, 'IP_BLOCKED'));
      }
      
      if (now - attempt.firstAttempt < windowMs) {
        attempt.count++;
        if (attempt.count > maxAttempts) {
          attempt.blocked = true;
          attempt.blockedAt = now;
          return next(new AppError('尝试次数过多，IP 已被临时封禁', 429, 'IP_BLOCKED'));
        }
      } else {
        // 重置计数
        attempt.count = 1;
        attempt.firstAttempt = now;
        attempt.blocked = false;
      }
    } else {
      attempts.set(key, {
        count: 1,
        firstAttempt: now,
        blocked: false
      });
    }

    next();
  };
};

module.exports = {
  basicSecurity,
  createRateLimit,
  apiRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  dataSanitization,
  validateInput,
  validateFileUpload,
  ipWhitelist,
  validateUserAgent,
  validateApiKey,
  handleCorsPreflightManually,
  requestLogger,
  preventBruteForce
};