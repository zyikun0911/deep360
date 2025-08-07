/**
 * 请求参数验证中间件
 */
const validateRequest = (requiredFields) => {
  return (req, res, next) => {
    const errors = [];
    
    // 检查必需字段
    for (const field of requiredFields) {
      if (!req.body[field]) {
        errors.push(`缺少必需参数: ${field}`);
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors
      });
    }
    
    next();
  };
};

/**
 * 邮箱格式验证
 */
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式无效'
      });
    }
  }
  
  next();
};

/**
 * 密码强度验证
 */
const validatePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度至少为6位'
      });
    }
    
    // 可以添加更复杂的密码规则
    // const hasUpperCase = /[A-Z]/.test(password);
    // const hasLowerCase = /[a-z]/.test(password);
    // const hasNumbers = /\d/.test(password);
    // const hasNonalphas = /\W/.test(password);
  }
  
  next();
};

/**
 * 手机号格式验证
 */
const validatePhoneNumber = (req, res, next) => {
  const { phoneNumber } = req.body;
  
  if (phoneNumber) {
    // 简单的国际手机号验证（可以根据需要调整）
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s+/g, ''))) {
      return res.status(400).json({
        success: false,
        message: '手机号格式无效'
      });
    }
  }
  
  next();
};

/**
 * Telegram Bot Token 验证
 */
const validateBotToken = (req, res, next) => {
  const { botToken, type } = req.body;
  
  if (type === 'telegram' && botToken) {
    // Telegram Bot Token 格式: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
    const tokenRegex = /^\d+:[A-Za-z0-9_-]{35}$/;
    if (!tokenRegex.test(botToken)) {
      return res.status(400).json({
        success: false,
        message: 'Telegram Bot Token 格式无效'
      });
    }
  }
  
  next();
};

/**
 * 文件上传验证
 */
const validateFileUpload = (allowedTypes = [], maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files ? Object.values(req.files).flat() : [req.file];
    
    for (const file of files) {
      // 检查文件类型
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `不支持的文件类型: ${file.mimetype}`
        });
      }
      
      // 检查文件大小
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `文件大小超过限制: ${Math.round(maxSize / 1024 / 1024)}MB`
        });
      }
    }
    
    next();
  };
};

/**
 * JSON 格式验证
 */
const validateJSON = (field) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value && typeof value === 'string') {
      try {
        req.body[field] = JSON.parse(value);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `${field} 必须是有效的 JSON 格式`
        });
      }
    }
    
    next();
  };
};

/**
 * 数组验证
 */
const validateArray = (field, minLength = 0, maxLength = 1000) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value !== undefined) {
      if (!Array.isArray(value)) {
        return res.status(400).json({
          success: false,
          message: `${field} 必须是数组`
        });
      }
      
      if (value.length < minLength) {
        return res.status(400).json({
          success: false,
          message: `${field} 至少需要 ${minLength} 个元素`
        });
      }
      
      if (value.length > maxLength) {
        return res.status(400).json({
          success: false,
          message: `${field} 最多只能有 ${maxLength} 个元素`
        });
      }
    }
    
    next();
  };
};

/**
 * 数字范围验证
 */
const validateNumberRange = (field, min = -Infinity, max = Infinity) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value !== undefined) {
      const num = Number(value);
      
      if (isNaN(num)) {
        return res.status(400).json({
          success: false,
          message: `${field} 必须是有效数字`
        });
      }
      
      if (num < min || num > max) {
        return res.status(400).json({
          success: false,
          message: `${field} 必须在 ${min} 到 ${max} 之间`
        });
      }
      
      req.body[field] = num;
    }
    
    next();
  };
};

/**
 * 字符串长度验证
 */
const validateStringLength = (field, minLength = 0, maxLength = 1000) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value !== undefined) {
      if (typeof value !== 'string') {
        return res.status(400).json({
          success: false,
          message: `${field} 必须是字符串`
        });
      }
      
      if (value.length < minLength) {
        return res.status(400).json({
          success: false,
          message: `${field} 长度至少为 ${minLength} 个字符`
        });
      }
      
      if (value.length > maxLength) {
        return res.status(400).json({
          success: false,
          message: `${field} 长度不能超过 ${maxLength} 个字符`
        });
      }
    }
    
    next();
  };
};

/**
 * 枚举值验证
 */
const validateEnum = (field, allowedValues) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value !== undefined && !allowedValues.includes(value)) {
      return res.status(400).json({
        success: false,
        message: `${field} 必须是以下值之一: ${allowedValues.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * URL 格式验证
 */
const validateURL = (field) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value) {
      try {
        new URL(value);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `${field} 必须是有效的 URL`
        });
      }
    }
    
    next();
  };
};

/**
 * Cron 表达式验证
 */
const validateCron = (field) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value) {
      // 简单的 cron 表达式验证（5或6个字段）
      const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
      
      if (!cronRegex.test(value)) {
        return res.status(400).json({
          success: false,
          message: `${field} 必须是有效的 Cron 表达式`
        });
      }
    }
    
    next();
  };
};

/**
 * 日期格式验证
 */
const validateDate = (field) => {
  return (req, res, next) => {
    const value = req.body[field];
    
    if (value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: `${field} 必须是有效的日期格式`
        });
      }
    }
    
    next();
  };
};

/**
 * 组合验证器
 */
const validateTaskConfig = [
  validateEnum('type', [
    'bulk_message',
    'group_create', 
    'group_invite',
    'group_kick',
    'contact_add',
    'auto_reply',
    'content_scrape',
    'data_export',
    'ai_content'
  ]),
  validateArray('accounts', 1, 10),
  validateJSON('targets'),
  validateNumberRange('priority', 1, 10)
];

const validateAccountCreation = [
  validateRequest(['name', 'type']),
  validateEnum('type', ['whatsapp', 'telegram']),
  validateStringLength('name', 1, 100),
  validatePhoneNumber,
  validateBotToken
];

const validateUserRegistration = [
  validateRequest(['username', 'email', 'password']),
  validateEmail,
  validatePassword,
  validateStringLength('username', 3, 30)
];

module.exports = {
  validateRequest,
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateBotToken,
  validateFileUpload,
  validateJSON,
  validateArray,
  validateNumberRange,
  validateStringLength,
  validateEnum,
  validateURL,
  validateCron,
  validateDate,
  
  // 组合验证器
  validateTaskConfig,
  validateAccountCreation,
  validateUserRegistration
};