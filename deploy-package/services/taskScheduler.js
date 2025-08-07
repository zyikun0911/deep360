const Bull = require('bull');
const cron = require('node-cron');
const Task = require('../models/Task');
const Account = require('../models/Account');

class TaskScheduler {
  constructor(redisClient, logger) {
    this.redis = redisClient;
    this.logger = logger;
    this.queues = new Map();
    this.processors = new Map();
    this.cronJobs = new Map();
    
    // 初始化队列
    this.initializeQueues();
  }

  /**
   * 初始化任务队列
   */
  initializeQueues() {
    const queueNames = [
      'bulk_message',
      'group_create',
      'group_invite',
      'group_kick',
      'contact_add',
      'auto_reply',
      'content_scrape',
      'data_export',
      'ai_content'
    ];

    queueNames.forEach(queueName => {
      const queue = new Bull(queueName, {
        redis: {
          port: process.env.REDIS_PORT || 6379,
          host: process.env.REDIS_HOST || 'localhost',
          password: process.env.REDIS_PASSWORD || undefined
        },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 20,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      this.queues.set(queueName, queue);
      this.setupQueueEvents(queue, queueName);
    });

    this.logger.info('任务队列初始化完成');
  }

  /**
   * 设置队列事件监听
   */
  setupQueueEvents(queue, queueName) {
    queue.on('completed', (job, result) => {
      this.logger.info(`任务完成: ${queueName} - ${job.id}`, result);
      this.updateTaskStatus(job.data.taskId, 'completed', result);
    });

    queue.on('failed', (job, err) => {
      this.logger.error(`任务失败: ${queueName} - ${job.id}`, err);
      this.updateTaskStatus(job.data.taskId, 'failed', { error: err.message });
    });

    queue.on('progress', (job, progress) => {
      this.updateTaskProgress(job.data.taskId, progress);
    });

    queue.on('stalled', (job) => {
      this.logger.warn(`任务卡住: ${queueName} - ${job.id}`);
    });
  }

  /**
   * 启动任务调度器
   */
  async start() {
    try {
      // 注册任务处理器
      this.registerProcessors();

      // 启动定时任务扫描
      this.startCronScanner();

      // 处理挂起的任务
      await this.processPendingTasks();

      // 启动队列监控
      this.startQueueMonitoring();

      this.logger.info('任务调度器启动成功');
    } catch (error) {
      this.logger.error('任务调度器启动失败:', error);
      throw error;
    }
  }

  /**
   * 注册任务处理器
   */
  registerProcessors() {
    // 群发消息处理器
    this.queues.get('bulk_message').process(async (job) => {
      return await this.processBulkMessage(job);
    });

    // 创建群组处理器
    this.queues.get('group_create').process(async (job) => {
      return await this.processGroupCreate(job);
    });

    // 邀请入群处理器
    this.queues.get('group_invite').process(async (job) => {
      return await this.processGroupInvite(job);
    });

    // 踢出群组处理器
    this.queues.get('group_kick').process(async (job) => {
      return await this.processGroupKick(job);
    });

    // 添加联系人处理器
    this.queues.get('contact_add').process(async (job) => {
      return await this.processContactAdd(job);
    });

    // AI内容生成处理器
    this.queues.get('ai_content').process(async (job) => {
      return await this.processAIContent(job);
    });

    // 数据导出处理器
    this.queues.get('data_export').process(async (job) => {
      return await this.processDataExport(job);
    });

    this.logger.info('任务处理器注册完成');
  }

  /**
   * 添加任务到队列
   */
  async addTask(task) {
    try {
      const queue = this.queues.get(task.type);
      if (!queue) {
        throw new Error(`不支持的任务类型: ${task.type}`);
      }

      const jobOptions = {
        delay: 0,
        priority: task.priority || 5,
        attempts: task.config.limits?.retryTimes || 3,
        backoff: 'exponential'
      };

      // 处理延迟执行
      if (task.config.schedule?.type === 'delayed' && task.config.schedule.startTime) {
        const delay = new Date(task.config.schedule.startTime) - new Date();
        if (delay > 0) {
          jobOptions.delay = delay;
        }
      }

      // 处理定时任务
      if (task.config.schedule?.type === 'recurring' && task.config.schedule.cron) {
        return await this.addRecurringTask(task);
      }

      const job = await queue.add(task.type, {
        taskId: task._id.toString(),
        userId: task.userId.toString(),
        config: task.config
      }, jobOptions);

      // 更新任务状态
      await Task.findByIdAndUpdate(task._id, {
        status: 'pending',
        'executionTime.queuedAt': new Date()
      });

      this.logger.info(`任务已添加到队列: ${task.type} - ${job.id}`);
      return job;

    } catch (error) {
      this.logger.error('添加任务失败:', error);
      throw error;
    }
  }

  /**
   * 添加定时任务
   */
  async addRecurringTask(task) {
    try {
      const cronExpression = task.config.schedule.cron;
      const taskId = task._id.toString();

      // 验证 cron 表达式
      if (!cron.validate(cronExpression)) {
        throw new Error(`无效的 cron 表达式: ${cronExpression}`);
      }

      // 创建定时任务
      const cronJob = cron.schedule(cronExpression, async () => {
        try {
          const queue = this.queues.get(task.type);
          if (queue) {
            await queue.add(task.type, {
              taskId,
              userId: task.userId.toString(),
              config: task.config,
              isRecurring: true
            });
            this.logger.info(`定时任务已触发: ${task.type} - ${taskId}`);
          }
        } catch (error) {
          this.logger.error(`定时任务执行失败: ${taskId}`, error);
        }
      }, {
        scheduled: false,
        timezone: task.config.schedule.timezone || 'Asia/Shanghai'
      });

      // 存储定时任务
      this.cronJobs.set(taskId, cronJob);

      // 启动定时任务
      cronJob.start();

      this.logger.info(`定时任务已创建: ${task.type} - ${taskId}, cron: ${cronExpression}`);
      return cronJob;

    } catch (error) {
      this.logger.error('创建定时任务失败:', error);
      throw error;
    }
  }

  /**
   * 处理群发消息任务
   */
  async processBulkMessage(job) {
    const { taskId, userId, config } = job.data;
    
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      await task.markStarted();
      
      const accounts = await Account.find({
        _id: { $in: config.accounts },
        status: 'connected'
      });

      if (accounts.length === 0) {
        throw new Error('没有可用的已连接账号');
      }

      const targets = config.targets.list || [];
      const content = config.content.text || '';
      
      let completed = 0;
      let failed = 0;
      const results = [];

      // 分发到不同账号执行
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const account = accounts[i % accounts.length]; // 轮询分配账号

        try {
          // 更新进度
          job.progress(Math.round((i / targets.length) * 100));

          // 发送消息（这里需要调用具体的服务）
          await this.sendMessageWithAccount(account, target, content, config);
          
          await task.addResult(target, account.accountId, 'success', '消息发送成功');
          completed++;

          // 添加延迟
          if (config.limits?.messageDelay) {
            await new Promise(resolve => setTimeout(resolve, config.limits.messageDelay));
          }

        } catch (error) {
          await task.addResult(target, account.accountId, 'failed', error.message);
          failed++;
        }
      }

      await task.updateProgress(completed, failed);
      await task.markCompleted(failed === 0);

      return {
        completed,
        failed,
        total: targets.length,
        duration: Date.now() - job.timestamp
      };

    } catch (error) {
      await Task.findByIdAndUpdate(taskId, {
        status: 'failed',
        'errors': [{
          code: 'EXECUTION_ERROR',
          message: error.message,
          timestamp: new Date()
        }]
      });
      throw error;
    }
  }

