const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  // 基本信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  
  // 任务类型和配置
  type: {
    type: String,
    enum: [
      'bulk_message',      // 群发消息
      'group_create',      // 创建群组
      'group_invite',      // 邀请入群
      'group_kick',        // 踢出群组
      'contact_add',       // 添加联系人
      'auto_reply',        // 自动回复
      'content_scrape',    // 内容抓取
      'data_export',       // 数据导出
      'ai_content'         // AI内容生成
    ],
    required: true
  },
  
  // 执行配置
  config: {
    // 目标设置
    accounts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account'
    }],
    targets: {
      type: mongoose.Schema.Types.Mixed,
      // 可能包含: 电话号码列表、群组ID列表、关键词等
      default: {}
    },
    
    // 消息内容
    content: {
      text: String,
      media: [{
        type: String, // 'image', 'video', 'audio', 'document'
        url: String,
        filename: String,
        caption: String
      }],
      template: String, // 消息模板
      variables: mongoose.Schema.Types.Mixed // 模板变量
    },
    
    // 执行设置
    schedule: {
      type: {
        type: String,
        enum: ['immediate', 'delayed', 'recurring'],
        default: 'immediate'
      },
      startTime: Date,
      endTime: Date,
      interval: Number, // 间隔时间(分钟)
      cron: String,     // Cron 表达式
      timezone: { type: String, default: 'Asia/Shanghai' }
    },
    
    // 限制和策略
    limits: {
      maxTargets: { type: Number, default: 100 },
      messageDelay: { type: Number, default: 1000 }, // 消息间隔(ms)
      retryTimes: { type: Number, default: 3 },
      timeout: { type: Number, default: 30000 } // 超时时间(ms)
    },
    
    // 高级设置
    advanced: {
      randomDelay: { type: Boolean, default: true },
      skipExisting: { type: Boolean, default: true },
      validateTargets: { type: Boolean, default: true },
      aiGenerate: { type: Boolean, default: false },
      translateContent: { type: Boolean, default: false }
    }
  },
  
  // 执行状态
  status: {
    type: String,
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  
  // 执行进度
  progress: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  },
  
  // 执行结果
  result: {
    summary: {
      totalTargets: Number,
      successCount: Number,
      failureCount: Number,
      skipCount: Number,
      duration: Number // 执行时长(秒)
    },
    details: [{
      target: String,
      account: String,
      status: { type: String, enum: ['success', 'failed', 'skipped'] },
      message: String,
      timestamp: { type: Date, default: Date.now },
      error: String
    }],
    logs: [String],
    artifacts: [{ // 生成的文件
      type: String,
      filename: String,
      path: String,
      size: Number,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  
  // 时间信息
  executionTime: {
    startedAt: Date,
    completedAt: Date,
    estimatedDuration: Number,
    actualDuration: Number
  },
  
  // 依赖关系
  dependencies: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    condition: {
      type: String,
      enum: ['success', 'completion', 'failure'],
      default: 'success'
    }
  }],
  
  // 错误处理
  errors: [{
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});

// 任务方法
taskSchema.methods.updateProgress = function(completed, failed = 0, skipped = 0) {
  this.progress.completed = completed;
  this.progress.failed = failed;
  this.progress.skipped = skipped;
  this.progress.total = this.config.targets.length || 0;
  
  if (this.progress.total > 0) {
    this.progress.percentage = Math.round(
      ((completed + failed + skipped) / this.progress.total) * 100
    );
  }
  
  return this.save();
};

taskSchema.methods.addResult = function(target, account, status, message, error = null) {
  this.result.details.push({
    target,
    account,
    status,
    message,
    error,
    timestamp: new Date()
  });
  
  // 更新汇总统计
  if (!this.result.summary) {
    this.result.summary = {
      totalTargets: 0,
      successCount: 0,
      failureCount: 0,
      skipCount: 0,
      duration: 0
    };
  }
  
  switch (status) {
    case 'success':
      this.result.summary.successCount++;
      break;
    case 'failed':
      this.result.summary.failureCount++;
      break;
    case 'skipped':
      this.result.summary.skipCount++;
      break;
  }
  
  return this.save();
};

taskSchema.methods.addLog = function(message) {
  const timestamp = new Date().toISOString();
  this.result.logs.push(`[${timestamp}] ${message}`);
  return this.save();
};

taskSchema.methods.markStarted = function() {
  this.status = 'running';
  this.executionTime.startedAt = new Date();
  return this.save();
};

taskSchema.methods.markCompleted = function(success = true) {
  this.status = success ? 'completed' : 'failed';
  this.executionTime.completedAt = new Date();
  
  if (this.executionTime.startedAt) {
    this.executionTime.actualDuration = Math.round(
      (this.executionTime.completedAt - this.executionTime.startedAt) / 1000
    );
  }
  
  return this.save();
};

taskSchema.methods.canExecute = function() {
  if (this.status !== 'pending') {
    return false;
  }
  
  // 检查依赖任务
  for (const dep of this.dependencies) {
    const depTask = dep.taskId;
    if (dep.condition === 'success' && depTask.status !== 'completed') {
      return false;
    }
    if (dep.condition === 'completion' && !['completed', 'failed'].includes(depTask.status)) {
      return false;
    }
    if (dep.condition === 'failure' && depTask.status !== 'failed') {
      return false;
    }
  }
  
  // 检查执行时间
  if (this.config.schedule.type === 'delayed') {
    const now = new Date();
    if (this.config.schedule.startTime && now < this.config.schedule.startTime) {
      return false;
    }
  }
  
  return true;
};

// 静态方法
taskSchema.statics.getQueuedTasks = function() {
  return this.find({ 
    status: 'pending',
    $or: [
      { 'config.schedule.type': 'immediate' },
      { 
        'config.schedule.type': 'delayed',
        'config.schedule.startTime': { $lte: new Date() }
      }
    ]
  }).sort({ priority: -1, createdAt: 1 });
};

// 索引
taskSchema.index({ userId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ type: 1 });
taskSchema.index({ priority: -1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ 'config.schedule.startTime': 1 });
taskSchema.index({ 'executionTime.startedAt': -1 });

// 复合索引
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ status: 1, priority: -1, createdAt: 1 });

module.exports = mongoose.model('Task', taskSchema);