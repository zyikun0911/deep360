const WhatsAppService = require('./whatsappService');

class WhatsAppExtensions extends WhatsAppService {
  constructor(accountManager, socketService, logger) {
    super(accountManager, socketService, logger);
    this.messageTemplates = new Map();
    this.conversationStates = new Map();
    this.userProfiles = new Map();
  }

  /**
   * 消息模板系统
   */
  async createMessageTemplate(templateData) {
    const template = {
      id: templateData.id,
      name: templateData.name,
      category: templateData.category, // marketing, transactional, otp
      language: templateData.language,
      content: templateData.content,
      variables: templateData.variables || [],
      buttons: templateData.buttons || [],
      status: 'pending_approval',
      createdAt: new Date()
    };

    this.messageTemplates.set(template.id, template);
    this.logger.info(`消息模板已创建: ${template.name}`);
    
    return template;
  }

  async sendTemplateMessage(accountId, to, templateId, variables = {}) {
    try {
      const template = this.messageTemplates.get(templateId);
      if (!template) {
        throw new Error(`模板不存在: ${templateId}`);
      }

      let content = template.content;
      
      // 替换变量
      template.variables.forEach(variable => {
        const value = variables[variable] || '';
        content = content.replace(new RegExp(`{{${variable}}}`, 'g'), value);
      });

      // 构建富媒体消息
      const messageOptions = {
        text: content,
        buttons: template.buttons,
        templateId: templateId
      };

      const message = await this.sendMessage(accountId, to, content, messageOptions);
      
      // 记录模板使用统计
      await this.updateTemplateStats(templateId);
      
      return message;
    } catch (error) {
      this.logger.error(`模板消息发送失败: ${templateId}`, error);
      throw error;
    }
  }