  /**
   * 使用指定账号发送消息
   */
  async sendMessageWithAccount(account, target, content, config) {
    // 这里需要根据账号类型调用相应的服务
    // 暂时模拟实现
    if (account.type === 'whatsapp') {
      // 调用 WhatsApp 服务
      // await whatsappService.sendMessage(account.accountId, target, content);
    } else if (account.type === 'telegram') {
      // 调用 Telegram 服务
      // await telegramService.sendMessage(account.accountId, target, content);
    }
    
    // 更新账号统计
    await Account.findByIdAndUpdate(account._id, {
      $inc: { 'stats.messagesSent': 1 },
      'stats.lastActivity': new Date()
    });
  }

  /**
   * 处理创建群组任务
   */
  async processGroupCreate(job) {
    const { taskId, userId, config } = job.data;
    
    try {
      // 实现群组创建逻辑
      this.logger.info(`处理创建群组任务: ${taskId}`);
      
      return { success: true, message: '群组创建完成' };
    } catch (error) {
      this.logger.error(`创建群组任务失败: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * 处理邀请入群任务
   */
  async processGroupInvite(job) {
    const { taskId, userId, config } = job.data;
    
    try {
      // 实现邀请入群逻辑
      this.logger.info(`处理邀请入群任务: ${taskId}`);
      
      return { success: true, message: '邀请入群完成' };
    } catch (error) {
      this.logger.error(`邀请入群任务失败: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * 处理AI内容生成任务
   */
  async processAIContent(job) {
    const { taskId, userId, config } = job.data;
    
    try {
      // 实现AI内容生成逻辑
      this.logger.info(`处理AI内容生成任务: ${taskId}`);
      
      return { success: true, message: 'AI内容生成完成' };
    } catch (error) {
      this.logger.error(`AI内容生成任务失败: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * 启动定时任务扫描
   */
  startCronScanner() {
    // 每分钟扫描一次待执行的任务
    cron.schedule('* * * * *', async () => {
      try {
        await this.processPendingTasks();
      } catch (error) {
        this.logger.error('扫描待执行任务失败:', error);
      }
    });

    this.logger.info('定时任务扫描器已启动');
  }

  /**
   * 处理挂起的任务
   */
  async processPendingTasks() {
    try {
      const pendingTasks = await Task.getQueuedTasks();
      
      for (const task of pendingTasks) {
        if (task.canExecute()) {
          await this.addTask(task);
        }
      }
      
      if (pendingTasks.length > 0) {
        this.logger.info(`处理了 ${pendingTasks.length} 个待执行任务`);
      }
    } catch (error) {
      this.logger.error('处理挂起任务失败:', error);
    }
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId, status, result = null) {
    try {
      const updateData = { status };
      
      if (result) {
        updateData.result = result;
      }
      
      if (status === 'completed' || status === 'failed') {
        updateData['executionTime.completedAt'] = new Date();
      }

      await Task.findByIdAndUpdate(taskId, updateData);
    } catch (error) {
      this.logger.error(`更新任务状态失败: ${taskId}`, error);
    }
  }

  /**
   * 更新任务进度
   */
  async updateTaskProgress(taskId, progress) {
    try {
      await Task.findByIdAndUpdate(taskId, {
        'progress.percentage': progress
      });
    } catch (error) {
      this.logger.error(`更新任务进度失败: ${taskId}`, error);
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId) {
    try {
      // 取消队列中的任务
      for (const [queueName, queue] of this.queues) {
        const jobs = await queue.getJobs(['waiting', 'active', 'delayed']);
        for (const job of jobs) {
          if (job.data.taskId === taskId) {
            await job.remove();
            this.logger.info(`队列任务已取消: ${queueName} - ${job.id}`);
          }
        }
      }

      // 取消定时任务
      if (this.cronJobs.has(taskId)) {
        const cronJob = this.cronJobs.get(taskId);
        cronJob.stop();
        this.cronJobs.delete(taskId);
        this.logger.info(`定时任务已取消: ${taskId}`);
      }

      // 更新数据库状态
      await Task.findByIdAndUpdate(taskId, {
        status: 'cancelled',
        'executionTime.cancelledAt': new Date()
      });

    } catch (error) {
      this.logger.error(`取消任务失败: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * 启动队列监控
   */
  startQueueMonitoring() {
    setInterval(async () => {
      try {
        const stats = await this.getQueueStats();
        this.logger.info('队列统计:', stats);
      } catch (error) {
        this.logger.error('获取队列统计失败:', error);
      }
    }, 60000); // 每分钟统计一次
  }

  /**
   * 获取队列统计
   */
  async getQueueStats() {
    const stats = {};
    
    for (const [queueName, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      stats[queueName] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    }
    
    return stats;
  }

  /**
   * 清理完成的任务
   */
  async cleanupCompletedJobs() {
    try {
      for (const [queueName, queue] of this.queues) {
        await queue.clean(24 * 60 * 60 * 1000, 'completed'); // 清理24小时前的完成任务
        await queue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 清理7天前的失败任务
      }
      this.logger.info('队列清理完成');
    } catch (error) {
      this.logger.error('队列清理失败:', error);
    }
  }

  /**
   * 停止调度器
   */
  async stop() {
    try {
      // 停止所有定时任务
      for (const [taskId, cronJob] of this.cronJobs) {
        cronJob.stop();
      }
      this.cronJobs.clear();

      // 关闭所有队列
      for (const [queueName, queue] of this.queues) {
        await queue.close();
      }
      this.queues.clear();

      this.logger.info('任务调度器已停止');
    } catch (error) {
      this.logger.error('停止任务调度器失败:', error);
      throw error;
    }
  }
}

module.exports = TaskScheduler;