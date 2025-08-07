/**
 * 群组管理系统 API 路由
 */

const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// 验证模式
const batchCreateGroupsSchema = Joi.object({
  platform: Joi.string().valid('whatsapp', 'telegram', 'signal').required(),
  groupConfigs: Joi.array().items(Joi.object({
    groupName: Joi.string().min(1).max(100).required(),
    description: Joi.string().max(500).default(''),
    initialMembers: Joi.array().items(Joi.string()).default([]),
    settings: Joi.object().default({}),
    avatar: Joi.string().optional()
  })).min(1).max(20).required(),
  accountId: Joi.string().required(),
  concurrency: Joi.number().integer().min(1).max(5).default(3),
  delayBetween: Joi.number().integer().min(10000).max(300000).default(30000),
  options: Joi.object().default({})
});

const batchAddMembersSchema = Joi.object({
  platform: Joi.string().valid('whatsapp', 'telegram', 'signal').required(),
  groupId: Joi.string().required(),
  memberLists: Joi.array().items(
    Joi.array().items(Joi.string()).min(1).max(50)
  ).min(1).required(),
  accountId: Joi.string().required(),
  batchSize: Joi.number().integer().min(1).max(20).default(5),
  delayBetween: Joi.number().integer().min(30000).max(600000).default(60000),
  options: Joi.object().default({})
});

const batchRemoveMembersSchema = Joi.object({
  platform: Joi.string().valid('whatsapp', 'telegram', 'signal').required(),
  groupId: Joi.string().required(),
  memberIds: Joi.array().items(Joi.string()).min(1).max(100).required(),
  accountId: Joi.string().required(),
  reason: Joi.string().default('admin_action'),
  batchSize: Joi.number().integer().min(1).max(20).default(10),
  delayBetween: Joi.number().integer().min(10000).max(300000).default(30000),
  options: Joi.object().default({})
});

const generateInviteLinkSchema = Joi.object({
  platform: Joi.string().valid('whatsapp', 'telegram').required(),
  groupId: Joi.string().required(),
  accountId: Joi.string().required(),
  config: Joi.object({
    expirationTime: Joi.date().optional(),
    memberLimit: Joi.number().integer().min(1).max(1000).optional(),
    name: Joi.string().max(50).optional(),
    usageLimit: Joi.number().integer().min(1).max(10000).optional()
  }).default({})
});

const managePermissionsSchema = Joi.object({
  platform: Joi.string().valid('whatsapp', 'telegram', 'signal').required(),
  groupId: Joi.string().required(),
  accountId: Joi.string().required(),
  permissionUpdates: Joi.array().items(Joi.object({
    memberId: Joi.string().required(),
    newRole: Joi.string().valid('owner', 'admin', 'member', 'restricted').required(),
    permissions: Joi.object().optional()
  })).min(1).max(50).required()
});

