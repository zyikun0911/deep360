const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // 基本信息
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // 用户角色和权限
  role: {
    type: String,
    enum: ['admin', 'user', 'agent'],
    default: 'user'
  },
  permissions: [{
    type: String,
    enum: [
      'account_manage',     // 账号管理
      'task_create',        // 创建任务
      'task_execute',       // 执行任务
      'data_export',        // 数据导出
      'ai_content',         // AI内容生成
      'system_config'       // 系统配置
    ]
  }],
  
  // 套餐和限制
  plan: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free'
  },
  limits: {
    maxAccounts: { type: Number, default: 5 },      // 最大账号数
    maxTasks: { type: Number, default: 10 },        // 最大任务数
    dailyMessages: { type: Number, default: 1000 }, // 每日消息限制
    storageSpace: { type: Number, default: 1024 }   // 存储空间(MB)
  },
  
  // 使用统计
  usage: {
    accountsUsed: { type: Number, default: 0 },
    tasksCreated: { type: Number, default: 0 },
    messagesSent: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }
  },
  
  // 账号状态
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // 个人设置
  settings: {
    language: { type: String, default: 'zh-CN' },
    timezone: { type: String, default: 'Asia/Shanghai' },
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true },
      taskComplete: { type: Boolean, default: true },
      accountStatus: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 检查权限方法
userSchema.methods.hasPermission = function(permission) {
  return this.role === 'admin' || this.permissions.includes(permission);
};

// 更新使用统计
userSchema.methods.updateUsage = function(type, increment = 1) {
  if (this.usage.hasOwnProperty(type)) {
    this.usage[type] += increment;
    return this.save();
  }
  throw new Error(`无效的使用统计类型: ${type}`);
};

// 检查限制
userSchema.methods.checkLimit = function(type) {
  const used = this.usage[type + 'Used'] || this.usage[type];
  const limit = this.limits['max' + type.charAt(0).toUpperCase() + type.slice(1)] || 
                this.limits[type];
  
  return used < limit;
};

// 索引
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'usage.messagesSent': -1 });

module.exports = mongoose.model('User', userSchema);