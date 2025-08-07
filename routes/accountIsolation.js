/**
 * 账号隔离管理 API 路由
 */

const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// 验证模式
const createIsolationSchema = Joi.object({
  accountId: Joi.string().required(),
  platform: Joi.string().valid('whatsapp', 'telegram').required(),
  region: Joi.string().default('random'),
  deviceType: Joi.string().valid('mobile', 'desktop').default('mobile'),
  riskLevel: Joi.string().valid('low', 'medium', 'high').default('low'),
  options: Joi.object({
    forceNewProxy: Joi.boolean().default(false),
    customUserAgent: Joi.string(),
    customResolution: Joi.object({
      width: Joi.number().min(320).max(4096),
      height: Joi.number().min(240).max(2160)
    })
  }).default({})
});

const rotateIsolationSchema = Joi.object({
  keepProxy: Joi.boolean().default(false),
  keepDevice: Joi.boolean().default(false),
  newRegion: Joi.string(),
  reason: Joi.string()
});

// 创建账号隔离环境
router.post('/create', 
  authMiddleware, 
  requirePermission('account_manage'),
  validateRequest(createIsolationSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId, platform, region, deviceType, riskLevel, options } = req.body;

      // 检查账号是否已存在隔离环境
      const existingFingerprint = await services.accountIsolationService.getFingerprint(accountId);
      if (existingFingerprint) {
        return res.status(409).json({
          success: false,
          message: '账号隔离环境已存在',
          data: {
            accountId,
            existing: true,
            fingerprint: existingFingerprint
          }
        });
      }

      // 创建隔离环境
      const fingerprint = await services.accountIsolationService.createAccountFingerprint(accountId, {
        platform,
        region,
        deviceType,
        riskLevel,
        ...options
      });

      // 创建隔离容器
      const container = await services.containerManager.createAccountContainer(accountId, {
        fingerprint,
        proxy: fingerprint.proxy,
        platform
      });

      // 验证隔离状态
      const validation = await services.accountIsolationService.validateIsolation(accountId);

      res.status(201).json({
        success: true,
        message: '账号隔离环境创建成功',
        data: {
          accountId,
          fingerprint: {
            id: fingerprint.accountId,
            platform: fingerprint.platform,
            device: {
              type: fingerprint.device.type,
              platform: fingerprint.device.platform,
              userAgent: fingerprint.device.userAgent,
              resolution: fingerprint.device.screenResolution,
              timezone: fingerprint.device.timezone,
              language: fingerprint.device.language
            },
            proxy: {
              ip: fingerprint.proxy.ip,
              region: fingerprint.proxy.region,
              country: fingerprint.proxy.country,
              provider: fingerprint.proxy.providerId
            },
            container: {
              id: container.id.substring(0, 12),
              status: 'running'
            }
          },
          isolation: validation,
          nextSteps: [
            '账号环境已完全隔离',
            '可以开始使用专用IP和指纹',
            '建议定期轮换指纹保持安全'
          ]
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('创建账号隔离环境失败:', error);
      res.status(500).json({
        success: false,
        message: '创建账号隔离环境失败',
        error: error.message
      });
    }
  }
);

// 获取账号隔离状态
router.get('/:accountId/status', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;

    // 获取指纹信息
    const fingerprint = await services.accountIsolationService.getFingerprint(accountId);
    if (!fingerprint) {
      return res.status(404).json({
        success: false,
        message: '账号隔离环境不存在'
      });
    }

    // 验证隔离状态
    const validation = await services.accountIsolationService.validateIsolation(accountId);

    // 获取容器状态
    const containerStatus = await services.containerManager.getContainerStatus(accountId);

    // 获取代理状态
    const proxyStatus = await services.proxyManager.testProxyConnection(fingerprint.proxy, 5000);

    res.json({
      success: true,
      data: {
        accountId,
        isolated: validation.isolated,
        fingerprint: {
          created: fingerprint.createdAt,
          platform: fingerprint.platform,
          device: fingerprint.device,
          network: fingerprint.network,
          behavior: fingerprint.behavior
        },
        container: containerStatus,
        proxy: {
          ...fingerprint.proxy,
          healthy: proxyStatus,
          lastChecked: new Date()
        },
        validation: validation.validations,
        recommendations: this.generateRecommendations(validation, containerStatus, proxyStatus)
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取账号隔离状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账号隔离状态失败',
      error: error.message
    });
  }
});