  /**
   * 智能对话管理
   */
  async handleIntelligentConversation(accountId, message) {
    try {
      const userId = message.from;
      const conversationState = this.conversationStates.get(userId) || {
        stage: 'initial',
        context: {},
        lastInteraction: new Date()
      };

      // 自然语言理解
      const nluResult = await this.processNLU(message.body);
      
      // 更新用户画像
      await this.updateUserProfile(userId, message, nluResult);
      
      // 确定响应策略
      const responseStrategy = await this.determineResponseStrategy(
        conversationState, 
        nluResult
      );

      // 生成智能回复
      const response = await this.generateIntelligentResponse(
        accountId,
        responseStrategy,
        conversationState,
        nluResult
      );

      // 更新对话状态
      conversationState.stage = responseStrategy.nextStage;
      conversationState.context = { ...conversationState.context, ...nluResult };
      conversationState.lastInteraction = new Date();
      this.conversationStates.set(userId, conversationState);

      return response;
    } catch (error) {
      this.logger.error(`智能对话处理失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 自然语言理解
   */
  async processNLU(text) {
    // 意图识别
    const intent = await this.recognizeIntent(text);
    
    // 实体提取
    const entities = await this.extractEntities(text);
    
    // 情感分析
    const sentiment = await this.analyzeSentiment(text);
    
    // 语言检测
    const language = await this.detectLanguage(text);

    return {
      intent,
      entities,
      sentiment,
      language,
      originalText: text,
      confidence: intent.confidence
    };
  }

  async recognizeIntent(text) {
    // 简化的意图识别逻辑
    const intents = {
      greeting: ['你好', 'hello', 'hi', '早上好', '下午好'],
      inquiry: ['价格', 'price', '多少钱', '费用', '成本'],
      complaint: ['投诉', '问题', '不满意', '错误', '故障'],
      purchase: ['购买', '下单', '买', 'buy', 'order'],
      support: ['帮助', 'help', '支持', '客服', '联系']
    };

    const lowerText = text.toLowerCase();
    
    for (const [intent, keywords] of Object.entries(intents)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return {
            name: intent,
            confidence: 0.85,
            matchedKeyword: keyword
          };
        }
      }
    }

    return {
      name: 'unknown',
      confidence: 0.3,
      matchedKeyword: null
    };
  }

  async extractEntities(text) {
    const entities = [];
    
    // 提取电话号码
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex);
    if (phones) {
      phones.forEach(phone => {
        entities.push({ type: 'phone', value: phone });
      });
    }

    // 提取邮箱
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails) {
      emails.forEach(email => {
        entities.push({ type: 'email', value: email });
      });
    }

    // 提取金额
    const amountRegex = /\$?\d+(?:,\d{3})*(?:\.\d{2})?/g;
    const amounts = text.match(amountRegex);
    if (amounts) {
      amounts.forEach(amount => {
        entities.push({ type: 'amount', value: amount });
      });
    }

    return entities;
  }

  /**
   * 群组智能管理
   */
  async initSmartGroupManagement(accountId, groupId) {
    const groupConfig = {
      autoWelcome: true,
      spamDetection: true,
      activityMonitoring: true,
      autoModeration: true,
      memberLimits: {
        maxDailyMessages: 50,
        maxMediaSize: 16 * 1024 * 1024 // 16MB
      }
    };

    await this.setupGroupRules(accountId, groupId, groupConfig);
    await this.enableGroupAnalytics(accountId, groupId);
    
    this.logger.info(`群组智能管理已启用: ${groupId}`);
  }

  async handleNewGroupMember(accountId, groupId, newMember) {
    try {
      // 发送欢迎消息
      const welcomeMessage = await this.generateWelcomeMessage(groupId, newMember);
      await this.sendMessage(accountId, groupId, welcomeMessage);

      // 发送群规
      const groupRules = await this.getGroupRules(groupId);
      if (groupRules) {
        await this.sendMessage(accountId, newMember.id, groupRules);
      }

      // 记录成员加入事件
      await this.logGroupEvent(groupId, 'member_joined', {
        memberId: newMember.id,
        memberName: newMember.name,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error(`处理新群成员失败: ${groupId}`, error);
    }
  }

  async detectSpamMessage(message) {
    const spamIndicators = [
      { pattern: /http[s]?:\/\/(?!.*whatsapp)/gi, score: 0.7 },
      { pattern: /免费|free|优惠|discount/gi, score: 0.3 },
      { pattern: /紧急|urgent|立即|immediately/gi, score: 0.4 },
      { pattern: /\d{11,}/g, score: 0.5 }, // 长数字串
    ];

    let spamScore = 0;
    const triggers = [];

    spamIndicators.forEach(indicator => {
      if (indicator.pattern.test(message.body)) {
        spamScore += indicator.score;
        triggers.push(indicator.pattern.toString());
      }
    });

    return {
      isSpam: spamScore > 0.6,
      confidence: spamScore,
      triggers
    };
  }

  /**
   * 用户画像构建
   */
  async updateUserProfile(userId, message, nluResult) {
    let profile = this.userProfiles.get(userId) || {
      id: userId,
      name: message.contact?.name || 'Unknown',
      interactions: 0,
      lastContact: null,
      preferences: {},
      behavior: {},
      segments: [],
      createdAt: new Date()
    };

    // 更新基本信息
    profile.interactions += 1;
    profile.lastContact = new Date();

    // 分析行为模式
    if (nluResult.intent.name === 'purchase') {
      profile.behavior.purchaseIntent = (profile.behavior.purchaseIntent || 0) + 1;
    }

    if (nluResult.sentiment.label === 'positive') {
      profile.behavior.positiveInteractions = (profile.behavior.positiveInteractions || 0) + 1;
    }

    // 更新偏好
    if (nluResult.language !== 'unknown') {
      profile.preferences.language = nluResult.language;
    }

    // 计算用户分群
    profile.segments = await this.calculateUserSegments(profile);

    this.userProfiles.set(userId, profile);
    return profile;
  }

  async calculateUserSegments(profile) {
    const segments = [];

    // 活跃度分群
    if (profile.interactions > 50) {
      segments.push('high_engagement');
    } else if (profile.interactions > 10) {
      segments.push('medium_engagement');
    } else {
      segments.push('low_engagement');
    }

    // 购买意向分群
    if (profile.behavior.purchaseIntent > 5) {
      segments.push('high_purchase_intent');
    }

    // 情感分群
    const positiveRatio = profile.behavior.positiveInteractions / profile.interactions;
    if (positiveRatio > 0.7) {
      segments.push('satisfied_customer');
    }

    return segments;
  }

  /**
   * 营销活动自动化
   */
  async createMarketingCampaign(campaignData) {
    const campaign = {
      id: campaignData.id,
      name: campaignData.name,
      type: campaignData.type, // broadcast, drip, trigger
      audience: campaignData.audience,
      content: campaignData.content,
      schedule: campaignData.schedule,
      goals: campaignData.goals,
      status: 'draft',
      metrics: {
        sent: 0,
        delivered: 0,
        read: 0,
        replied: 0,
        converted: 0
      },
      createdAt: new Date()
    };

    // 验证受众
    const validatedAudience = await this.validateCampaignAudience(campaign.audience);
    campaign.audience = validatedAudience;

    // 调度活动
    if (campaign.schedule.type === 'immediate') {
      await this.executeCampaign(campaign);
    } else {
      await this.scheduleCampaign(campaign);
    }

    return campaign;
  }

  async executeCampaign(campaign) {
    try {
      this.logger.info(`开始执行营销活动: ${campaign.name}`);
      
      for (const recipient of campaign.audience) {
        try {
          // 个性化内容
          const personalizedContent = await this.personalizeContent(
            campaign.content, 
            recipient
          );

          // 发送消息
          await this.sendTemplateMessage(
            recipient.accountId,
            recipient.phoneNumber,
            campaign.content.templateId,
            personalizedContent.variables
          );

          campaign.metrics.sent += 1;

          // 添加发送延迟
          await new Promise(resolve => 
            setTimeout(resolve, campaign.schedule.delay || 1000)
          );

        } catch (error) {
          this.logger.error(`活动消息发送失败: ${recipient.phoneNumber}`, error);
        }
      }

      campaign.status = 'completed';
      this.logger.info(`营销活动执行完成: ${campaign.name}`);

    } catch (error) {
      campaign.status = 'failed';
      this.logger.error(`营销活动执行失败: ${campaign.name}`, error);
      throw error;
    }
  }

  /**
   * 高级分析功能
   */
  async generateConversationInsights(accountId, timeRange = '7d') {
    const insights = {
      overview: {
        totalConversations: 0,
        averageResponseTime: 0,
        resolutionRate: 0,
        satisfactionScore: 0
      },
      trends: {
        hourlyDistribution: {},
        dailyVolume: {},
        topTopics: [],
        sentimentTrend: []
      },
      performance: {
        agentMetrics: {},
        busyPeriods: [],
        recommendations: []
      }
    };

    // 获取时间范围内的对话数据
    const conversations = await this.getConversationData(accountId, timeRange);
    
    // 分析对话概览
    insights.overview = await this.analyzeConversationOverview(conversations);
    
    // 分析趋势
    insights.trends = await this.analyzeConversationTrends(conversations);
    
    // 分析性能
    insights.performance = await this.analyzeConversationPerformance(conversations);

    return insights;
  }

  /**
   * 工具方法
   */
  async generateWelcomeMessage(groupId, newMember) {
    return `👋 欢迎 ${newMember.name} 加入群组！\n\n请遵守群规，与大家友好交流。如有问题，请随时联系管理员。`;
  }

  async getGroupRules(groupId) {
    return `📋 群组规则：\n1. 禁止发布广告和垃圾信息\n2. 保持友好和尊重的交流\n3. 不要分享敏感或不当内容\n4. 有问题请私信管理员`;
  }

  async logGroupEvent(groupId, eventType, eventData) {
    // 记录群组事件到数据库
    this.logger.info(`群组事件: ${groupId} - ${eventType}`, eventData);
  }

  async updateTemplateStats(templateId) {
    // 更新模板使用统计
    this.logger.info(`更新模板统计: ${templateId}`);
  }

  async validateCampaignAudience(audience) {
    // 验证和清理受众列表
    return audience.filter(recipient => 
      recipient.phoneNumber && recipient.phoneNumber.length > 10
    );
  }

  async personalizeContent(content, recipient) {
    const variables = {
      name: recipient.name || 'Customer',
      firstName: recipient.firstName || '',
      lastName: recipient.lastName || '',
      company: recipient.company || ''
    };

    return {
      variables,
      personalizedText: content.text.replace(/{{(\w+)}}/g, (match, key) => {
        return variables[key] || match;
      })
    };
  }

  async scheduleCampaign(campaign) {
    // 调度活动执行
    this.logger.info(`活动已调度: ${campaign.name} - ${campaign.schedule.executeAt}`);
  }

  async determineResponseStrategy(conversationState, nluResult) {
    // 确定响应策略
    let strategy = {
      type: 'automatic',
      nextStage: 'continue',
      requiresHuman: false
    };

    if (nluResult.intent.confidence < 0.5) {
      strategy.type = 'clarification';
      strategy.requiresHuman = true;
    }

    if (nluResult.intent.name === 'complaint') {
      strategy.type = 'escalation';
      strategy.requiresHuman = true;
      strategy.priority = 'high';
    }

    return strategy;
  }

  async generateIntelligentResponse(accountId, strategy, conversationState, nluResult) {
    let response = '';

    switch (strategy.type) {
      case 'automatic':
        response = await this.generateAutomaticResponse(nluResult);
        break;
      case 'clarification':
        response = '抱歉，我没有完全理解您的问题。能否请您详细说明一下？';
        break;
      case 'escalation':
        response = '我理解您的关切，正在为您转接人工客服，请稍等。';
        break;
      default:
        response = '感谢您的消息，我们会尽快回复您。';
    }

    // 发送回复
    await this.sendMessage(accountId, conversationState.userId, response);
    
    return {
      response,
      strategy,
      timestamp: new Date()
    };
  }

  async generateAutomaticResponse(nluResult) {
    const responses = {
      greeting: '您好！很高兴为您服务，请问有什么可以帮助您的吗？',
      inquiry: '关于您询问的信息，我来为您详细介绍...',
      purchase: '谢谢您的购买意向！我来为您介绍我们的产品和服务...',
      support: '我很乐意为您提供帮助，请详细描述您遇到的问题。'
    };

    return responses[nluResult.intent.name] || '感谢您的消息，我们会尽快处理。';
  }
}

module.exports = WhatsAppExtensions;