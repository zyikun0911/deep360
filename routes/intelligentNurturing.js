/**
 * 智能自养号系统 API 路由
 */

const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Joi = require('joi');

const router = express.Router();

// 验证模式
const createNurturingProfileSchema = Joi.object({
  accountId: Joi.string().required(),
  platform: Joi.string().valid('whatsapp', 'telegram', 'wechat', 'signal').required(),
  configuration: Joi.object({
    targetPersona: Joi.string().valid(
      'business_professional',
      'young_entrepreneur', 
      'experienced_consultant',
      'tech_enthusiast',
      'creative_professional',
      'sales_expert',
      'customer_service',
      'industry_specialist'
    ).required(),
    nurturingGoal: Joi.string().valid(
      'high_trust',
      'fast_growth', 
      'stable_development',
      'risk_minimal',
      'engagement_focused'
    ).required(),
    timeframe: Joi.string().valid(
      '7_days',
      '15_days',
      '30_days',
      '60_days',
      '90_days',
      'ongoing'
    ).required(),
    riskTolerance: Joi.string().valid(
      'very_conservative',
      'conservative',
      'moderate',
      'aggressive',
      'very_aggressive'
    ).required(),
    geographicRegion: Joi.string().required()
  }).required(),
  customBehaviors: Joi.array().items(Joi.string()).default([])
});

const updateStrategySchema = Joi.object({
  adaptations: Joi.array().items(Joi.object({
    type: Joi.string().required(),
    parameters: Joi.object().required(),
    reason: Joi.string().required()
  })).required(),
  reason: Joi.string().required()
});

const executeTaskSchema = Joi.object({
  taskType: Joi.string().valid(
    'send_message',
    'social_interaction',
    'content_creation',
    'profile_update',
    'network_expansion'
  ).required(),
  context: Joi.object().default({}),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  scheduledFor: Joi.date().optional()
});

// 创建智能养号档案
router.post('/profiles',
  authMiddleware,
  requirePermission('nurturing_create'),
  validateRequest(createNurturingProfileSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId, platform, configuration, customBehaviors } = req.body;

      // 检查账号是否已存在养号档案
      const existingProfile = await services.intelligentNurturingService.getProfile(accountId);
      if (existingProfile) {
        return res.status(409).json({
          success: false,
          message: '该账号已存在养号档案',
          data: { accountId, existing: true }
        });
      }

      // 创建智能养号档案
      const profile = await services.intelligentNurturingService.createNurturingProfile(accountId, {
        platform,
        ...configuration,
        customBehaviors
      });

      // 记录创建日志
      await services.businessLogger.info('智能养号档案创建', {
        accountId,
        platform,
        targetPersona: configuration.targetPersona,
        nurturingGoal: configuration.nurturingGoal,
        userId: req.user.userId
      });

      res.status(201).json({
        success: true,
        message: '智能养号档案创建成功',
        data: {
          profileId: profile.accountId,
          configuration: profile.configuration,
          strategy: {
            name: profile.strategy.name,
            phases: profile.strategy.phases.length,
            totalDuration: profile.strategy.totalDuration,
            riskLevel: profile.strategy.riskLevel
          },
          behaviorModel: {
            personality: profile.behaviorModel.basePersonality,
            adaptiveLearning: profile.behaviorModel.adaptiveLearning.enabled
          },
          nextSteps: [
            '养号策略已制定完成',
            '行为模型已建立',
            '开始执行养号任务',
            '实时监控和优化'
          ]
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('创建智能养号档案失败:', error);
      res.status(500).json({
        success: false,
        message: '创建智能养号档案失败',
        error: error.message
      });
    }
  }
);

// 获取养号档案详情
router.get('/profiles/:accountId',
  authMiddleware,
  requirePermission('nurturing_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId } = req.params;

      const profile = await services.intelligentNurturingService.getProfile(accountId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: '养号档案不存在'
        });
      }

      // 获取实时性能指标
      const currentMetrics = await services.intelligentNurturingService.getCurrentMetrics(accountId);

      // 获取风险评估
      const riskAssessment = await services.intelligentNurturingService.getRiskAssessment(accountId);

      // 获取AI洞察
      const aiInsights = await services.intelligentNurturingService.getAIInsights(accountId);

      res.json({
        success: true,
        data: {
          profile: {
            accountId: profile.accountId,
            platform: profile.platform,
            configuration: profile.configuration,
            status: profile.status,
            progress: profile.progress,
            createdAt: profile.createdAt,
            lastUpdated: profile.lastUpdated
          },
          strategy: {
            name: profile.strategy.name,
            description: profile.strategy.description,
            currentPhase: profile.progress.phase,
            phases: profile.strategy.phases,
            kpis: profile.strategy.kpis
          },
          metrics: currentMetrics,
          riskAssessment,
          aiInsights,
          recommendations: await services.intelligentNurturingService.getRecommendations(accountId)
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取养号档案失败:', error);
      res.status(500).json({
        success: false,
        message: '获取养号档案失败',
        error: error.message
      });
    }
  }
);

// 执行养号任务
router.post('/profiles/:accountId/tasks',
  authMiddleware,
  requirePermission('nurturing_execute'),
  validateRequest(executeTaskSchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId } = req.params;
      const { taskType, context, priority, scheduledFor } = req.body;

      // 验证档案存在
      const profile = await services.intelligentNurturingService.getProfile(accountId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: '养号档案不存在'
        });
      }

      // 风险检查
      const riskCheck = await services.intelligentNurturingService.checkTaskRisk(accountId, taskType, context);
      if (riskCheck.blocked) {
        return res.status(403).json({
          success: false,
          message: '任务被风险控制阻止',
          data: {
            riskLevel: riskCheck.riskLevel,
            reason: riskCheck.reason,
            suggestions: riskCheck.suggestions
          }
        });
      }

      // 执行任务
      const taskResult = await services.intelligentNurturingService.executeNurturingTask(accountId, taskType, {
        ...context,
        priority,
        scheduledFor,
        userId: req.user.userId
      });

      // 记录任务执行
      await services.businessLogger.info('养号任务执行', {
        accountId,
        taskType,
        success: taskResult.success,
        duration: taskResult.duration,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '养号任务执行完成',
        data: {
          taskResult,
          updatedMetrics: await services.intelligentNurturingService.getCurrentMetrics(accountId),
          nextRecommendations: await services.intelligentNurturingService.getNextActions(accountId)
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('执行养号任务失败:', error);
      res.status(500).json({
        success: false,
        message: '执行养号任务失败',
        error: error.message
      });
    }
  }
);

