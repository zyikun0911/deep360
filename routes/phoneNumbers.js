const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const PhoneNumberService = require('../services/phoneNumberService');

const router = express.Router();

// 获取手机号
router.post('/get-number', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { provider = 'fivesim', country = 'china', service = 'whatsapp' } = req.body;

    const phoneService = new PhoneNumberService(services.logger);
    const phoneData = await phoneService.getPhoneNumber(provider, country, service);

    res.json({
      success: true,
      data: {
        phoneNumber: phoneData.phoneNumber,
        orderId: phoneData.orderId,
        provider: phoneData.provider,
        cost: phoneData.cost,
        expiresAt: new Date(Date.now() + 20 * 60 * 1000) // 20分钟过期
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取手机号失败:', error);
    res.status(500).json({
      success: false,
      message: '获取手机号失败',
      error: error.message
    });
  }
});

// 获取验证码
router.post('/get-code', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { phoneNumber, timeout = 300000 } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号'
      });
    }

    const phoneService = new PhoneNumberService(services.logger);
    const codeData = await phoneService.getVerificationCode(phoneNumber, timeout);

    res.json({
      success: true,
      data: {
        phoneNumber: codeData.phoneNumber,
        code: codeData.code,
        receivedAt: codeData.receivedAt
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取验证码失败:', error);
    res.status(500).json({
      success: false,
      message: '获取验证码失败',
      error: error.message
    });
  }
});

// 释放手机号
router.post('/release-number', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: '请提供手机号'
      });
    }

    const phoneService = new PhoneNumberService(services.logger);
    await phoneService.releasePhoneNumber(phoneNumber);

    res.json({
      success: true,
      message: '手机号已释放'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('释放手机号失败:', error);
    res.status(500).json({
      success: false,
      message: '释放手机号失败',
      error: error.message
    });
  }
});

// 批量获取手机号
router.post('/batch-get-numbers', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { count, provider = 'fivesim', country = 'china', service = 'whatsapp' } = req.body;

    if (!count || count < 1 || count > 50) {
      return res.status(400).json({
        success: false,
        message: '数量必须在 1-50 之间'
      });
    }

    const phoneService = new PhoneNumberService(services.logger);
    const result = await phoneService.getBatchPhoneNumbers(count, provider, country, service);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('批量获取手机号失败:', error);
    res.status(500).json({
      success: false,
      message: '批量获取手机号失败',
      error: error.message
    });
  }
});

// 获取支持的服务
router.get('/supported-services', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { provider = 'fivesim' } = req.query;

    const phoneService = new PhoneNumberService(services.logger);
    const supportedServices = await phoneService.getSupportedServices(provider);

    res.json({
      success: true,
      data: {
        provider,
        services: supportedServices
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取支持服务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取支持服务失败',
      error: error.message
    });
  }
});

// 获取价格信息
router.get('/pricing', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { provider = 'fivesim', country = 'china', service = 'whatsapp' } = req.query;

    const phoneService = new PhoneNumberService(services.logger);
    const pricing = await phoneService.getPricing(provider, country, service);

    res.json({
      success: true,
      data: {
        provider,
        country,
        service,
        pricing
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取价格信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取价格信息失败',
      error: error.message
    });
  }
});

// 获取账户余额
router.get('/balance', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { provider = 'fivesim' } = req.query;

    const phoneService = new PhoneNumberService(services.logger);
    const balance = await phoneService.getBalance(provider);

    res.json({
      success: true,
      data: {
        provider,
        balance: balance.balance,
        currency: balance.currency
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取余额失败:', error);
    res.status(500).json({
      success: false,
      message: '获取余额失败',
      error: error.message
    });
  }
});

// 获取所有服务商余额
router.get('/balance/all', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const providers = ['fivesim', 'smsactivate', 'twilio', 'smshub'];
    const balances = {};

    const phoneService = new PhoneNumberService(services.logger);

    for (const provider of providers) {
      try {
        const balance = await phoneService.getBalance(provider);
        balances[provider] = balance;
      } catch (error) {
        balances[provider] = {
          error: error.message,
          balance: 0,
          currency: 'N/A'
        };
      }
    }

    res.json({
      success: true,
      data: {
        balances,
        timestamp: new Date()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取所有余额失败:', error);
    res.status(500).json({
      success: false,
      message: '获取所有余额失败',
      error: error.message
    });
  }
});

// 清理过期号码
router.post('/cleanup-expired', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;

    const phoneService = new PhoneNumberService(services.logger);
    await phoneService.cleanupExpiredNumbers();

    res.json({
      success: true,
      message: '过期号码清理完成'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('清理过期号码失败:', error);
    res.status(500).json({
      success: false,
      message: '清理过期号码失败',
      error: error.message
    });
  }
});

// 获取活跃号码列表
router.get('/active-numbers', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;

    const phoneService = new PhoneNumberService(services.logger);
    const activeNumbers = Array.from(phoneService.activeNumbers.entries()).map(([phoneNumber, info]) => ({
      phoneNumber,
      provider: info.provider,
      orderId: info.orderId,
      country: info.country,
      service: info.service,
      status: info.status,
      createdAt: info.createdAt,
      expiresAt: info.expiresAt
    }));

    res.json({
      success: true,
      data: {
        activeNumbers,
        count: activeNumbers.length
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取活跃号码失败:', error);
    res.status(500).json({
      success: false,
      message: '获取活跃号码失败',
      error: error.message
    });
  }
});

// 测试服务商连接
router.post('/test-provider', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: '请提供服务商名称'
      });
    }

    const phoneService = new PhoneNumberService(services.logger);
    
    // 测试获取余额
    const balance = await phoneService.getBalance(provider);
    
    // 测试获取支持的服务
    const supportedServices = await phoneService.getSupportedServices(provider);

    res.json({
      success: true,
      data: {
        provider,
        status: 'connected',
        balance,
        supportedServices: Object.keys(supportedServices).length,
        testedAt: new Date()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error(`测试服务商连接失败: ${req.body.provider}`, error);
    res.status(500).json({
      success: false,
      message: '测试服务商连接失败',
      error: error.message,
      provider: req.body.provider
    });
  }
});

module.exports = router;