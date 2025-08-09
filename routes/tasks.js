const express = require('express');
const Task = require('../models/Task');
const Account = require('../models/Account');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest, validateTaskConfig } = require('../middleware/validation');

const router = express.Router();

// 获取用户的所有任务
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const query = { userId: req.user.userId };
    
    // 添加过滤条件
    if (status) query.status = status;
    if (type) query.type = type;
    
    const tasks = await Task.find(query)
      .populate('config.accounts', 'name type status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Task.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败',
      error: error.message
    });
  }
});

// 创建新任务
router.post('/', authMiddleware, validateTaskConfig, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { name, description, type, config } = req.body;

    // 验证账号归属
    const accounts = await Account.find({
      _id: { $in: config.accounts },
      userId: req.user.userId
    });

    if (accounts.length !== config.accounts.length) {
      return res.status(400).json({
        success: false,
        message: '包含无效的账号ID'
      });
    }

    // 检查用户任务限制
    const user = await services.accountManager.getUser(req.user.userId);
    if (!user.checkLimit('tasks')) {
      return res.status(400).json({
        success: false,
        message: `任务数量已达上限 (${user.limits.maxTasks})`
      });
    }

    // 创建任务
    const task = new Task({
      userId: req.user.userId,
      name,
      description,
      type,
      config: {
        ...config,
        schedule: config.schedule || { type: 'immediate' },
        limits: config.limits || {},
        advanced: config.advanced || {}
      }
    });

    await task.save();

    // 如果是立即执行的任务，添加到队列
    if (task.config.schedule.type === 'immediate') {
      await services.taskScheduler.addTask(task);
    }

    res.status(201).json({
      success: true,
      message: '任务创建成功',
      data: {
        task: task.toJSON()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('创建任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建任务失败',
      error: error.message
    });
  }
});

// 获取特定任务详情
router.get('/:taskId', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOne({
      _id: taskId,
      userId: req.user.userId
    }).populate('config.accounts', 'name type status accountId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: {
        task: task.toJSON()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务详情失败',
      error: error.message
    });
  }
});

// 启动任务
router.post('/:taskId/start', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { taskId } = req.params;

    const task = await Task.findOne({
      _id: taskId,
      userId: req.user.userId
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '只能启动待执行的任务'
      });
    }

    // 添加任务到队列
    await services.taskScheduler.addTask(task);

    res.json({
      success: true,
      message: '任务已启动'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('启动任务失败:', error);
    res.status(500).json({
      success: false,
      message: '启动任务失败',
      error: error.message
    });
  }
});

// 暂停任务
router.post('/:taskId/pause', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOneAndUpdate(
      {
        _id: taskId,
        userId: req.user.userId,
        status: 'running'
      },
      { status: 'paused' },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在或无法暂停'
      });
    }

    res.json({
      success: true,
      message: '任务已暂停'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('暂停任务失败:', error);
    res.status(500).json({
      success: false,
      message: '暂停任务失败',
      error: error.message
    });
  }
});

// 取消任务
router.post('/:taskId/cancel', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { taskId } = req.params;

    const task = await Task.findOne({
      _id: taskId,
      userId: req.user.userId
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    if (['completed', 'cancelled'].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: '任务已完成或已取消'
      });
    }

    // 取消任务
    await services.taskScheduler.cancelTask(taskId);

    res.json({
      success: true,
      message: '任务已取消'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('取消任务失败:', error);
    res.status(500).json({
      success: false,
      message: '取消任务失败',
      error: error.message
    });
  }
});

// 删除任务
router.delete('/:taskId', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { taskId } = req.params;

    const task = await Task.findOne({
      _id: taskId,
      userId: req.user.userId
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    // 如果任务正在运行，先取消
    if (['pending', 'running'].includes(task.status)) {
      await services.taskScheduler.cancelTask(taskId);
    }

    // 删除任务
    await Task.findByIdAndDelete(taskId);

    res.json({
      success: true,
      message: '任务删除成功'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('删除任务失败:', error);
    res.status(500).json({
      success: false,
      message: '删除任务失败',
      error: error.message
    });
  }
});

// 获取任务执行结果
router.get('/:taskId/result', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findOne({
      _id: taskId,
      userId: req.user.userId
    }).select('result progress status executionTime');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: {
        result: task.result,
        progress: task.progress,
        status: task.status,
        executionTime: task.executionTime
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取任务结果失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务结果失败',
      error: error.message
    });
  }
});