// 自适应策略调整
router.post('/profiles/:accountId/adapt',
  authMiddleware,
  requirePermission('nurturing_manage'),
  validateRequest(updateStrategySchema),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId } = req.params;
      const { adaptations, reason } = req.body;

      // 获取当前风险评估
      const riskAssessment = await services.intelligentNurturingService.getRiskAssessment(accountId);

      // 执行自适应调整
      const adaptationResult = await services.adaptiveNurturingEngine.adaptStrategy(accountId, {
        riskAssessment,
        requestedAdaptations: adaptations,
        reason,
        userId: req.user.userId
      });

      // 记录策略调整
      await services.businessLogger.info('策略自适应调整', {
        accountId,
        reason,
        adaptations: adaptationResult.adaptations.summary,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: '策略自适应调整完成',
        data: {
          adaptationResult,
          newStrategy: adaptationResult.updatedStrategy,
          performanceImpact: adaptationResult.expectedImpact,
          monitoring: {
            checkpoints: adaptationResult.monitoringPlan,
            nextReview: adaptationResult.nextReviewTime
          }
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('策略自适应调整失败:', error);
      res.status(500).json({
        success: false,
        message: '策略自适应调整失败',
        error: error.message
      });
    }
  }
);

// 获取AI洞察和建议
router.get('/profiles/:accountId/insights',
  authMiddleware,
  requirePermission('nurturing_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { accountId } = req.params;

      // 生成实时AI洞察
      const insights = await services.intelligentNurturingService.generateAIInsights(accountId);

      // 获取优化建议
      const optimizations = await services.adaptiveNurturingEngine.generateOptimizationSuggestions(accountId);

      // 预测分析
      const predictions = await services.intelligentNurturingService.generatePredictions(accountId);

      res.json({
        success: true,
        data: {
          insights: {
            current: insights.current,
            trends: insights.trends,
            patterns: insights.patterns
          },
          optimizations: {
            immediate: optimizations.immediate,
            shortTerm: optimizations.shortTerm,
            longTerm: optimizations.longTerm
          },
          predictions: {
            performance: predictions.performance,
            risks: predictions.risks,
            opportunities: predictions.opportunities
          },
          actionItems: insights.actionItems,
          confidence: insights.confidence
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取AI洞察失败:', error);
      res.status(500).json({
        success: false,
        message: '获取AI洞察失败',
        error: error.message
      });
    }
  }
);

// 批量操作养号档案
router.post('/profiles/batch',
  authMiddleware,
  requirePermission('nurturing_manage'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { action, accountIds, parameters = {} } = req.body;

      if (!['start', 'pause', 'resume', 'optimize', 'reset'].includes(action)) {
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
        successful: [],
        failed: [],
        details: []
      };

      // 批量处理
      for (const accountId of accountIds) {
        try {
          let result;

          switch (action) {
            case 'start':
              result = await services.intelligentNurturingService.startNurturing(accountId);
              break;
            case 'pause':
              result = await services.intelligentNurturingService.pauseNurturing(accountId);
              break;
            case 'resume':
              result = await services.intelligentNurturingService.resumeNurturing(accountId);
              break;
            case 'optimize':
              result = await services.adaptiveNurturingEngine.optimizeStrategy(accountId, parameters);
              break;
            case 'reset':
              result = await services.intelligentNurturingService.resetNurturing(accountId, parameters);
              break;
          }

          results.successful.push(accountId);
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

      // 记录批量操作
      await services.businessLogger.info('批量养号操作', {
        action,
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        userId: req.user.userId
      });

      res.json({
        success: true,
        message: `批量${action}操作完成`,
        data: results
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('批量养号操作失败:', error);
      res.status(500).json({
        success: false,
        message: '批量养号操作失败',
        error: error.message
      });
    }
  }
);

// 获取全局养号统计
router.get('/stats/global',
  authMiddleware,
  requirePermission('nurturing_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;

      // 获取养号统计
      const nurturingStats = await services.intelligentNurturingService.getNurturingStats();

      // 获取自适应引擎统计
      const adaptiveStats = await services.adaptiveNurturingEngine.getAdaptiveEngineStats();

      // 获取性能趋势
      const performanceTrends = await services.intelligentNurturingService.getPerformanceTrends();

      // 获取风险分析
      const riskAnalysis = await services.intelligentNurturingService.getGlobalRiskAnalysis();

      res.json({
        success: true,
        data: {
          overview: {
            totalProfiles: nurturingStats.totalProfiles,
            activeProfiles: nurturingStats.activeProfiles,
            successRate: nurturingStats.successRate,
            averagePerformance: nurturingStats.avgTrustScore
          },
          distribution: {
            platforms: nurturingStats.platformDistribution,
            personas: nurturingStats.personaDistribution,
            phases: nurturingStats.phaseDistribution,
            risks: nurturingStats.riskDistribution
          },
          performance: {
            metrics: nurturingStats.performanceMetrics,
            trends: performanceTrends,
            benchmarks: {
              industry: performanceTrends.industryBenchmark,
              internal: performanceTrends.internalBenchmark
            }
          },
          ai: {
            insights: nurturingStats.aiInsights,
            adaptive: adaptiveStats,
            learningEffectiveness: adaptiveStats.learningModels.accuracy
          },
          risk: riskAnalysis,
          recommendations: await services.intelligentNurturingService.getGlobalRecommendations()
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取全局养号统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取全局养号统计失败',
        error: error.message
      });
    }
  }
);

// 智能内容生成
router.post('/content/generate',
  authMiddleware,
  requirePermission('nurturing_execute'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const {
        accountId,
        contentType,
        context,
        requirements = {}
      } = req.body;

      // 获取账号档案
      const profile = await services.intelligentNurturingService.getProfile(accountId);
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: '养号档案不存在'
        });
      }

      // 生成个性化内容
      const content = await services.intelligentNurturingService.generatePersonalizedContent(accountId, {
        contentType,
        context,
        requirements,
        persona: profile.configuration.targetPersona
      });

      res.json({
        success: true,
        message: '智能内容生成完成',
        data: {
          content: content.text,
          metadata: {
            contentType,
            persona: profile.configuration.targetPersona,
            quality: content.quality,
            sentiment: content.sentiment,
            readability: content.readability
          },
          alternatives: content.alternatives,
          suggestions: content.optimizationSuggestions
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('智能内容生成失败:', error);
      res.status(500).json({
        success: false,
        message: '智能内容生成失败',
        error: error.message
      });
    }
  }
);

// 实时风险监控
router.get('/monitoring/risks',
  authMiddleware,
  requirePermission('nurturing_read'),
  async (req, res) => {
    try {
      const { services } = req.app.locals;

      // 获取实时风险状态
      const riskMonitoring = await services.intelligentNurturingService.getRealTimeRiskMonitoring();

      res.json({
        success: true,
        data: {
          overview: {
            totalAccounts: riskMonitoring.totalAccounts,
            riskLevels: riskMonitoring.riskDistribution,
            activeAlerts: riskMonitoring.activeAlerts,
            lastUpdate: riskMonitoring.lastUpdate
          },
          alerts: riskMonitoring.alerts.map(alert => ({
            accountId: alert.accountId,
            riskLevel: alert.riskLevel,
            type: alert.type,
            description: alert.description,
            recommendations: alert.recommendations,
            triggeredAt: alert.triggeredAt
          })),
          trends: riskMonitoring.trends,
          predictions: riskMonitoring.predictions
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('获取风险监控数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取风险监控数据失败',
        error: error.message
      });
    }
  }
);

module.exports = router;