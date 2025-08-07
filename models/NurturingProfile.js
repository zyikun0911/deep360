/**
 * 养号档案数据模型
 */

const mongoose = require('mongoose');

const nurturingProfileSchema = new mongoose.Schema({
  accountId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  platform: {
    type: String,
    required: true,
    enum: ['whatsapp', 'telegram', 'wechat', 'signal'],
    index: true
  },

  // 基础配置
  configuration: {
    targetPersona: {
      type: String,
      required: true,
      enum: [
        'business_professional',
        'young_entrepreneur', 
        'experienced_consultant',
        'tech_enthusiast',
        'creative_professional',
        'sales_expert',
        'customer_service',
        'industry_specialist'
      ]
    },
    nurturingGoal: {
      type: String,
      required: true,
      enum: ['high_trust', 'fast_growth', 'stable_development', 'risk_minimal', 'engagement_focused']
    },
    timeframe: {
      type: String,
      required: true,
      enum: ['7_days', '15_days', '30_days', '60_days', '90_days', 'ongoing']
    },
    riskTolerance: {
      type: String,
      required: true,
      enum: ['very_conservative', 'conservative', 'moderate', 'aggressive', 'very_aggressive']
    },
    geographicRegion: {
      type: String,
      required: true
    }
  },

  // AI生成的个性化策略
  strategy: {
    id: String,
    name: String,
    description: String,
    version: String,
    totalDuration: Number, // 毫秒
    
    phases: [{
      phase: Number,
      name: String,
      duration: Number,
      description: String,
      actions: [String],
      targets: {
        trustScore: Number,
        engagementRate: Number,
        socialConnections: Number,
        riskLevel: String
      },
      riskLevel: String,
      completedAt: Date
    }],

    behaviorPatterns: {
      personality: {
        openness: Number,        // 0-1
        conscientiousness: Number, // 0-1
        extraversion: Number,    // 0-1
        agreeableness: Number,   // 0-1
        neuroticism: Number      // 0-1
      },
      communication: {
        formality: Number,       // 0-1
        enthusiasm: Number,      // 0-1
        responsiveness: Number,  // 0-1
        proactivity: Number      // 0-1
      },
      activity: {
        frequency: String,       // 'low', 'medium', 'high'
        consistency: Number,     // 0-1
        peakHours: [Number],     // 0-23
        restDays: [Number]       // 0-6 (Sunday=0)
      }
    },

    contentTemplates: {
      greetings: [String],
      responses: [String],
      initiations: [String],
      farewells: [String],
      topicStarters: [String],
      reactions: [String]
    },

    socialStrategies: {
      connectionApproach: String,
      interactionStyle: String,
      groupParticipation: String,
      networkExpansion: String
    },

    riskMitigation: {
      safetyMechanisms: [String],
      alertThresholds: {
        activityFrequency: Number,
        responseTime: Number,
        contentSimilarity: Number,
        riskScore: Number
      },
      emergencyActions: [String]
    },

    adaptiveRules: [{
      trigger: String,
      condition: String,
      action: String,
      priority: Number
    }],

    kpis: [{
      metric: String,
      target: Number,
      weight: Number,
      current: Number
    }]
  },

  // 行为模型
  behaviorModel: {
    modelType: String,
    version: String,
    
    activityPatterns: {
      daily: {
        wakeTime: Number,        // 小时
        sleepTime: Number,       // 小时
        activeHours: [Number],   // 活跃时段
        breakTimes: [{
          start: Number,
          duration: Number,
          type: String
        }],
        peakActivity: Number     // 小时
      },
      
      weekly: {
        workDays: [Number],      // 工作日
        weekendBehavior: String, // 'similar', 'reduced', 'different'
        intensityByDay: [Number] // 每天强度 0-1
      },
      
      monthly: {
        cyclicPatterns: [String],
        seasonalAdjustments: Boolean,
        holidayBehavior: String
      }
    },

    communicationStyle: {
      responseTime: {
        min: Number,             // 秒
        max: Number,             // 秒
        distribution: String     // 'normal', 'exponential', 'uniform'
      },
      
      messageLength: {
        short: { min: Number, max: Number, probability: Number },
        medium: { min: Number, max: Number, probability: Number },
        long: { min: Number, max: Number, probability: Number }
      },
      
      emoji: {
        usage: Number,           // 0-1 使用频率
        variety: Number,         // 0-1 多样性
        contextSensitivity: Number // 0-1 上下文敏感度
      },
      
      language: {
        formality: Number,       // 0-1
        complexity: Number,      // 0-1
        vocabulary: [String],    // 偏好词汇
        phrases: [String],       // 常用短语
        typoRate: Number,        // 0-1 打字错误率
        correctionRate: Number   // 0-1 纠错率
      },
      
      sentiment: {
        baseline: Number,        // -1 to 1
        volatility: Number,      // 0-1
        triggers: [{
          topic: String,
          sentimentShift: Number
        }]
      }
    },

    socialBehavior: {
      connectionStrategy: {
        approach: String,        // 'conservative', 'moderate', 'aggressive'
        criteria: [String],      // 连接标准
        acceptanceRate: Number,  // 0-1
        initiationRate: Number   // 0-1
      },
      
      interactionFrequency: {
        dailyInteractions: { min: Number, max: Number },
        responseRate: Number,    // 0-1
        initiationRate: Number,  // 0-1
        groupActivity: Number    // 0-1
      },
      
      groupParticipation: {
        joinRate: Number,        // 0-1
        activityLevel: Number,   // 0-1
        leadershipTendency: Number, // 0-1
        contentContribution: Number // 0-1
      },
      
      contentSharing: {
        originalContent: Number, // 0-1
        sharedContent: Number,   // 0-1
        commentFrequency: Number, // 0-1
        reactionFrequency: Number // 0-1
      }
    },

    adaptiveLearning: {
      enabled: Boolean,
      learningRate: Number,
      explorationRate: Number,
      memoryWindow: Number,
      feedbackWeight: Number,
      modelUpdates: [{
        timestamp: Date,
        trigger: String,
        changes: String,
        performance: Number
      }]
    },

    riskAwareness: {
      sensitivityLevel: String,
      
      alertThresholds: {
        activitySpike: Number,
        unusualTiming: Number,
        contentSimilarity: Number,
        networkAnomalies: Number
      },
      
      safetyMechanisms: {
        autoBackoff: Boolean,
        emergencyStop: Boolean,
        adaptiveDelay: Boolean,
        riskEscalation: Boolean
      },
      
      historicalRiskEvents: [{
        timestamp: Date,
        type: String,
        severity: String,
        response: String,
        outcome: String
      }]
    }
  },

  // 社交互动计划
  socialPlan: {
    networkExpansion: {
      targetConnections: Number,
      connectionRate: Number,      // 每天
      qualityCriteria: [String],
      geographicFocus: [String],
      industryFocus: [String]
    },
    
    engagementStrategy: {
      contentEngagement: Number,   // 0-1
      conversationInitiation: Number, // 0-1
      groupParticipation: Number,  // 0-1
      eventParticipation: Number   // 0-1
    },
    
    relationshipBuilding: {
      approachStyle: String,
      trustBuildingTactics: [String],
      valueProposition: String,
      followUpStrategy: String
    }
  },

  // 内容生成引擎
  contentEngine: {
    models: {
      casual_chat: {
        type: String,
        model: String,
        temperature: Number,
        maxTokens: Number,
        prompt: String
      },
      business_content: {
        type: String,
        model: String,
        temperature: Number,
        maxTokens: Number,
        prompt: String
      },
      social_posts: {
        type: String,
        model: String,
        temperature: Number,
        maxTokens: Number,
        prompt: String
      }
    },
    
    personalization: {
      vocabulary: [String],
      topics: [String],
      style: String,
      constraints: [String]
    },
    
    qualityControl: {
      enabled: Boolean,
      filters: [String],
      thresholds: {
        minQuality: Number,
        maxRepetition: Number,
        appropriateness: Number
      }
    }
  },

  // 当前状态和进度
  status: {
    type: String,
    enum: ['planning', 'active', 'paused', 'completed', 'failed', 'archived'],
    default: 'planning'
  },

  progress: {
    currentPhase: {
      type: Number,
      default: 1
    },
    phaseCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    overallCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    
    milestones: [{
      name: String,
      description: String,
      targetDate: Date,
      completedDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped']
      }
    }],
    
    nextActions: [{
      action: String,
      priority: Number,
      scheduledFor: Date,
      estimatedDuration: Number
    }],
    
    blockers: [{
      type: String,
      description: String,
      severity: String,
      reportedAt: Date,
      resolvedAt: Date
    }]
  },

  // 性能指标
  metrics: {
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    engagementRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    riskLevel: {
      type: String,
      enum: ['very_low', 'low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    socialConnections: {
      type: Number,
      default: 0
    },
    contentQuality: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    activityConsistency: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    
    historicalMetrics: [{
      timestamp: Date,
      trustScore: Number,
      engagementRate: Number,
      riskLevel: String,
      socialConnections: Number,
      contentQuality: Number
    }]
  },

  // AI洞察和建议
  aiInsights: {
    behaviorPredictions: [{
      type: String,
      prediction: String,
      confidence: Number,
      timeframe: String,
      impact: String,
      generatedAt: Date
    }],
    
    riskAlerts: [{
      type: String,
      severity: String,
      description: String,
      recommendation: String,
      triggeredAt: Date,
      resolvedAt: Date
    }],
    
    optimizationSuggestions: [{
      category: String,
      suggestion: String,
      expectedImpact: Number,
      implementationComplexity: String,
      priority: Number,
      generatedAt: Date,
      implementedAt: Date
    }],
    
    performanceAnalysis: {
      strengths: [String],
      weaknesses: [String],
      opportunities: [String],
      threats: [String],
      lastAnalysisAt: Date
    }
  },

  // 适应性学习历史
  adaptationHistory: [{
    timestamp: Date,
    trigger: String,
    reason: String,
    changes: {
      strategy: String,
      behavior: String,
      parameters: String
    },
    performance: {
      before: Number,
      after: Number,
      improvement: Number
    },
    success: Boolean
  }],

  // 执行历史
  executionHistory: [{
    timestamp: Date,
    action: String,
    parameters: mongoose.Schema.Types.Mixed,
    result: {
      success: Boolean,
      outcome: String,
      metrics: mongoose.Schema.Types.Mixed,
      duration: Number
    },
    context: mongoose.Schema.Types.Mixed
  }],

  // 学习数据
  learningData: {
    experiences: [{
      state: mongoose.Schema.Types.Mixed,
      action: mongoose.Schema.Types.Mixed,
      reward: Number,
      nextState: mongoose.Schema.Types.Mixed,
      done: Boolean,
      timestamp: Date
    }],
    
    modelPerformance: {
      accuracy: Number,
      precision: Number,
      recall: Number,
      f1Score: Number,
      lastEvaluatedAt: Date
    },
    
    knowledgeBase: {
      successPatterns: [mongoose.Schema.Types.Mixed],
      failurePatterns: [mongoose.Schema.Types.Mixed],
      bestPractices: [String],
      lessonsLearned: [String]
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 索引
nurturingProfileSchema.index({ accountId: 1 });
nurturingProfileSchema.index({ platform: 1 });
nurturingProfileSchema.index({ status: 1 });
nurturingProfileSchema.index({ 'configuration.targetPersona': 1 });
nurturingProfileSchema.index({ 'configuration.nurturingGoal': 1 });
nurturingProfileSchema.index({ 'metrics.trustScore': 1 });
nurturingProfileSchema.index({ 'metrics.riskLevel': 1 });
nurturingProfileSchema.index({ createdAt: 1 });
nurturingProfileSchema.index({ updatedAt: 1 });

// 虚拟字段
nurturingProfileSchema.virtual('successRate').get(function() {
  if (this.executionHistory.length === 0) return 0;
  const successful = this.executionHistory.filter(h => h.result.success).length;
  return successful / this.executionHistory.length;
});

nurturingProfileSchema.virtual('averagePerformance').get(function() {
  const metrics = this.metrics;
  return (metrics.trustScore + metrics.engagementRate + metrics.contentQuality) / 3;
});

nurturingProfileSchema.virtual('timeToCompletion').get(function() {
  if (this.status === 'completed') {
    return this.updatedAt - this.createdAt;
  }
  return null;
});

// 实例方法
nurturingProfileSchema.methods.updateMetrics = function(newMetrics) {
  // 保存历史记录
  this.metrics.historicalMetrics.push({
    timestamp: new Date(),
    trustScore: this.metrics.trustScore,
    engagementRate: this.metrics.engagementRate,
    riskLevel: this.metrics.riskLevel,
    socialConnections: this.metrics.socialConnections,
    contentQuality: this.metrics.contentQuality
  });

  // 更新当前指标
  Object.assign(this.metrics, newMetrics);
  
  // 限制历史记录长度
  if (this.metrics.historicalMetrics.length > 1000) {
    this.metrics.historicalMetrics = this.metrics.historicalMetrics.slice(-1000);
  }
};

nurturingProfileSchema.methods.addExperience = function(experience) {
  this.learningData.experiences.push({
    ...experience,
    timestamp: new Date()
  });

  // 限制经验数据长度
  if (this.learningData.experiences.length > 10000) {
    this.learningData.experiences = this.learningData.experiences.slice(-10000);
  }
};

nurturingProfileSchema.methods.recordAdaptation = function(adaptation) {
  this.adaptationHistory.push({
    ...adaptation,
    timestamp: new Date()
  });

  // 限制适应历史长度
  if (this.adaptationHistory.length > 500) {
    this.adaptationHistory = this.adaptationHistory.slice(-500);
  }
};

nurturingProfileSchema.methods.calculateRiskScore = function() {
  const weights = {
    activityFrequency: 0.3,
    behaviorConsistency: 0.25,
    contentQuality: 0.2,
    socialPattern: 0.15,
    networkSecurity: 0.1
  };

  // 这里应该实现具体的风险计算逻辑
  // 基于当前指标和历史数据计算综合风险分数
  
  return 0.1; // 占位符
};

// 静态方法
nurturingProfileSchema.statics.findByPersona = function(persona) {
  return this.find({ 'configuration.targetPersona': persona });
};

nurturingProfileSchema.statics.findHighPerformance = function(threshold = 0.8) {
  return this.find({
    $expr: {
      $gt: [
        { $avg: ['$metrics.trustScore', '$metrics.engagementRate', '$metrics.contentQuality'] },
        threshold
      ]
    }
  });
};

nurturingProfileSchema.statics.findRiskyAccounts = function() {
  return this.find({
    'metrics.riskLevel': { $in: ['high', 'critical'] }
  });
};

module.exports = mongoose.model('NurturingProfile', nurturingProfileSchema);