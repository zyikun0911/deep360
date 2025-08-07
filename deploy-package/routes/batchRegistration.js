/**
 * 批量注册系统 API 路由
 */

const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// 验证模式
const batchRegistrationSchema = Joi.object({
  platform: Joi.string().valid('whatsapp', 'telegram', 'signal').required(),
  accountCount: Joi.number().integer().min(1).max(100).required(),
  registrationStrategy: Joi.string().valid(
    'phone_auto',
    'email_auto', 
    'api_direct',
    'hybrid_smart'
  ).default('hybrid_smart'),
  targetRegions: Joi.array().items(Joi.string()).default(['global']),
  concurrency: Joi.number().integer().min(1).max(10).default(5),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  customSettings: Joi.object().default({})
});

const multiLoginSchema = Joi.object({
  accountId: Joi.string().required(),
  platform: Joi.string().valid('whatsapp', 'telegram', 'signal').required(),
  method: Joi.string().valid(
    'six_digit_code',
    'sms_code',
    'qr_code',
    'biometric',
    'email_verification',
    'api_key'
  ).required(),
  options: Joi.object({
    deviceInfo: Joi.object().default({}),
    location: Joi.object().default({}),
    preferences: Joi.object().default({})
  }).default({})
});

// 批量注册任务
router.post('/batch',
  authMiddleware,
  requirePermission('registration_create'),
  validateRequest(batchRegistrationSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const config = req.body;

      // 检查账号配额
      const userQuota = await services.accountManager.getUserQuota(req.user.userId);
      if (userQuota.used + config.accountCount > userQuota.limit) {
        return res.status(403).json({
          success: false,
          message: '超出账号配额限制',
          data: {
            requested: config.accountCount,
            available: userQuota.limit - userQuota.used,
            limit: userQuota.limit
          }
        });
      }

      // 创建批量注册任务
      const result = await services.batchRegistrationService.createBatchRegistrationTask(config);

      // 记录操作日志
      await services.businessLogger.info('批量注册任务创建', {
        taskId: result.taskId,
        platform: config.platform,
        accountCount: config.accountCount,
        strategy: config.registrationStrategy,
        userId: req.user.userId
      });

      res.status(201).json({
        success: true,
        message: '批量注册任务创建成功',
        data: {
          taskId: result.taskId,
          platform: config.platform,
          accountCount: config.accountCount,
          strategy: config.registrationStrategy,
          estimatedCompletion: result.estimatedCompletion,
          status: 'pending',
          progress: {
            total: config.accountCount,
            completed: 0,
            successful: 0,
            failed: 0
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('创建批量注册任务失败:', error);
      res.status(500).json({
        success: false,
        message: '创建批量注册任务失败',
        error: error.message
      });
    }
  }
);

// 获取注册任务状态
router.get('/batch/:taskId/status',
  authMiddleware,
  requirePermission('registration_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { taskId } = req.params;

      const task = await services.batchRegistrationService.getTaskStatus(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          message: '注册任务不存在'
        });
      }

      res.json({
        success: true,
        data: {
          taskId: task.id,
          platform: task.platform,
          status: task.status,
          progress: task.progress,
          accounts: task.accounts,
          startedAt: task.startedAt,
          estimatedDuration: task.estimatedDuration,
          actualDuration: task.actualDuration
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取注册任务状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取注册任务状态失败',
        error: error.message
      });
    }
  }
);

// 多种登录方式
router.post('/login',
  authMiddleware,
  requirePermission('account_login'),
  validateRequest(multiLoginSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId, platform, method, options } = req.body;

      // 发起登录请求
      const loginResult = await services.multiLoginService.initiateLogin(
        accountId,
        platform, 
        method,
        options
      );

      res.json({
        success: true,
        message: '登录流程启动成功',
        data: {
          sessionId: loginResult.sessionId,
          method: loginResult.method,
          platform: loginResult.platform,
          status: loginResult.status,
          timeout: loginResult.timeout,
          nextStep: loginResult.nextStep,
          instructions: this.getLoginInstructions(method)
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('启动登录失败:', error);
      res.status(500).json({
        success: false,
        message: '启动登录失败',
        error: error.message
      });
    }
  }
);

// 验证登录码
router.post('/login/:sessionId/verify',
  authMiddleware,
  requirePermission('account_login'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { sessionId } = req.params;
      const { code, codeType = 'six_digit' } = req.body;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: '请提供验证码'
        });
      }

      // 验证登录码
      const verifyResult = await services.multiLoginService.verifyLoginCode(
        sessionId,
        code,
        codeType
      );

      // 记录成功登录
      await services.businessLogger.info('账号登录成功', {
        sessionId,
        accountId: verifyResult.accountInfo?.id,
        method: codeType,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '登录验证成功',
        data: {
          sessionId: verifyResult.sessionId,
          authToken: verifyResult.authToken,
          accountInfo: verifyResult.accountInfo,
          permissions: verifyResult.permissions
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('验证登录码失败:', error);
      res.status(500).json({
        success: false,
        message: '验证登录码失败',
        error: error.message
      });
    }
  }
);

// 二维码扫描处理
router.post('/login/qr/:qrToken/scan',
  authMiddleware,
  requirePermission('account_login'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { qrToken } = req.params;
      const { scanData } = req.body;

      if (!scanData) {
        return res.status(400).json({
          success: false,
          message: '请提供扫描数据'
        });
      }

      // 处理二维码扫描
      const scanResult = await services.multiLoginService.handleQRCodeScan(
        qrToken,
        scanData
      );

      res.json({
        success: true,
        message: '二维码扫描登录成功',
        data: {
          sessionId: scanResult.sessionId,
          authToken: scanResult.authToken,
          accountInfo: scanResult.accountInfo
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('二维码扫描失败:', error);
      res.status(500).json({
        success: false,
        message: '二维码扫描失败',
        error: error.message
      });
    }
  }
);

// 生物识别验证
router.post('/login/:sessionId/biometric',
  authMiddleware,
  requirePermission('account_login'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { sessionId } = req.params;
      const { biometricData } = req.body;

      if (!biometricData) {
        return res.status(400).json({
          success: false,
          message: '请提供生物识别数据'
        });
      }

      // 处理生物识别数据
      const biometricResult = await services.multiLoginService.handleBiometricData(
        sessionId,
        biometricData
      );

      res.json({
        success: true,
        message: '生物识别登录成功',
        data: {
          sessionId: biometricResult.sessionId,
          authToken: biometricResult.authToken,
          accountInfo: biometricResult.accountInfo,
          biometricConfidence: biometricResult.biometricConfidence
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('生物识别验证失败:', error);
      res.status(500).json({
        success: false,
        message: '生物识别验证失败',
        error: error.message
      });
    }
  }
);

// 获取登录会话状态
router.get('/login/:sessionId/status',
  authMiddleware,
  requirePermission('account_login'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { sessionId } = req.params;

      const status = services.multiLoginService.getLoginSessionStatus(sessionId);

      if (!status.exists) {
        return res.status(404).json({
          success: false,
          message: '登录会话不存在'
        });
      }

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取登录会话状态失败:', error);
      res.status(500).json({
        success: false,
        message: '获取登录会话状态失败',
        error: error.message
      });
    }
  }
);

// 获取注册统计
router.get('/stats',
  authMiddleware,
  requirePermission('registration_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;

      // 获取批量注册统计
      const registrationStats = services.batchRegistrationService.getBatchRegistrationStats();

      // 获取多登录统计
      const loginStats = services.multiLoginService.getMultiLoginStats();

      res.json({
        success: true,
        data: {
          registration: registrationStats,
          login: loginStats,
          summary: {
            totalRegistrations: registrationStats.performance.totalRegistrations,
            registrationSuccessRate: registrationStats.performance.successRate,
            averageRegistrationTime: registrationStats.performance.averageDuration,
            activeLoginSessions: loginStats.activeSessions,
            supportedLoginMethods: Object.keys(loginStats.methods).length
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取注册统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取注册统计失败',
        error: error.message
      });
    }
  }
);

// 工具函数
function getLoginInstructions(method) {
  const instructions = {
    'six_digit_code': '请等待六位数字验证码生成，然后在客户端输入',
    'sms_code': 'SMS验证码将发送到您的手机，请查收并输入',
    'qr_code': '请使用客户端扫描二维码完成登录',
    'biometric': '请提供指纹、面部或语音等生物识别数据',
    'email_verification': '验证邮件已发送，请点击邮件中的链接',
    'api_key': 'API密钥验证中，请等待...'
  };

  return instructions[method] || '请按照提示完成登录验证';
}

module.exports = router;