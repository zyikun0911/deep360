const mongoose = require('mongoose');

const pluginSchema = new mongoose.Schema({
  // 基本信息
  id: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-z0-9-_]+$/
  },
  name: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true,
    match: /^\d+\.\d+\.\d+/
  },
  
  // 作者信息
  author: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String
    },
    website: {
      type: String
    }
  },

  // 分类和标签
  category: {
    type: String,
    required: true,
    enum: [
      'messaging',      // 消息相关
      'automation',     // 自动化
      'ai',            // AI增强
      'analytics',     // 数据分析
      'security',      // 安全防护
      'integration',   // 第三方集成
      'utility',       // 实用工具
      'marketing',     // 营销工具
      'crm',          // 客户管理
      'workflow'      // 工作流
    ]
  },
  tags: [{
    type: String
  }],

  // 插件类型
  type: {
    type: String,
    required: true,
    enum: [
      'core',          // 核心插件
      'extension',     // 扩展插件
      'theme',         // 主题插件
      'widget',        // 小部件
      'integration',   // 集成插件
      'custom'         // 自定义插件
    ]
  },

  // 源码信息
  source: {
    type: {
      type: String,
      required: true,
      enum: ['marketplace', 'local', 'github', 'npm', 'custom']
    },
    url: {
      type: String
    },
    repository: {
      type: String
    },
    license: {
      type: String,
      default: 'MIT'
    }
  },

  // 技术信息
  main: {
    type: String,
    required: true,
    default: 'index.js'
  },
  engines: {
    node: {
      type: String,
      default: '>=14.0.0'
    },
    deep360: {
      type: String,
      default: '>=1.0.0'
    }
  },

  // 权限要求
  permissions: [{
    type: String,
    enum: [
      'whatsapp.send',
      'whatsapp.receive',
      'whatsapp.groups',
      'telegram.send',
      'telegram.receive',
      'telegram.channels',
      'database.read',
      'database.write',
      'files.read',
      'files.write',
      'network.http',
      'system.scheduler',
      'ai.access',
      'user.data'
    ]
  }],

  // 依赖关系
  dependencies: [{
    id: {
      type: String,
      required: true
    },
    version: {
      type: String,
      required: true
    },
    optional: {
      type: Boolean,
      default: false
    }
  }],

  // 钩子注册
  hooks: [{
    name: {
      type: String,
      required: true
    },
    priority: {
      type: Number,
      default: 100
    }
  }],

  // 配置架构
  configSchema: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 默认配置
  defaultConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 安装信息
  installation: {
    installDate: {
      type: Date,
      default: Date.now
    },
    installedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    installSource: {
      type: String
    },
    packageSize: {
      type: Number // bytes
    }
  },

  // 运行状态
  status: {
    state: {
      type: String,
      enum: ['installed', 'enabled', 'disabled', 'error'],
      default: 'installed'
    },
    lastStarted: {
      type: Date
    },
    lastStopped: {
      type: Date
    },
    errorMessage: {
      type: String
    },
    crashCount: {
      type: Number,
      default: 0
    }
  },

  // 用户配置
  userConfig: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // 统计信息
  stats: {
    activations: {
      type: Number,
      default: 0
    },
    executionCount: {
      type: Number,
      default: 0
    },
    lastExecution: {
      type: Date
    },
    averageExecutionTime: {
      type: Number,
      default: 0
    },
    errorCount: {
      type: Number,
      default: 0
    }
  },

  // 市场信息
  marketplace: {
    downloads: {
      type: Number,
      default: 0
    },
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      count: {
        type: Number,
        default: 0
      }
    },
    reviews: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      date: {
        type: Date,
        default: Date.now
      }
    }],
    featured: {
      type: Boolean,
      default: false
    },
    verified: {
      type: Boolean,
      default: false
    }
  },

  // 更新信息
  updates: {
    checkDate: {
      type: Date
    },
    available: {
      type: Boolean,
      default: false
    },
    latestVersion: {
      type: String
    },
    changelog: [{
      version: String,
      date: Date,
      changes: [String]
    }]
  },

  // 兼容性
  compatibility: {
    whatsapp: {
      minVersion: String,
      maxVersion: String,
      features: [String]
    },
    telegram: {
      minVersion: String,
      maxVersion: String,
      features: [String]
    },
    platform: [String] // ['web', 'mobile', 'desktop']
  },

  // 国际化
  i18n: {
    supportedLanguages: [{
      type: String,
      default: ['zh-CN', 'en-US']
    }],
    defaultLanguage: {
      type: String,
      default: 'zh-CN'
    }
  },

  // 资源文件
  assets: {
    icon: {
      type: String // 图标文件路径
    },
    screenshots: [String],
    documentation: {
      type: String // 文档文件路径
    },
    examples: [String]
  },

  // 安全信息
  security: {
    signature: {
      type: String // 插件签名
    },
    checksum: {
      type: String // 文件校验和
    },
    sandboxed: {
      type: Boolean,
      default: true
    },
    trustedSource: {
      type: Boolean,
      default: false
    }
  },

  // 元数据
  metadata: {
    keywords: [String],
    homepage: String,
    bugReports: String,
    documentation: String,
    size: Number,
    files: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 虚拟字段
pluginSchema.virtual('isActive').get(function() {
  return this.status.state === 'enabled';
});

pluginSchema.virtual('uptime').get(function() {
  if (this.status.lastStarted && this.status.state === 'enabled') {
    return Date.now() - this.status.lastStarted.getTime();
  }
  return 0;
});

pluginSchema.virtual('fullName').get(function() {
  return `${this.name}@${this.version}`;
});

// 索引
pluginSchema.index({ id: 1 });
pluginSchema.index({ category: 1 });
pluginSchema.index({ type: 1 });
pluginSchema.index({ 'status.state': 1 });
pluginSchema.index({ 'marketplace.rating.average': -1 });
pluginSchema.index({ 'marketplace.downloads': -1 });
pluginSchema.index({ 'installation.installDate': -1 });

// 实例方法
pluginSchema.methods.enable = function() {
  this.status.state = 'enabled';
  this.status.lastStarted = new Date();
  this.stats.activations += 1;
  return this.save();
};

pluginSchema.methods.disable = function() {
  this.status.state = 'disabled';
  this.status.lastStopped = new Date();
  return this.save();
};

pluginSchema.methods.recordError = function(error) {
  this.status.state = 'error';
  this.status.errorMessage = error.message;
  this.status.crashCount += 1;
  this.stats.errorCount += 1;
  return this.save();
};

pluginSchema.methods.recordExecution = function(executionTime) {
  this.stats.executionCount += 1;
  this.stats.lastExecution = new Date();
  
  // 计算平均执行时间
  const totalTime = this.stats.averageExecutionTime * (this.stats.executionCount - 1) + executionTime;
  this.stats.averageExecutionTime = totalTime / this.stats.executionCount;
  
  return this.save();
};

pluginSchema.methods.addReview = function(userId, rating, comment) {
  this.marketplace.reviews.push({
    userId,
    rating,
    comment,
    date: new Date()
  });
  
  // 重新计算平均评分
  const totalRating = this.marketplace.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.marketplace.rating.average = totalRating / this.marketplace.reviews.length;
  this.marketplace.rating.count = this.marketplace.reviews.length;
  
  return this.save();
};

// 静态方法
pluginSchema.statics.findByCategory = function(category) {
  return this.find({ category });
};

pluginSchema.statics.findEnabled = function() {
  return this.find({ 'status.state': 'enabled' });
};

pluginSchema.statics.findPopular = function(limit = 10) {
  return this.find()
    .sort({ 'marketplace.downloads': -1, 'marketplace.rating.average': -1 })
    .limit(limit);
};

pluginSchema.statics.search = function(query) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { name: searchRegex },
      { displayName: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } },
      { 'metadata.keywords': { $in: [searchRegex] } }
    ]
  });
};

// 中间件
pluginSchema.pre('save', function(next) {
  // 更新时间戳
  this.updatedAt = new Date();
  
  // 验证依赖格式
  if (this.dependencies) {
    for (const dep of this.dependencies) {
      if (!dep.id || !dep.version) {
        return next(new Error('依赖信息不完整'));
      }
    }
  }
  
  next();
});

pluginSchema.pre('remove', function(next) {
  // 检查是否有其他插件依赖此插件
  this.constructor.find({
    'dependencies.id': this.id
  }, (err, dependentPlugins) => {
    if (err) return next(err);
    
    if (dependentPlugins.length > 0) {
      const names = dependentPlugins.map(p => p.name).join(', ');
      return next(new Error(`无法删除插件，以下插件依赖此插件: ${names}`));
    }
    
    next();
  });
});

module.exports = mongoose.model('Plugin', pluginSchema);