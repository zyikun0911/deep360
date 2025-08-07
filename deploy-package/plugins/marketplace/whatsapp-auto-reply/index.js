/**
 * WhatsApp智能自动回复插件
 * @author Deep360 Team
 * @version 2.1.0
 */

class WhatsAppAutoReplyPlugin {
  constructor() {
    this.name = 'WhatsApp智能自动回复';
    this.version = '2.1.0';
    this.config = {};
    this.isEnabled = false;
    this.replyStats = {
      totalReplies: 0,
      keywordMatches: 0,
      aiReplies: 0,
      fallbackReplies: 0
    };
    this.userSessions = new Map(); // 用户会话管理
  }

  /**
   * 插件初始化
   */
  async initialize(config) {
    this.config = config;
    this.isEnabled = config.enabled || false;
    
    utils.log('info', '插件初始化完成', { 
      enabled: this.isEnabled,
      mode: config.replyMode 
    });

    // 初始化AI服务
    if (config.replyMode === 'ai' || config.replyMode === 'hybrid') {
      await this.initializeAI();
    }

    // 预加载关键词索引
    this.buildKeywordIndex();

    emit('initialized', { name: this.name, version: this.version });
  }

  /**
   * 初始化AI服务
   */
  async initializeAI() {
    try {
      const aiConfig = this.config.aiConfig;
      this.aiService = {
        provider: aiConfig.provider,
        model: aiConfig.model,
        systemPrompt: aiConfig.systemPrompt,
        maxTokens: aiConfig.maxTokens
      };
      
      utils.log('info', 'AI服务初始化成功', { provider: aiConfig.provider });
    } catch (error) {
      utils.log('error', 'AI服务初始化失败', { error: error.message });
    }
  }

  /**
   * 构建关键词索引
   */
  buildKeywordIndex() {
    this.keywordIndex = new Map();
    
    for (const rule of this.config.keywordRules || []) {
      if (!rule.enabled) continue;
      
      for (const keyword of rule.keywords || []) {
        const normalizedKeyword = keyword.toLowerCase().trim();
        if (!this.keywordIndex.has(normalizedKeyword)) {
          this.keywordIndex.set(normalizedKeyword, []);
        }
        this.keywordIndex.get(normalizedKeyword).push(rule);
      }
    }
    
    utils.log('info', '关键词索引构建完成', { 
      rules: this.config.keywordRules?.length || 0,
      keywords: this.keywordIndex.size 
    });
  }

  /**
   * WhatsApp消息接收钩子
   */
  async ['whatsapp.message.received'](message, contact, chat) {
    if (!this.isEnabled) return;

    try {
      // 检查工作时间
      if (!this.isWorkingHours()) {
        utils.log('debug', '非工作时间，跳过自动回复');
        return;
      }

      // 避免回复自己的消息
      if (message.fromMe) return;

      // 获取用户会话
      const session = this.getUserSession(contact.id._serialized);

      // 处理消息并生成回复
      const reply = await this.processMessage(message, contact, session);
      
      if (reply) {
        // 添加回复延迟
        await this.delay(this.config.responseDelay * 1000);
        
        // 发送回复
        await this.sendReply(chat, reply, message);
        
        // 更新统计
        this.updateStats(reply.type);
        
        // 更新会话
        this.updateSession(session, message, reply);

        utils.log('info', '自动回复已发送', {
          from: contact.name || contact.number,
          replyType: reply.type,
          message: reply.content.substring(0, 50)
        });
      }

    } catch (error) {
      utils.log('error', '处理消息失败', { 
        error: error.message,
        from: contact?.name || 'unknown'
      });
    }
  }

  /**
   * WhatsApp群组消息接收钩子
   */
  async ['whatsapp.group.message.received'](message, contact, chat) {
    // 群组中只有@提及时才回复
    if (!message.mentionedIds?.length) return;
    
    // 检查是否@了机器人账号
    const botId = await this.getBotId();
    if (!message.mentionedIds.includes(botId)) return;

    // 处理群组消息
    await this['whatsapp.message.received'](message, contact, chat);
  }

  /**
   * 处理消息并生成回复
   */
  async processMessage(message, contact, session) {
    const messageText = message.body?.trim();
    if (!messageText) return null;

    const mode = this.config.replyMode || 'hybrid';
    
    switch (mode) {
      case 'keyword':
        return await this.handleKeywordReply(messageText, session);
      
      case 'ai':
        return await this.handleAIReply(messageText, session);
      
      case 'hybrid':
        // 先尝试关键词匹配，失败则使用AI
        const keywordReply = await this.handleKeywordReply(messageText, session);
        if (keywordReply) return keywordReply;
        
        return await this.handleAIReply(messageText, session);
      
      default:
        return this.createReply('fallback', this.config.fallbackMessage);
    }
  }

  /**
   * 关键词匹配回复
   */
  async handleKeywordReply(messageText, session) {
    const normalizedText = messageText.toLowerCase();
    
    // 精确匹配
    for (const [keyword, rules] of this.keywordIndex) {
      if (normalizedText.includes(keyword)) {
        const rule = rules[0]; // 取第一个匹配的规则
        return this.createReply('keyword', rule.response, { keyword, rule });
      }
    }

    // 模糊匹配（使用编辑距离）
    for (const [keyword, rules] of this.keywordIndex) {
      if (this.fuzzyMatch(normalizedText, keyword)) {
        const rule = rules[0];
        return this.createReply('keyword', rule.response, { keyword, rule, fuzzy: true });
      }
    }

    return null;
  }

