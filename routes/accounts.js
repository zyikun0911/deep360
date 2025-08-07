const express = require('express');
const Account = require('../models/Account');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// 获取用户的所有账号
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const accounts = await services.accountManager.getUserAccounts(req.user.userId);

    res.json({
      success: true,
      data: {
        accounts,
        total: accounts.length
      }
    });

  } catch (error) {
    services.logger.error('获取账号列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账号列表失败',
      error: error.message
    });
  }
});

// 创建新账号
router.post('/', authMiddleware, validateRequest([
  'name',
  'type'
]), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { name, type, phoneNumber, botToken, config } = req.body;

    // 验证账号类型
    if (!['whatsapp', 'telegram'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '不支持的账号类型'
      });
    }

    // 验证必需参数
    if (type === 'whatsapp' && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'WhatsApp 账号需要提供手机号码'
      });
    }

    if (type === 'telegram' && !botToken) {
      return res.status(400).json({
        success: false,
        message: 'Telegram 账号需要提供 Bot Token'
      });
    }

    // 检查用户账号限制
    const user = await services.accountManager.getUser(req.user.userId);
    if (!user.checkLimit('accounts')) {
      return res.status(400).json({
        success: false,
        message: `账号数量已达上限 (${user.limits.maxAccounts})`
      });
    }

    // 创建账号
    const account = await services.accountManager.createAccount(req.user.userId, {
      name,
      type,
      phoneNumber,
      botToken,
      config: config || {}
    });

    res.status(201).json({
      success: true,
      message: '账号创建成功',
      data: {
        account: account.toJSON()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('创建账号失败:', error);
    res.status(500).json({
      success: false,
      message: '创建账号失败',
      error: error.message
    });
  }
});

// 获取特定账号详情
router.get('/:accountId', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    // 获取详细状态
    const status = await services.accountManager.getAccountStatus(accountId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取账号详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账号详情失败',
      error: error.message
    });
  }
});

// 启动账号
router.post('/:accountId/start', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    // 启动账号实例
    const instanceInfo = await services.accountManager.startAccount(accountId);

    res.json({
      success: true,
      message: '账号启动成功',
      data: {
        instance: instanceInfo
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('启动账号失败:', error);
    res.status(500).json({
      success: false,
      message: '启动账号失败',
      error: error.message
    });
  }
});

// 停止账号
router.post('/:accountId/stop', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    // 停止账号实例
    await services.accountManager.stopAccount(accountId);

    res.json({
      success: true,
      message: '账号已停止'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('停止账号失败:', error);
    res.status(500).json({
      success: false,
      message: '停止账号失败',
      error: error.message
    });
  }
});

// 重启账号
router.post('/:accountId/restart', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    // 重启账号实例
    const instanceInfo = await services.accountManager.restartAccount(accountId);

    res.json({
      success: true,
      message: '账号重启成功',
      data: {
        instance: instanceInfo
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('重启账号失败:', error);
    res.status(500).json({
      success: false,
      message: '重启账号失败',
      error: error.message
    });
  }
});

// 更新账号配置
router.put('/:accountId/config', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;
    const { config } = req.body;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    // 更新配置
    const updatedAccount = await services.accountManager.updateAccountConfig(accountId, config);

    res.json({
      success: true,
      message: '配置更新成功',
      data: {
        account: updatedAccount.toJSON()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('更新账号配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新账号配置失败',
      error: error.message
    });
  }
});

// 获取 QR 码（WhatsApp）
router.get('/:accountId/qrcode', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId,
      type: 'whatsapp'
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'WhatsApp 账号不存在'
      });
    }

    // 获取 QR 码
    const qrCode = services.whatsappService.getQRCode(accountId);

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: 'QR 码尚未生成或已过期'
      });
    }

    res.json({
      success: true,
      data: {
        qrCode,
        message: '请使用 WhatsApp 扫描二维码登录'
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取 QR 码失败:', error);
    res.status(500).json({
      success: false,
      message: '获取 QR 码失败',
      error: error.message
    });
  }
});

// 发送测试消息
router.post('/:accountId/test-message', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;
    const { target, message } = req.body;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    if (!target || !message) {
      return res.status(400).json({
        success: false,
        message: '请提供目标和消息内容'
      });
    }

    // 根据账号类型发送消息
    let result;
    if (account.type === 'whatsapp') {
      result = await services.whatsappService.sendMessage(accountId, target, message);
    } else if (account.type === 'telegram') {
      result = await services.telegramService.sendMessage(accountId, target, message);
    }

    res.json({
      success: true,
      message: '测试消息发送成功',
      data: {
        result
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('发送测试消息失败:', error);
    res.status(500).json({
      success: false,
      message: '发送测试消息失败',
      error: error.message
    });
  }
});

// 获取联系人列表（WhatsApp）
router.get('/:accountId/contacts', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId,
      type: 'whatsapp'
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'WhatsApp 账号不存在'
      });
    }

    // 获取联系人
    const contacts = await services.whatsappService.getContacts(accountId);

    res.json({
      success: true,
      data: {
        contacts,
        total: contacts.length
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取联系人列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取联系人列表失败',
      error: error.message
    });
  }
});

// 获取聊天记录
router.get('/:accountId/chats', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;
    const { limit = 50 } = req.query;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    // 根据账号类型获取聊天记录
    let chats;
    if (account.type === 'whatsapp') {
      chats = await services.whatsappService.getChats(accountId, parseInt(limit));
    } else if (account.type === 'telegram') {
      // Telegram 聊天记录获取逻辑
      chats = []; // TODO: 实现 Telegram 聊天记录获取
    }

    res.json({
      success: true,
      data: {
        chats,
        total: chats.length
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取聊天记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取聊天记录失败',
      error: error.message
    });
  }
});

// 获取账号统计
router.get('/:accountId/stats', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    // 获取详细统计
    const stats = {
      basic: account.stats,
      health: account.health,
      uptime: account.stats.uptime,
      lastActivity: account.stats.lastActivity,
      // 可以添加更多统计信息
      dailyStats: {}, // TODO: 实现每日统计
      weeklyStats: {} // TODO: 实现每周统计
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取账号统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账号统计失败',
      error: error.message
    });
  }
});

// 删除账号
router.delete('/:accountId', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 验证账号归属
    const account = await Account.findOne({
      accountId,
      userId: req.user.userId
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: '账号不存在'
      });
    }

    // 删除账号
    await services.accountManager.deleteAccount(accountId);

    res.json({
      success: true,
      message: '账号删除成功'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('删除账号失败:', error);
    res.status(500).json({
      success: false,
      message: '删除账号失败',
      error: error.message
    });
  }
});

module.exports = router;