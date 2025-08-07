const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
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
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['whatsapp', 'telegram'],
    required: true
  },
  
  // 账号标识
  accountId: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    sparse: true // WhatsApp 需要
  },
  botToken: {
    type: String,
    sparse: true // Telegram Bot 需要
  },
  
  // 登录状态
  status: {
    type: String,
    enum: ['pending', 'scanning', 'connected', 'disconnected', 'banned', 'error'],
    default: 'pending'
  },
  qrCode: {
    type: String, // Base64 编码的二维码
    default: null
  },
  sessionData: {
    type: mongoose.Schema.Types.Mixed, // 会话数据
    default: {}
  },
  
  // 账号信息
  profile: {
    name: String,
    avatar: String,
    bio: String,
    isVerified: { type: Boolean, default: false },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 }
  },
  
  // 运行配置
  config: {
    // 基本设置
    isEnabled: { type: Boolean, default: true },
    autoReconnect: { type: Boolean, default: true },
    messageDelay: { type: Number, default: 1000 }, // 消息发送延迟(ms)
    
    // 限制设置
    dailyMessageLimit: { type: Number, default: 500 },
    hourlyMessageLimit: { type: Number, default: 50 },
    groupLimit: { type: Number, default: 20 },
    
    // 行为策略
    autoReply: {
      enabled: { type: Boolean, default: false },
      keywords: [String],
      response: String,
      delay: { type: Number, default: 2000 }
    },
    autoAcceptGroups: { type: Boolean, default: false },
    autoAcceptContacts: { type: Boolean, default: false },
    
    // AI 设置
    aiEnabled: { type: Boolean, default: false },
    aiModel: { type: String, default: 'gpt-3.5-turbo' },
    aiPrompt: String,
    translateEnabled: { type: Boolean, default: false },
    targetLanguage: { type: String, default: 'zh-CN' }
  },
  
  // 运行统计
  stats: {
    messagesSent: { type: Number, default: 0 },
    messagesReceived: { type: Number, default: 0 },
    groupsJoined: { type: Number, default: 0 },
    contactsAdded: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    uptime: { type: Number, default: 0 }, // 运行时间(分钟)
    lastActivity: { type: Date, default: Date.now }
  },
  
  // 健康状态
  health: {
    lastHeartbeat: { type: Date, default: Date.now },
    errorCount: { type: Number, default: 0 },
    lastError: {
      message: String,
      timestamp: Date,
      stack: String
    },
    connectionQuality: {
      type: String,
      enum: ['excellent', 'good', 'poor', 'critical'],
      default: 'good'
    }
  },
  
  // Docker 容器信息
  container: {
    id: String,
    name: String,
    image: String,
    status: String,
    port: Number,
    createdAt: Date
  }
}, {
  timestamps: true
});

// 账号方法
accountSchema.methods.updateStats = function(type, increment = 1) {
  if (this.stats.hasOwnProperty(type)) {
    this.stats[type] += increment;
    this.stats.lastActivity = new Date();
    return this.save();
  }
  throw new Error(`无效的统计类型: ${type}`);
};

accountSchema.methods.updateHealth = function(data) {
  this.health.lastHeartbeat = new Date();
  if (data.error) {
    this.health.errorCount += 1;
    this.health.lastError = {
      message: data.error.message,
      timestamp: new Date(),
      stack: data.error.stack
    };
  }
  if (data.connectionQuality) {
    this.health.connectionQuality = data.connectionQuality;
  }
  return this.save();
};

accountSchema.methods.isHealthy = function() {
  const lastHeartbeat = this.health.lastHeartbeat;
  const now = new Date();
  const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
  
  return minutesSinceHeartbeat < 5 && // 5分钟内有心跳
         this.health.errorCount < 10 && // 错误次数少于10次
         this.status === 'connected';
};

accountSchema.methods.canSendMessage = function() {
  if (!this.config.isEnabled || this.status !== 'connected') {
    return false;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  
  // 检查今日消息限制
  const dailyCount = this.stats.messagesSent; // 这里需要查询今日数据
  if (dailyCount >= this.config.dailyMessageLimit) {
    return false;
  }
  
  // 检查小时消息限制
  const hourlyCount = this.stats.messagesSent; // 这里需要查询本小时数据
  if (hourlyCount >= this.config.hourlyMessageLimit) {
    return false;
  }
  
  return true;
};

// 索引
accountSchema.index({ userId: 1 });
accountSchema.index({ type: 1 });
accountSchema.index({ status: 1 });
accountSchema.index({ accountId: 1 }, { unique: true });
accountSchema.index({ 'health.lastHeartbeat': -1 });
accountSchema.index({ createdAt: -1 });

// 复合索引
accountSchema.index({ userId: 1, type: 1 });
accountSchema.index({ status: 1, 'health.lastHeartbeat': -1 });

module.exports = mongoose.model('Account', accountSchema);