// 轮换账号指纹
router.post('/:accountId/rotate', 
  authMiddleware, 
  requirePermission('account_manage'),
  validateRequest(rotateIsolationSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId } = req.params;
      const { keepProxy, keepDevice, newRegion, reason } = req.body;

      // 检查当前隔离环境
      const currentFingerprint = await services.accountIsolationService.getFingerprint(accountId);
      if (!currentFingerprint) {
        return res.status(404).json({
          success: false,
          message: '账号隔离环境不存在'
        });
      }

      // 执行指纹轮换
      const newFingerprint = await services.accountIsolationService.rotateFingerprint(accountId, {
        keepProxy,
        keepDevice,
        newRegion
      });

      // 记录轮换日志
      await services.businessLogger.info('账号指纹轮换', {
        accountId,
        oldProxy: currentFingerprint.proxy.ip,
        newProxy: newFingerprint.proxy.ip,
        keepProxy,
        keepDevice,
        reason,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '账号指纹轮换成功',
        data: {
          accountId,
          rotation: {
            timestamp: new Date(),
            reason,
            changes: {
              proxy: !keepProxy,
              device: !keepDevice,
              browser: true,
              network: !keepProxy
            }
          },
          before: {
            proxy: currentFingerprint.proxy.ip,
            userAgent: currentFingerprint.device.userAgent
          },
          after: {
            proxy: newFingerprint.proxy.ip,
            userAgent: newFingerprint.device.userAgent
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('轮换账号指纹失败:', error);
      res.status(500).json({
        success: false,
        message: '轮换账号指纹失败',
        error: error.message
      });
    }
  }
);

// 删除账号隔离环境
router.delete('/:accountId', 
  authMiddleware, 
  requirePermission('account_manage'), 
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId } = req.params;
      const { removeData = false } = req.query;

      // 检查隔离环境是否存在
      const fingerprint = await services.accountIsolationService.getFingerprint(accountId);
      if (!fingerprint) {
        return res.status(404).json({
          success: false,
          message: '账号隔离环境不存在'
        });
      }

      // 停止并删除容器
      await services.containerManager.removeAccountContainer(accountId, {
        removeVolume: removeData
      });

      // 释放代理
      await services.proxyManager.releaseProxy(fingerprint.proxy.id);

      // 删除指纹记录
      await services.accountIsolationService.removeFingerprint(accountId);

      // 记录删除日志
      await services.businessLogger.info('账号隔离环境删除', {
        accountId,
        proxy: fingerprint.proxy.ip,
        removeData,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '账号隔离环境删除成功',
        data: {
          accountId,
          deletedAt: new Date(),
          removedData: removeData,
          releasedProxy: fingerprint.proxy.ip
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('删除账号隔离环境失败:', error);
      res.status(500).json({
        success: false,
        message: '删除账号隔离环境失败',
        error: error.message
      });
    }
  }
);

// 批量管理隔离环境
router.post('/batch', 
  authMiddleware, 
  requirePermission('account_manage'), 
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { action, accountIds, options = {} } = req.body;

      if (!['create', 'rotate', 'delete', 'validate'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: '无效的批量操作类型'
        });
      }

      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的账号ID列表'
        });
      }

      const results = {
        total: accountIds.length,
        success: [],
        failed: [],
        details: []
      };

      // 批量处理
      for (const accountId of accountIds) {
        try {
          let result;
          
          switch (action) {
            case 'create':
              result = await services.accountIsolationService.createAccountFingerprint(accountId, options);
              await services.containerManager.createAccountContainer(accountId, {
                fingerprint: result,
                proxy: result.proxy,
                platform: options.platform || 'whatsapp'
              });
              break;
              
            case 'rotate':
              result = await services.accountIsolationService.rotateFingerprint(accountId, options);
              break;
              
            case 'delete':
              await services.containerManager.removeAccountContainer(accountId, options);
              await services.accountIsolationService.removeFingerprint(accountId);
              result = { deleted: true };
              break;
              
            case 'validate':
              result = await services.accountIsolationService.validateIsolation(accountId);
              break;
          }

          results.success.push(accountId);
          results.details.push({
            accountId,
            status: 'success',
            result
          });

        } catch (error) {
          results.failed.push(accountId);
          results.details.push({
            accountId,
            status: 'failed',
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: `批量${action}操作完成`,
        data: results
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('批量管理隔离环境失败:', error);
      res.status(500).json({
        success: false,
        message: '批量管理隔离环境失败',
        error: error.message
      });
    }
  }
);

// 获取隔离统计信息
router.get('/stats/overview', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;

    // 获取隔离统计
    const isolationStats = await services.accountIsolationService.getIsolationStats();

    // 获取代理统计
    const proxyStats = await services.proxyManager.getProxyStats();

    // 获取容器统计
    const containerStats = await services.containerManager.getContainerStats();

    res.json({
      success: true,
      data: {
        isolation: isolationStats,
        proxy: proxyStats,
        container: containerStats,
        summary: {
          totalIsolatedAccounts: isolationStats.isolatedAccounts,
          isolationRate: Math.round((isolationStats.isolatedAccounts / isolationStats.totalAccounts) * 100),
          proxyUtilization: Math.round((proxyStats.assigned / proxyStats.total) * 100),
          containerHealth: Math.round((containerStats.running / containerStats.total) * 100)
        }
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取隔离统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取隔离统计失败',
      error: error.message
    });
  }
});