  /**
   * AI智能回复
   */
  async handleAIReply(messageText, session) {
    try {
      // 构建对话上下文
      const context = this.buildAIContext(messageText, session);
      
      // 调用AI生成回复
      const aiResponse = await pluginAPI.ai.generateText(context, {
        model: this.aiService.model,
        maxTokens: this.aiService.maxTokens,
        systemPrompt: this.aiService.systemPrompt
      });

      if (aiResponse && aiResponse.data) {
        return this.createReply('ai', aiResponse.data.trim());
      }

    } catch (error) {
      utils.log('error', 'AI回复生成失败', { error: error.message });
    }

    // AI失败时返回兜底回复
    return this.createReply('fallback', this.config.fallbackMessage);
  }

  /**
   * 构建AI对话上下文
   */
  buildAIContext(messageText, session) {
    let context = `用户消息: ${messageText}\n`;
    
    // 添加历史对话上下文（最近3轮）
    if (session.history.length > 0) {
      context += '\n对话历史:\n';
      const recentHistory = session.history.slice(-6); // 最近3轮对话
      
      for (let i = 0; i < recentHistory.length; i += 2) {
        const userMsg = recentHistory[i];
        const botMsg = recentHistory[i + 1];
        
        if (userMsg && botMsg) {
          context += `用户: ${userMsg}\n助手: ${botMsg}\n`;
        }
      }
    }

    context += '\n请生成一个友好、专业的回复:';
    return context;
  }

  /**
   * 发送回复消息
   */
  async sendReply(chat, reply, originalMessage) {
    try {
      await pluginAPI.whatsapp.sendMessage(chat.id._serialized, reply.content, {
        quotedMessageId: originalMessage.id,
        linkPreview: false
      });
      
      reply.sent = true;
      reply.sentAt = new Date();
      
    } catch (error) {
      utils.log('error', '发送回复失败', { error: error.message });
      reply.sent = false;
      reply.error = error.message;
    }
  }

  /**
   * 获取用户会话
   */
  getUserSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        userId,
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        history: [],
        context: {}
      });
    }
    
    const session = this.userSessions.get(userId);
    session.lastActivity = new Date();
    session.messageCount++;
    
    return session;
  }

  /**
   * 更新用户会话
   */
  updateSession(session, message, reply) {
    // 保存对话历史
    session.history.push(message.body);
    session.history.push(reply.content);
    
    // 限制历史记录长度
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }
  }

  /**
   * 检查是否在工作时间
   */
  isWorkingHours() {
    const workingHours = this.config.workingHours;
    if (!workingHours?.enabled) return true;

    const now = new Date();
    const timeZone = workingHours.timezone || 'Asia/Shanghai';
    
    // 转换到指定时区
    const localTime = new Intl.DateTimeFormat('en', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }).format(now);

    const currentTime = localTime.replace(':', '');
    const startTime = workingHours.start.replace(':', '');
    const endTime = workingHours.end.replace(':', '');

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * 模糊匹配算法
   */
  fuzzyMatch(text, keyword) {
    if (text.length < 3 || keyword.length < 3) return false;
    
    const distance = this.levenshteinDistance(text, keyword);
    const threshold = Math.min(text.length, keyword.length) * 0.3;
    
    return distance <= threshold;
  }

  /**
   * 计算编辑距离
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 创建回复对象
   */
  createReply(type, content, metadata = {}) {
    return {
      type,
      content,
      metadata,
      timestamp: new Date(),
      sent: false
    };
  }

  /**
   * 更新统计信息
   */
  updateStats(replyType) {
    this.replyStats.totalReplies++;
    
    switch (replyType) {
      case 'keyword':
        this.replyStats.keywordMatches++;
        break;
      case 'ai':
        this.replyStats.aiReplies++;
        break;
      case 'fallback':
        this.replyStats.fallbackReplies++;
        break;
    }
    
    // 定期保存统计数据
    if (this.replyStats.totalReplies % 10 === 0) {
      this.saveStats();
    }
  }

  /**
   * 保存统计数据
   */
  async saveStats() {
    try {
      await utils.writeFile('stats.json', JSON.stringify(this.replyStats, null, 2));
    } catch (error) {
      utils.log('error', '保存统计数据失败', { error: error.message });
    }
  }

  /**
   * 获取机器人ID
   */
  async getBotId() {
    // 这里应该从WhatsApp服务获取当前账号ID
    return 'bot@c.us'; // 示例ID
  }

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取插件状态
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      stats: this.replyStats,
      activeSessions: this.userSessions.size,
      keywordRules: this.config.keywordRules?.length || 0,
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * 插件销毁
   */
  async destroy() {
    // 保存最终统计数据
    await this.saveStats();
    
    // 清理会话数据
    this.userSessions.clear();
    
    utils.log('info', '插件已销毁');
    emit('destroyed', { name: this.name });
  }
}

// 导出插件实例
module.exports = new WhatsAppAutoReplyPlugin();