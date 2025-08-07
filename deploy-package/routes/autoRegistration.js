const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const AutoRegistrationService = require('../services/autoRegistrationService');

const router = express.Router();

// 批量注册 WhatsApp 账号
router.post('/whatsapp/batch', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const {
      count = 1,
      provider = 'fivesim',
      country = 'china',
      proxy = null,
      accountPrefix = 'WA',
      autoStart = true
    } = req.body;

    // 验证参数
    if (count < 1 || count > 20) {
      return res.status(400).json({
        success: false,
        message: '注册数量必须在 1-20 之间'
      });
    }

    const autoRegService = new AutoRegistrationService(
      services.accountManager,
      services.socketService,
      services.logger
    );

    const result = await autoRegService.batchRegisterWhatsApp(req.user.userId, {
      count,
      provider,
      country,
      proxy,
      accountPrefix,
      autoStart
    });

    res.json({
      success: true,
      message: '批量注册已启动',
      data: result
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('WhatsApp 批量注册失败:', error);
    res.status(500).json({
      success: false,
      message: 'WhatsApp 批量注册失败',
      error: error.message
    });
  }
});

// 批量注册 Telegram 账号
router.post('/telegram/batch', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const {
      count = 1,
      provider = 'fivesim',
      country = 'china',
      proxy = null,
      accountPrefix = 'TG'
    } = req.body;

    // 验证参数
    if (count < 1 || count > 20) {
      return res.status(400).json({
        success: false,
        message: '注册数量必须在 1-20 之间'
      });
    }

    const autoRegService = new AutoRegistrationService(
      services.accountManager,
      services.socketService,
      services.logger
    );

    const result = await autoRegService.batchRegisterTelegram(req.user.userId, {
      count,
      provider,
      country,
      proxy,
      accountPrefix
    });

    res.json({
      success: true,
      message: 'Telegram 批量注册已启动',
      data: result
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('Telegram 批量注册失败:', error);
    res.status(500).json({
      success: false,
      message: 'Telegram 批量注册失败',
      error: error.message
    });
  }
});

// 单个账号注册 WhatsApp
router.post('/whatsapp/single', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const {
      provider = 'fivesim',
      country = 'china',
      proxy = null,
      accountName
    } = req.body;

    const autoRegService = new AutoRegistrationService(
      services.accountManager,
      services.socketService,
      services.logger
    );

    const result = await autoRegService.registerSingleWhatsApp(req.user.userId, {
      index: 1,
      provider,
      country,
      proxy,
      accountPrefix: accountName || 'WA',
      registrationId: Date.now().toString()
    });

    res.json({
      success: true,
      message: 'WhatsApp 账号注册成功',
      data: result
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('WhatsApp 单个注册失败:', error);
    res.status(500).json({
      success: false,
      message: 'WhatsApp 账号注册失败',
      error: error.message
    });
  }
});

// 单个账号注册 Telegram
router.post('/telegram/single', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const {
      provider = 'fivesim',
      country = 'china',
      proxy = null,
      accountName
    } = req.body;

    const autoRegService = new AutoRegistrationService(
      services.accountManager,
      services.socketService,
      services.logger
    );

    const result = await autoRegService.registerSingleTelegram(req.user.userId, {
      index: 1,
      provider,
      country,
      proxy,
      accountPrefix: accountName || 'TG',
      registrationId: Date.now().toString()
    });

    res.json({
      success: true,
      message: 'Telegram 账号注册成功',
      data: result
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('Telegram 单个注册失败:', error);
    res.status(500).json({
      success: false,
      message: 'Telegram 账号注册失败',
      error: error.message
    });
  }
});

// 启动账号养号
router.post('/nurturing/start', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const {
      accountIds,
      duration = 7,
      activityLevel = 'medium',
      interactions = {
        viewStories: true,
        likeMessages: true,
        joinGroups: false,
        sendMessages: false
      }
    } = req.body;

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要养号的账号ID列表'
      });
    }

    // 验证账号归属
    const Account = require('../models/Account');
    const accounts = await Account.find({
      accountId: { $in: accountIds },
      userId: req.user.userId
    });

    if (accounts.length !== accountIds.length) {
      return res.status(400).json({
        success: false,
        message: '包含无效的账号ID'
      });
    }

    const autoRegService = new AutoRegistrationService(
      services.accountManager,
      services.socketService,
      services.logger
    );

    // 异步启动养号
    autoRegService.startAccountNurturing(accountIds, {
      duration,
      activityLevel,
      interactions
    }).catch(error => {
      services.logger.error('账号养号失败:', error);
    });

    res.json({
      success: true,
      message: '账号养号已启动',
      data: {
        accountIds,
        duration,
        activityLevel,
        interactions,
        startedAt: new Date()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('启动账号养号失败:', error);
    res.status(500).json({
      success: false,
      message: '启动账号养号失败',
      error: error.message
    });
  }
});