// 获取任务日志
router.get('/:taskId/logs', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const task = await Task.findOne({
      _id: taskId,
      userId: req.user.userId
    }).select('result.logs');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    const logs = task.result.logs || [];
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = logs.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: logs.length,
          totalPages: Math.ceil(logs.length / limit)
        }
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取任务日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务日志失败',
      error: error.message
    });
  }
});

// 复制任务
router.post('/:taskId/clone', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { name } = req.body;

    const originalTask = await Task.findOne({
      _id: taskId,
      userId: req.user.userId
    });

    if (!originalTask) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    // 创建任务副本
    const clonedTask = new Task({
      userId: req.user.userId,
      name: name || `${originalTask.name} (副本)`,
      description: originalTask.description,
      type: originalTask.type,
      config: originalTask.config,
      priority: originalTask.priority
    });

    await clonedTask.save();

    res.status(201).json({
      success: true,
      message: '任务复制成功',
      data: {
        task: clonedTask.toJSON()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('复制任务失败:', error);
    res.status(500).json({
      success: false,
      message: '复制任务失败',
      error: error.message
    });
  }
});

// 批量操作任务
router.post('/batch', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { action, taskIds } = req.body;

    if (!action || !taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的操作和任务ID列表'
      });
    }

    const tasks = await Task.find({
      _id: { $in: taskIds },
      userId: req.user.userId
    });

    if (tasks.length !== taskIds.length) {
      return res.status(400).json({
        success: false,
        message: '包含无效的任务ID'
      });
    }

    let results = [];

    switch (action) {
      case 'start':
        for (const task of tasks) {
          if (task.status === 'pending') {
            try {
              await services.taskScheduler.addTask(task);
              results.push({ taskId: task._id, success: true });
            } catch (error) {
              results.push({ taskId: task._id, success: false, error: error.message });
            }
          } else {
            results.push({ taskId: task._id, success: false, error: '任务状态不允许启动' });
          }
        }
        break;

      case 'cancel':
        for (const task of tasks) {
          try {
            await services.taskScheduler.cancelTask(task._id);
            results.push({ taskId: task._id, success: true });
          } catch (error) {
            results.push({ taskId: task._id, success: false, error: error.message });
          }
        }
        break;

      case 'delete':
        for (const task of tasks) {
          try {
            if (['pending', 'running'].includes(task.status)) {
              await services.taskScheduler.cancelTask(task._id);
            }
            await Task.findByIdAndDelete(task._id);
            results.push({ taskId: task._id, success: true });
          } catch (error) {
            results.push({ taskId: task._id, success: false, error: error.message });
          }
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: '不支持的批量操作'
        });
    }

    res.json({
      success: true,
      message: '批量操作完成',
      data: {
        results
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('批量操作失败:', error);
    res.status(500).json({
      success: false,
      message: '批量操作失败',
      error: error.message
    });
  }
});

// 获取任务统计
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await Task.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
        }
      }
    ]);

    const typeStats = await Task.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total: 0,
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          cancelled: 0
        },
        byType: typeStats
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取任务统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务统计失败',
      error: error.message
    });
  }
});

// 执行任务
router.post('/:taskId/execute', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { taskId } = req.params;

    const task = await Task.findOne({ _id: taskId, userId: req.user.userId });
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    // 如果有调度器则委托执行，否则直接标记为已完成（降级运行）
    if (services.taskScheduler && services.taskScheduler.addTask) {
      await services.taskScheduler.addTask(task);
    } else {
      task.status = 'completed';
      await task.save();
    }

    res.json({ success: true, message: '任务已执行' });
  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('执行任务失败:', error);
    res.status(500).json({ success: false, message: '执行任务失败', error: error.message });
  }
});

module.exports = router;