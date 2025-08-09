const express = require('express');
const Account = require('../models/Account');
const Task = require('../models/Task');
const User = require('../models/User');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// 概览统计（兼容 tests 期望字段）
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const accountsTotal = await Account.countDocuments({ userId: req.user.userId });
    const tasksTotal = await Task.countDocuments({ userId: req.user.userId });

    const data = {
      accounts: accountsTotal,
      tasks: tasksTotal,
      messages: 0 // 如需可从消息集合或日志中统计
    };

    res.json({ success: true, data });
  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取概览统计失败:', error);
    res.status(500).json({ success: false, message: '获取概览统计失败', error: error.message });
  }
});

// 账号统计（兼容 tests 期望字段）
router.get('/accounts', authMiddleware, async (req, res) => {
  try {
    const byPlatformAgg = await Account.aggregate([
      { $match: { userId: req.user.userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const byStatusAgg = await Account.aggregate([
      { $match: { userId: req.user.userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const byPlatform = Object.fromEntries(byPlatformAgg.map(x => [x._id, x.count]));
    const byStatus = Object.fromEntries(byStatusAgg.map(x => [x._id, x.count]));

    res.json({ success: true, data: { byPlatform, byStatus } });
  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取账号统计失败:', error);
    res.status(500).json({ success: false, message: '获取账号统计失败', error: error.message });
  }
});

// 获取消息统计
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const userId = req.user.userId;

    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // 按天统计消息
    const dailyStats = await Account.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$stats.lastActivity'
            }
          },
          sent: { $sum: '$stats.messagesSent' },
          received: { $sum: '$stats.messagesReceived' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 按账号统计
    const accountStats = await Account.find(
      { userId: userId },
      'name type stats.messagesSent stats.messagesReceived'
    );

    res.json({
      success: true,
      data: {
        daily: dailyStats,
        byAccount: accountStats.map(account => ({
          name: account.name,
          type: account.type,
          sent: account.stats.messagesSent,
          received: account.stats.messagesReceived
        }))
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取消息统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取消息统计失败',
      error: error.message
    });
  }
});

// 获取账号健康统计
router.get('/accounts/health', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const healthStats = await Account.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$health.connectionQuality',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = await Account.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 错误统计
    const errorStats = await Account.aggregate([
      { $match: { userId: userId, 'health.errorCount': { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalErrors: { $sum: '$health.errorCount' },
          accountsWithErrors: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        connectionQuality: healthStats,
        status: statusStats,
        errors: errorStats[0] || { totalErrors: 0, accountsWithErrors: 0 }
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取账号健康统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取账号健康统计失败',
      error: error.message
    });
  }
});

// 获取任务性能统计
router.get('/tasks/performance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 任务成功率统计
    const successRate = await Task.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          successRate: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $multiply: [{ $divide: ['$completed', '$total'] }, 100] }
            ]
          }
        }
      }
    ]);

    // 执行时间统计
    const executionTimes = await Task.aggregate([
      { 
        $match: { 
          userId: userId,
          'executionTime.actualDuration': { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: '$type',
          avgDuration: { $avg: '$executionTime.actualDuration' },
          minDuration: { $min: '$executionTime.actualDuration' },
          maxDuration: { $max: '$executionTime.actualDuration' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        successRate,
        executionTimes
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取任务性能统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务性能统计失败',
      error: error.message
    });
  }
});

// 获取实时统计（管理员）
router.get('/realtime', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { services } = req.app.locals;

    // 系统统计
    const systemStats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString()
    };

    // 用户统计
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          activeUsers: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'active'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // 全局账号统计
    const globalAccountStats = await Account.aggregate([
      {
        $group: {
          _id: '$type',
          total: { $sum: 1 },
          connected: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'connected'] },
                1,
                0
              ]
            }
          },
          totalMessages: { $sum: '$stats.messagesSent' }
        }
      }
    ]);

    // 队列统计
    const queueStats = await services.taskScheduler.getQueueStats();

    res.json({
      success: true,
      data: {
        system: systemStats,
        users: userStats,
        accounts: globalAccountStats,
        queues: queueStats
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取实时统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取实时统计失败',
      error: error.message
    });
  }
});

// 获取用户使用报告
router.get('/usage/report', authMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const userId = req.user.userId;

    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // 消息使用情况
    const messageUsage = await Account.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$stats.lastActivity'
            }
          },
          messages: { $sum: '$stats.messagesSent' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 任务使用情况
    const taskUsage = await Task.aggregate([
      { 
        $match: { 
          userId: userId,
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 获取用户限制信息
    const user = await User.findById(userId).select('limits usage');

    res.json({
      success: true,
      data: {
        period,
        messageUsage,
        taskUsage,
        limits: user.limits,
        currentUsage: user.usage
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取使用报告失败:', error);
    res.status(500).json({
      success: false,
      message: '获取使用报告失败',
      error: error.message
    });
  }
});

// 导出统计数据
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { type = 'all', format = 'json' } = req.query;
    const userId = req.user.userId;

    const exportData = {};

    if (type === 'all' || type === 'accounts') {
      exportData.accounts = await Account.find(
        { userId: userId },
        'name type status stats health createdAt'
      );
    }

    if (type === 'all' || type === 'tasks') {
      exportData.tasks = await Task.find(
        { userId: userId },
        'name type status progress result executionTime createdAt'
      );
    }

    if (format === 'csv') {
      // 这里可以实现 CSV 格式导出
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stats.csv');
      // 实现 CSV 转换逻辑
      res.send('CSV format not implemented yet');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=stats.json');
      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        data: exportData
      });
    }

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('导出统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '导出统计数据失败',
      error: error.message
    });
  }
});

module.exports = router;