// 获取注册模板
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const templates = {
      whatsapp: {
        basic: {
          name: 'WhatsApp 基础注册',
          description: '基础的 WhatsApp 账号注册模板',
          config: {
            provider: 'fivesim',
            country: 'china',
            proxy: null,
            accountPrefix: 'WA',
            autoStart: true
          }
        },
        business: {
          name: 'WhatsApp 商业账号',
          description: '适用于商业用途的 WhatsApp 账号',
          config: {
            provider: 'twilio',
            country: 'usa',
            proxy: null,
            accountPrefix: 'WA_BIZ',
            autoStart: true,
            businessProfile: true
          }
        }
      },
      telegram: {
        basic: {
          name: 'Telegram 基础注册',
          description: '基础的 Telegram 账号注册模板',
          config: {
            provider: 'fivesim',
            country: 'china',
            proxy: null,
            accountPrefix: 'TG'
          }
        },
        premium: {
          name: 'Telegram 高级账号',
          description: '高级 Telegram 账号，支持更多功能',
          config: {
            provider: 'smsactivate',
            country: 'russia',
            proxy: 'socks5://proxy.example.com:1080',
            accountPrefix: 'TG_PRO'
          }
        }
      }
    };

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取注册模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取注册模板失败',
      error: error.message
    });
  }
});

// 获取注册状态
router.get('/status/:registrationId', authMiddleware, async (req, res) => {
  try {
    const { registrationId } = req.params;

    // 这里应该从数据库或缓存中获取注册状态
    // 简化实现，返回模拟数据
    const status = {
      registrationId,
      status: 'running',
      progress: {
        total: 5,
        completed: 3,
        failed: 1,
        remaining: 1
      },
      startedAt: new Date(Date.now() - 5 * 60 * 1000),
      estimatedCompletion: new Date(Date.now() + 2 * 60 * 1000)
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取注册状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取注册状态失败',
      error: error.message
    });
  }
});

// 取消注册任务
router.post('/cancel/:registrationId', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { registrationId } = req.params;

    // 这里应该实现取消注册任务的逻辑
    // 简化实现
    res.json({
      success: true,
      message: '注册任务已取消',
      data: {
        registrationId,
        cancelledAt: new Date()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('取消注册任务失败:', error);
    res.status(500).json({
      success: false,
      message: '取消注册任务失败',
      error: error.message
    });
  }
});

// 获取注册历史
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // 这里应该从数据库获取注册历史
    // 简化实现，返回模拟数据
    const history = [
      {
        registrationId: 'reg_001',
        platform: 'whatsapp',
        count: 5,
        success: 4,
        failed: 1,
        provider: 'fivesim',
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        registrationId: 'reg_002',
        platform: 'telegram',
        count: 3,
        success: 3,
        failed: 0,
        provider: 'smsactivate',
        startedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 11.8 * 60 * 60 * 1000),
        status: 'completed'
      }
    ];

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: history.length,
          totalPages: Math.ceil(history.length / limit)
        }
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取注册历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取注册历史失败',
      error: error.message
    });
  }
});

// 获取注册统计
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // 这里应该从数据库统计真实数据
    // 简化实现，返回模拟数据
    const statistics = {
      period,
      totalRegistrations: 25,
      successfulRegistrations: 22,
      failedRegistrations: 3,
      successRate: 88,
      platforms: {
        whatsapp: 15,
        telegram: 10
      },
      providers: {
        fivesim: 12,
        smsactivate: 8,
        twilio: 3,
        smshub: 2
      },
      countries: {
        china: 18,
        russia: 4,
        usa: 3
      },
      dailyStats: [
        { date: '2024-01-01', registrations: 3, success: 3 },
        { date: '2024-01-02', registrations: 5, success: 4 },
        { date: '2024-01-03', registrations: 2, success: 2 }
      ]
    };

    res.json({
      success: true,
      data: statistics
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
});

module.exports = router;