// 批量创建群组
router.post('/batch/create',
  authMiddleware,
  requirePermission('group_create'),
  validateRequest(batchCreateGroupsSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const config = req.body;

      // 检查账号权限
      await services.accountManager.validateAccountExists(config.accountId);
      await services.accountManager.validateAccountPlatform(config.accountId, config.platform);

      // 执行批量创建
      const result = await services.groupManagementService.batchCreateGroups(config);

      // 记录操作日志
      await services.businessLogger.info('批量创建群组', {
        operationId: result.operationId,
        platform: config.platform,
        groupCount: config.groupConfigs.length,
        successful: result.summary.successful,
        failed: result.summary.failed,
        userId: req.user.userId
      });

      res.status(201).json({
        success: true,
        message: '批量创建群组完成',
        data: {
          operationId: result.operationId,
          platform: config.platform,
          summary: result.summary,
          results: result.results,
          performance: {
            totalGroups: config.groupConfigs.length,
            successRate: result.summary.successful / config.groupConfigs.length,
            failureRate: result.summary.failed / config.groupConfigs.length
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('批量创建群组失败:', error);
      res.status(500).json({
        success: false,
        message: '批量创建群组失败',
        error: error.message
      });
    }
  }
);

// 批量拉群 (添加成员)
router.post('/batch/add-members',
  authMiddleware,
  requirePermission('group_manage'),
  validateRequest(batchAddMembersSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const config = req.body;

      // 验证群组权限
      await services.groupManagementService.validateGroupPermissions(
        config.accountId,
        config.groupId,
        config.platform,
        'add_members'
      );

      // 执行批量拉群
      const result = await services.groupManagementService.batchAddMembers(config);

      // 记录操作日志
      await services.businessLogger.info('批量拉群操作', {
        operationId: result.operationId,
        platform: config.platform,
        groupId: config.groupId,
        totalMembers: result.summary.totalMembers,
        successful: result.summary.successful,
        failed: result.summary.failed,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '批量拉群完成',
        data: {
          operationId: result.operationId,
          platform: config.platform,
          groupId: config.groupId,
          summary: result.summary,
          results: result.results,
          performance: {
            successRate: result.summary.successful / result.summary.totalMembers,
            efficiency: result.summary.processed / result.summary.totalMembers
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('批量拉群失败:', error);
      res.status(500).json({
        success: false,
        message: '批量拉群失败',
        error: error.message
      });
    }
  }
);

// 批量踢人 (移除成员)
router.post('/batch/remove-members',
  authMiddleware,
  requirePermission('group_manage'),
  validateRequest(batchRemoveMembersSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const config = req.body;

      // 验证群组权限
      await services.groupManagementService.validateGroupPermissions(
        config.accountId,
        config.groupId,
        config.platform,
        'remove_members'
      );

      // 执行批量踢人
      const result = await services.groupManagementService.batchRemoveMembers(config);

      // 记录操作日志
      await services.businessLogger.info('批量踢人操作', {
        operationId: result.operationId,
        platform: config.platform,
        groupId: config.groupId,
        totalMembers: config.memberIds.length,
        successful: result.successful,
        failed: result.failed,
        reason: config.reason,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '批量踢人完成',
        data: {
          operationId: result.operationId,
          platform: config.platform,
          groupId: config.groupId,
          totalMembers: config.memberIds.length,
          successful: result.successful,
          failed: result.failed,
          results: result.results,
          performance: {
            successRate: result.successful / config.memberIds.length
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('批量踢人失败:', error);
      res.status(500).json({
        success: false,
        message: '批量踢人失败',
        error: error.message
      });
    }
  }
);

// 生成邀请链接
router.post('/invite-link/generate',
  authMiddleware,
  requirePermission('group_manage'),
  validateRequest(generateInviteLinkSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { platform, groupId, accountId, config } = req.body;

      // 生成邀请链接
      const result = await services.groupManagementService.generateInviteLink(
        platform,
        groupId,
        accountId,
        config
      );

      // 记录操作日志
      await services.businessLogger.info('生成邀请链接', {
        linkId: result.linkId,
        platform,
        groupId,
        expirationTime: config.expirationTime,
        memberLimit: config.memberLimit,
        userId: req.user.userId
      });

      res.status(201).json({
        success: true,
        message: '邀请链接生成成功',
        data: {
          linkId: result.linkId,
          inviteLink: result.link,
          platform,
          groupId,
          settings: {
            expirationTime: config.expirationTime,
            memberLimit: config.memberLimit,
            name: config.name,
            usageLimit: config.usageLimit
          },
          qrCode: result.qrCode, // 如果支持二维码
          shortUrl: result.shortUrl // 如果支持短链接
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('生成邀请链接失败:', error);
      res.status(500).json({
        success: false,
        message: '生成邀请链接失败',
        error: error.message
      });
    }
  }
);

// 管理群组权限
router.post('/permissions/manage',
  authMiddleware,
  requirePermission('group_admin'),
  validateRequest(managePermissionsSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { platform, groupId, accountId, permissionUpdates } = req.body;

      // 管理群组权限
      const results = await services.groupManagementService.manageGroupPermissions(
        platform,
        groupId,
        accountId,
        permissionUpdates
      );

      // 统计结果
      const successful = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;

      // 记录操作日志
      await services.businessLogger.info('群组权限管理', {
        platform,
        groupId,
        updates: permissionUpdates.length,
        successful,
        failed,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '群组权限管理完成',
        data: {
          platform,
          groupId,
          totalUpdates: permissionUpdates.length,
          successful,
          failed,
          results,
          summary: {
            successRate: successful / permissionUpdates.length,
            failureRate: failed / permissionUpdates.length
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('群组权限管理失败:', error);
      res.status(500).json({
        success: false,
        message: '群组权限管理失败',
        error: error.message
      });
    }
  }
);

// 获取群组信息
router.get('/:groupId/info',
  authMiddleware,
  requirePermission('group_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { groupId } = req.params;
      const { platform } = req.query;

      if (!platform) {
        return res.status(400).json({
          success: false,
          message: '请指定平台参数'
        });
      }

      // 获取群组信息
      const groupInfo = await services.groupManagementService.getGroupInfo(groupId, platform);

      if (!groupInfo) {
        return res.status(404).json({
          success: false,
          message: '群组不存在'
        });
      }

      res.json({
        success: true,
        data: {
          groupId: groupInfo.id,
          platform: groupInfo.platform,
          name: groupInfo.name,
          description: groupInfo.description,
          memberCount: groupInfo.members?.length || 0,
          settings: groupInfo.settings,
          permissions: groupInfo.permissions,
          createdAt: groupInfo.createdAt,
          lastActivity: groupInfo.lastActivity
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取群组信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取群组信息失败',
        error: error.message
      });
    }
  }
);

// 获取群组成员列表
router.get('/:groupId/members',
  authMiddleware,
  requirePermission('group_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { groupId } = req.params;
      const { platform, page = 1, limit = 50 } = req.query;

      if (!platform) {
        return res.status(400).json({
          success: false,
          message: '请指定平台参数'
        });
      }

      // 获取群组成员
      const members = await services.groupManagementService.getGroupMembers(
        groupId,
        platform,
        {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      );

      res.json({
        success: true,
        data: {
          groupId,
          platform,
          members: members.list,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: members.total,
            pages: Math.ceil(members.total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取群组成员失败:', error);
      res.status(500).json({
        success: false,
        message: '获取群组成员失败',
        error: error.message
      });
    }
  }
);

// 获取邀请链接列表
router.get('/:groupId/invite-links',
  authMiddleware,
  requirePermission('group_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { groupId } = req.params;
      const { platform } = req.query;

      if (!platform) {
        return res.status(400).json({
          success: false,
          message: '请指定平台参数'
        });
      }

      // 获取邀请链接
      const inviteLinks = await services.groupManagementService.getGroupInviteLinks(
        groupId,
        platform
      );

      res.json({
        success: true,
        data: {
          groupId,
          platform,
          inviteLinks: inviteLinks.map(link => ({
            linkId: link.id,
            name: link.name,
            link: link.link,
            expirationTime: link.expirationTime,
            memberLimit: link.memberLimit,
            usageCount: link.usageCount,
            usageLimit: link.usageLimit,
            active: link.active,
            createdAt: link.createdAt
          }))
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取邀请链接失败:', error);
      res.status(500).json({
        success: false,
        message: '获取邀请链接失败',
        error: error.message
      });
    }
  }
);

// 撤销邀请链接
router.delete('/invite-link/:linkId',
  authMiddleware,
  requirePermission('group_manage'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { linkId } = req.params;

      // 撤销邀请链接
      const result = await services.groupManagementService.revokeInviteLink(linkId);

      // 记录操作日志
      await services.businessLogger.info('撤销邀请链接', {
        linkId,
        groupId: result.groupId,
        platform: result.platform,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '邀请链接已撤销',
        data: {
          linkId,
          revokedAt: new Date()
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('撤销邀请链接失败:', error);
      res.status(500).json({
        success: false,
        message: '撤销邀请链接失败',
        error: error.message
      });
    }
  }
);

// 获取群组管理统计
router.get('/stats/overview',
  authMiddleware,
  requirePermission('group_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;

      // 获取群组管理统计
      const stats = services.groupManagementService.getGroupManagementStats();

      res.json({
        success: true,
        data: {
          overview: {
            totalGroups: stats.totalGroups,
            activeOperations: stats.activeOperations,
            inviteLinks: stats.inviteLinks
          },
          operations: stats.operations,
          platforms: stats.platforms,
          performance: stats.performance,
          trends: {
            daily: await services.groupManagementService.getDailyTrends(),
            weekly: await services.groupManagementService.getWeeklyTrends()
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取群组管理统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取群组管理统计失败',
        error: error.message
      });
    }
  }
);

module.exports = router;