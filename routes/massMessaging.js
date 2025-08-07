/**
 * 群发消息系统 API 路由
 */

const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// 验证模式
const createCampaignSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).default(''),
  messageType: Joi.string().valid('text', 'rich_media', 'image', 'video', 'document').required(),
  content: Joi.object().required(),
  targetAudience: Joi.object().required(),
  scheduledTime: Joi.date().optional(),
  platforms: Joi.array().items(Joi.string().valid('whatsapp', 'telegram', 'signal')).default(['whatsapp']),
  settings: Joi.object({
    sendRate: Joi.number().integer().min(1).max(100).default(10),
    randomDelay: Joi.object({
      min: Joi.number().integer().min(1).max(300).default(5),
      max: Joi.number().integer().min(1).max(300).default(30)
    }).default({ min: 5, max: 30 }),
    personalizeContent: Joi.boolean().default(false),
    trackLinks: Joi.boolean().default(true),
    enableRetry: Joi.boolean().default(true),
    maxRetries: Joi.number().integer().min(1).max(5).default(3)
  }).default({})
});

// 创建群发活动
router.post('/campaigns',
  authMiddleware,
  requirePermission('mass_messaging_create'),
  validateRequest(createCampaignSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const config = {
        ...req.body,
        userId: req.user.userId
      };

      // 创建群发活动
      const result = await services.massMessagingService.createMassMessagingCampaign(config);

      // 记录操作日志
      await services.businessLogger.info('创建群发活动', {
        campaignId: result.campaignId,
        name: config.name,
        messageType: config.messageType,
        targetCount: result.campaign.targetCount,
        platforms: config.platforms,
        userId: req.user.userId
      });

      res.status(201).json({
        success: true,
        message: '群发活动创建成功',
        data: {
          campaignId: result.campaignId,
          campaign: result.campaign,
          preview: result.preview
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('创建群发活动失败:', error);
      res.status(500).json({
        success: false,
        message: '创建群发活动失败',
        error: error.message
      });
    }
  }
);

// 获取活动列表
router.get('/campaigns',
  authMiddleware,
  requirePermission('mass_messaging_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { 
        page = 1, 
        limit = 20, 
        status, 
        messageType, 
        platform,
        startDate,
        endDate 
      } = req.query;

      // 构建查询条件
      const query = {
        userId: req.user.userId,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (status) query.status = status;
      if (messageType) query.messageType = messageType;
      if (platform) query.platform = platform;
      if (startDate && endDate) {
        query.dateRange = {
          start: new Date(startDate),
          end: new Date(endDate)
        };
      }

      const campaigns = await services.massMessagingService.getCampaigns(query);

      res.json({
        success: true,
        data: campaigns.list,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: campaigns.total,
          pages: Math.ceil(campaigns.total / parseInt(limit))
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取活动列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取活动列表失败',
        error: error.message
      });
    }
  }
);

// 获取活动详情
router.get('/campaigns/:campaignId',
  authMiddleware,
  requirePermission('mass_messaging_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { campaignId } = req.params;

      const campaign = await services.massMessagingService.getCampaignDetail(campaignId);

      if (!campaign) {
        return res.status(404).json({
          success: false,
          message: '活动不存在'
        });
      }

      // 检查权限
      if (campaign.userId !== req.user.userId && !req.user.permissions.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: '无权访问此活动'
        });
      }

      res.json({
        success: true,
        data: campaign
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取活动详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取活动详情失败',
        error: error.message
      });
    }
  }
);

