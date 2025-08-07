const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT 认证中间件
 */
const authMiddleware = async (req, res, next) => {
  try {
    // 从请求头获取 token
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，请提供认证令牌'
      });
    }

    // 提取 Bearer token
    const token = authHeader.startsWith('Bearer ') ? 
      authHeader.slice(7) : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，无效的令牌格式'
      });
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // 检查用户是否存在
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '认证失败，用户不存在'
      });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用，请联系管理员'
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      plan: user.plan
    };

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '认证失败，无效的令牌'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证失败，令牌已过期'
      });
    }

    res.status(500).json({
      success: false,
      message: '认证过程中发生错误'
    });
  }
};

/**
 * 权限检查中间件
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    // 管理员拥有所有权限
    if (req.user.role === 'admin') {
      return next();
    }

    // 检查用户权限
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
};

/**
 * 角色检查中间件
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '角色权限不足'
      });
    }

    next();
  };
};

/**
 * 套餐限制检查中间件
 */
const requirePlan = (plans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    const allowedPlans = Array.isArray(plans) ? plans : [plans];
    
    if (!allowedPlans.includes(req.user.plan)) {
      return res.status(403).json({
        success: false,
        message: '当前套餐不支持此功能，请升级套餐'
      });
    }

    next();
  };
};

/**
 * 可选认证中间件（不强制要求认证）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') ? 
      authHeader.slice(7) : authHeader;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (user && user.status === 'active') {
      req.user = {
        userId: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        plan: user.plan
      };
    }

    next();
  } catch (error) {
    // 可选认证失败不阻止请求继续
    next();
  }
};

/**
 * 管理员认证中间件
 */
const adminOnly = [authMiddleware, requireRole('admin')];

/**
 * 限流检查中间件（基于用户套餐）
 */
const rateLimitByPlan = () => {
  const limits = {
    free: 100,    // 每小时100次请求
    basic: 500,   // 每小时500次请求
    pro: 2000,    // 每小时2000次请求
    enterprise: 10000 // 每小时10000次请求
  };

  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userPlan = req.user.plan;
    const limit = limits[userPlan] || limits.free;
    
    // 这里可以实现基于 Redis 的限流逻辑
    // const key = `rate_limit:${req.user.userId}:${Date.now().toString().slice(0, -7)}`;
    // const current = await redis.incr(key);
    // await redis.expire(key, 3600);
    
    // if (current > limit) {
    //   return res.status(429).json({
    //     success: false,
    //     message: '请求频率超限，请稍后再试'
    //   });
    // }

    next();
  };
};

/**
 * IP 白名单中间件
 */
const ipWhitelist = (whitelist) => {
  return (req, res, next) => {
    const clientIP = req.ip || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     (req.connection.socket ? req.connection.socket.remoteAddress : null);

    if (whitelist.includes(clientIP)) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: 'IP 地址不在白名单中'
    });
  };
};

/**
 * API Key 认证中间件（用于 webhook 等）
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.header('X-API-Key') || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: '缺少 API Key'
      });
    }

    // 验证 API Key（这里需要实现 API Key 管理逻辑）
    // const user = await User.findOne({ 'apiKeys.key': apiKey, 'apiKeys.active': true });
    
    // if (!user) {
    //   return res.status(401).json({
    //     success: false,
    //     message: '无效的 API Key'
    //   });
    // }

    // req.user = user;
    next();
  } catch (error) {
    console.error('API Key 认证失败:', error);
    res.status(500).json({
      success: false,
      message: 'API Key 认证过程中发生错误'
    });
  }
};

module.exports = {
  authMiddleware,
  requirePermission,
  requireRole,
  requirePlan,
  optionalAuth,
  adminOnly,
  rateLimitByPlan,
  ipWhitelist,
  apiKeyAuth
};