// 代理健康检查
router.post('/proxy/health-check', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { proxyIds } = req.body;

    const results = [];

    if (proxyIds && Array.isArray(proxyIds)) {
      // 检查指定代理
      for (const proxyId of proxyIds) {
        const proxy = services.proxyManager.getProxy(proxyId);
        if (proxy) {
          const isHealthy = await services.proxyManager.testProxyConnection(proxy, 10000);
          results.push({
            proxyId,
            ip: proxy.ip,
            healthy: isHealthy,
            provider: proxy.providerId,
            region: proxy.region
          });
        }
      }
    } else {
      // 检查所有活跃代理
      await services.proxyManager.performHealthCheck();
      const proxyStats = await services.proxyManager.getProxyStats();
      
      return res.json({
        success: true,
        message: '代理健康检查完成',
        data: {
          checked: proxyStats.active,
          healthy: proxyStats.active - proxyStats.failed,
          failed: proxyStats.failed,
          details: proxyStats
        }
      });
    }

    res.json({
      success: true,
      message: '代理健康检查完成',
      data: {
        results,
        summary: {
          total: results.length,
          healthy: results.filter(r => r.healthy).length,
          failed: results.filter(r => !r.healthy).length
        }
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('代理健康检查失败:', error);
    res.status(500).json({
      success: false,
      message: '代理健康检查失败',
      error: error.message
    });
  }
});

// 生成安全建议
function generateRecommendations(validation, containerStatus, proxyStatus) {
  const recommendations = [];

  if (!validation.isolated) {
    recommendations.push({
      type: 'warning',
      title: '隔离状态异常',
      description: '账号隔离环境存在问题，建议立即检查',
      action: '重新创建隔离环境'
    });
  }

  if (!proxyStatus) {
    recommendations.push({
      type: 'error',
      title: '代理连接失败',
      description: '代理服务器无法连接，可能影响账号安全',
      action: '更换代理服务器'
    });
  }

  if (containerStatus.status !== 'running') {
    recommendations.push({
      type: 'warning',
      title: '容器状态异常',
      description: '隔离容器未正常运行',
      action: '重启容器服务'
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'info',
      title: '隔离环境正常',
      description: '所有隔离组件运行正常',
      action: '定期轮换指纹保持安全'
    });
  }

  return recommendations;
}

module.exports = router;