// 启动群发活动
router.post('/campaigns/:campaignId/start',
  authMiddleware,
  requirePermission('mass_messaging_execute'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { campaignId } = req.params;

      // 验证活动权限
      const campaign = await services.massMessagingService.getCampaignDetail(campaignId);
      if (!campaign || (campaign.userId !== req.user.userId && !req.user.permissions.includes('admin'))) {
        return res.status(403).json({
          success: false,
          message: '无权操作此活动'
        });
      }

      // 启动活动
      const result = await services.massMessagingService.startMassMessagingCampaign(campaignId);

      // 记录操作日志
      await services.businessLogger.info('启动群发活动', {
        campaignId,
        campaignName: campaign.name,
        targetCount: campaign.stats.totalTargets,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '活动启动成功',
        data: result
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error(`启动活动失败: ${req.params.campaignId}`, error);
      res.status(500).json({
        success: false,
        message: '启动活动失败',
        error: error.message
      });
    }
  }
);

// 暂停群发活动
router.post('/campaigns/:campaignId/pause',
  authMiddleware,
  requirePermission('mass_messaging_execute'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { campaignId } = req.params;

      const result = await services.massMessagingService.pauseMassMessagingCampaign(campaignId);

      res.json({
        success: true,
        message: '活动已暂停',
        data: result
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error(`暂停活动失败: ${req.params.campaignId}`, error);
      res.status(500).json({
        success: false,
        message: '暂停活动失败',
        error: error.message
      });
    }
  }
);

// 停止群发活动
router.post('/campaigns/:campaignId/stop',
  authMiddleware,
  requirePermission('mass_messaging_execute'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { campaignId } = req.params;

      const result = await services.massMessagingService.stopMassMessagingCampaign(campaignId);

      res.json({
        success: true,
        message: '活动已停止',
        data: result
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error(`停止活动失败: ${req.params.campaignId}`, error);
      res.status(500).json({
        success: false,
        message: '停止活动失败',
        error: error.message
      });
    }
  }
);

// 获取活动分析数据
router.get('/campaigns/:campaignId/analytics',
  authMiddleware,
  requirePermission('mass_messaging_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { campaignId } = req.params;

      const analytics = services.massMessagingService.getCampaignAnalytics(campaignId);

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error(`获取活动分析失败: ${req.params.campaignId}`, error);
      res.status(500).json({
        success: false,
        message: '获取活动分析失败',
        error: error.message
      });
    }
  }
);

// 链接健康检查
router.post('/links/health-check',
  authMiddleware,
  requirePermission('mass_messaging_manage'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { campaignId, linkIds } = req.body;

      let result;
      if (linkIds && linkIds.length > 0) {
        // 检查指定链接
        result = await services.massMessagingService.performLinkHealthCheck(null, linkIds);
      } else if (campaignId) {
        // 检查特定活动的链接
        result = await services.massMessagingService.performLinkHealthCheck(campaignId);
      } else {
        // 检查所有链接
        result = await services.massMessagingService.performLinkHealthCheck();
      }

      // 记录操作日志
      await services.businessLogger.info('链接健康检查', {
        total: result.total,
        active: result.active,
        broken: result.broken,
        repaired: result.repaired,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '链接健康检查完成',
        data: result
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('链接健康检查失败:', error);
      res.status(500).json({
        success: false,
        message: '链接健康检查失败',
        error: error.message
      });
    }
  }
);

// 获取链接列表
router.get('/links',
  authMiddleware,
  requirePermission('mass_messaging_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { 
        page = 1, 
        limit = 50, 
        status, 
        domain,
        campaignId 
      } = req.query;

      const query = {
        userId: req.user.userId,
        page: parseInt(page),
        limit: parseInt(limit)
      };

      if (status) query.status = status;
      if (domain) query.domain = domain;
      if (campaignId) query.campaignId = campaignId;

      const links = await services.massMessagingService.getLinks(query);

      res.json({
        success: true,
        data: links.list,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: links.total,
          pages: Math.ceil(links.total / parseInt(limit))
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取链接列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取链接列表失败',
        error: error.message
      });
    }
  }
);

// 修复特定链接
router.post('/links/:linkId/repair',
  authMiddleware,
  requirePermission('mass_messaging_manage'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { linkId } = req.params;
      const { newUrl } = req.body;

      const result = await services.massMessagingService.repairLink(linkId, newUrl);

      res.json({
        success: true,
        message: result.success ? '链接修复成功' : '链接修复失败',
        data: result
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error(`修复链接失败: ${req.params.linkId}`, error);
      res.status(500).json({
        success: false,
        message: '修复链接失败',
        error: error.message
      });
    }
  }
);

// 删除链接
router.delete('/links/:linkId',
  authMiddleware,
  requirePermission('mass_messaging_manage'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { linkId } = req.params;

      await services.massMessagingService.deleteLink(linkId);

      res.json({
        success: true,
        message: '链接已删除'
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error(`删除链接失败: ${req.params.linkId}`, error);
      res.status(500).json({
        success: false,
        message: '删除链接失败',
        error: error.message
      });
    }
  }
);

// 获取链接统计
router.get('/links/stats',
  authMiddleware,
  requirePermission('mass_messaging_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      
      const stats = await services.massMessagingService.getLinkStats(req.user.userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取链接统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取链接统计失败',
        error: error.message
      });
    }
  }
);

// 获取链接趋势数据
router.get('/links/trends',
  authMiddleware,
  requirePermission('mass_messaging_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { days = 7 } = req.query;
      
      const trends = await services.massMessagingService.getLinkTrends(req.user.userId, parseInt(days));

      res.json({
        success: true,
        data: trends
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取链接趋势失败:', error);
      res.status(500).json({
        success: false,
        message: '获取链接趋势失败',
        error: error.message
      });
    }
  }
);

// 获取群发统计
router.get('/stats',
  authMiddleware,
  requirePermission('mass_messaging_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      
      const stats = await services.massMessagingService.getMassMessagingStats(req.user.userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取群发统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取群发统计失败',
        error: error.message
      });
    }
  }
);

// 短链接重定向
router.get('/redirect/:shortCode',
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { shortCode } = req.params;

      // 获取原始链接
      const linkInfo = await services.massMessagingService.resolveShortLink(shortCode);

      if (!linkInfo) {
        return res.status(404).send('链接不存在或已过期');
      }

      // 记录点击
      await services.massMessagingService.recordLinkClick(linkInfo.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer')
      });

      // 重定向到原始链接
      res.redirect(linkInfo.originalUrl);

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error(`短链接重定向失败: ${req.params.shortCode}`, error);
      res.status(500).send('服务器错误');
    }
  }
);

module.exports = router;