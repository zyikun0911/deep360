const { Telegraf } = require('telegraf');
const { Telegram } = require('telegraf');

class TelegramService {
  constructor(accountManager, socketService, logger) {
    this.accountManager = accountManager;
    this.socketService = socketService;
    this.logger = logger;
    this.bots = new Map(); // accountId -> Telegraf bot instance
    this.telegramApi = new Map(); // accountId -> Telegram API instance
  }

  /**
   * 初始化 Telegram Bot
   */
  async initializeBot(accountId, botToken) {
    try {
      // 创建 Bot 实例
      const bot = new Telegraf(botToken);
      const telegram = new Telegram(botToken);

      // 设置事件监听器
      this.setupEventListeners(bot, accountId);

      // 启动 Bot
      await bot.launch();

      // 获取 Bot 信息
      const botInfo = await telegram.getMe();

      // 存储实例
      this.bots.set(accountId, bot);
      this.telegramApi.set(accountId, telegram);

      // 更新账号状态
      await this.accountManager.updateAccountStatus(accountId, 'connected', {
        profile: {
          name: botInfo.first_name,
          username: botInfo.username,
          isBot: botInfo.is_bot,
          canJoinGroups: botInfo.can_join_groups,
          canReadAllGroupMessages: botInfo.can_read_all_group_messages
        }
      });

      // 推送连接成功消息
      this.socketService.emitToAccount(accountId, 'connected', {
        message: 'Telegram Bot 连接成功',
        botInfo
      });

      this.logger.info(`Telegram Bot 初始化成功: ${accountId}, Bot: @${botInfo.username}`);
      return { bot, telegram, botInfo };

    } catch (error) {
      this.logger.error(`Telegram Bot 初始化失败: ${accountId}`, error);
      
      await this.accountManager.updateAccountStatus(accountId, 'error', {
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners(bot, accountId) {
    // 文本消息处理
    bot.on('text', async (ctx) => {
      try {
        await this.handleTextMessage(accountId, ctx);
      } catch (error) {
        this.logger.error(`处理文本消息失败: ${accountId}`, error);
      }
    });

    // 媒体消息处理
    bot.on(['photo', 'video', 'document', 'audio'], async (ctx) => {
      try {
        await this.handleMediaMessage(accountId, ctx);
      } catch (error) {
        this.logger.error(`处理媒体消息失败: ${accountId}`, error);
      }
    });

    // 新成员加入群组
    bot.on('new_chat_members', async (ctx) => {
      try {
        await this.handleNewMembers(accountId, ctx);
      } catch (error) {
        this.logger.error(`处理新成员失败: ${accountId}`, error);
      }
    });

    // 成员离开群组
    bot.on('left_chat_member', async (ctx) => {
      try {
        await this.handleLeftMember(accountId, ctx);
      } catch (error) {
        this.logger.error(`处理成员离开失败: ${accountId}`, error);
      }
    });

    // 群组标题更改
    bot.on('new_chat_title', async (ctx) => {
      this.logger.info(`群组标题已更改: ${accountId}, 新标题: ${ctx.message.new_chat_title}`);
    });

    // 回调查询处理
    bot.on('callback_query', async (ctx) => {
      try {
        await this.handleCallbackQuery(accountId, ctx);
      } catch (error) {
        this.logger.error(`处理回调查询失败: ${accountId}`, error);
      }
    });

    // 内联查询处理
    bot.on('inline_query', async (ctx) => {
      try {
        await this.handleInlineQuery(accountId, ctx);
      } catch (error) {
        this.logger.error(`处理内联查询失败: ${accountId}`, error);
      }
    });

    // 错误处理
    bot.catch((err, ctx) => {
      this.logger.error(`Telegram Bot 错误: ${accountId}`, err);
      this.socketService.emitToAccount(accountId, 'bot_error', {
        error: err.message,
        context: ctx ? {
          updateType: ctx.updateType,
          chatId: ctx.chat?.id,
          userId: ctx.from?.id
        } : null
      });
    });
  }

  /**
   * 处理文本消息
   */
  async handleTextMessage(accountId, ctx) {
    try {
      // 更新消息统计
      await this.accountManager.updateAccountStats(accountId, 'messagesReceived');

      // 获取账号配置
      const account = await this.accountManager.getAccount(accountId);
      if (!account || !account.config.isEnabled) {
        return;
      }

      // 消息数据
      const messageData = {
        messageId: ctx.message.message_id,
        chatId: ctx.chat.id,
        userId: ctx.from.id,
        text: ctx.message.text,
        date: ctx.message.date,
        chatType: ctx.chat.type,
        isGroup: ctx.chat.type !== 'private',
        user: {
          id: ctx.from.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name
        },
        chat: {
          id: ctx.chat.id,
          type: ctx.chat.type,
          title: ctx.chat.title,
          username: ctx.chat.username
        }
      };

      // 推送消息到前端
      this.socketService.emitToAccount(accountId, 'message_received', messageData);

      // 自动回复处理
      if (account.config.autoReply?.enabled) {
        await this.handleAutoReply(accountId, ctx, account.config.autoReply);
      }

      // AI 内容处理
      if (account.config.aiEnabled) {
        await this.handleAIResponse(accountId, ctx, account.config);
      }

      this.logger.info(`文本消息已处理: ${accountId}, 来自: ${ctx.from.username || ctx.from.id}`);
    } catch (error) {
      this.logger.error(`处理文本消息失败: ${accountId}`, error);
    }
  }

  /**
   * 处理媒体消息
   */
  async handleMediaMessage(accountId, ctx) {
    try {
      const messageType = ctx.updateType;
      let fileInfo;

      // 根据消息类型获取文件信息
      switch (messageType) {
        case 'photo':
          const photos = ctx.message.photo;
          fileInfo = photos[photos.length - 1]; // 获取最大尺寸的照片
          break;
        case 'video':
          fileInfo = ctx.message.video;
          break;
        case 'document':
          fileInfo = ctx.message.document;
          break;
        case 'audio':
          fileInfo = ctx.message.audio;
          break;
      }

      const messageData = {
        messageId: ctx.message.message_id,
        chatId: ctx.chat.id,
        userId: ctx.from.id,
        type: messageType,
        fileId: fileInfo.file_id,
        fileSize: fileInfo.file_size,
        fileName: fileInfo.file_name,
        caption: ctx.message.caption,
        date: ctx.message.date
      };

      // 推送媒体消息到前端
      this.socketService.emitToAccount(accountId, 'media_received', messageData);

      this.logger.info(`媒体消息已处理: ${accountId}, 类型: ${messageType}`);
    } catch (error) {
      this.logger.error(`处理媒体消息失败: ${accountId}`, error);
    }
  }

  /**
   * 处理新成员加入
   */
  async handleNewMembers(accountId, ctx) {
    try {
      const newMembers = ctx.message.new_chat_members;
      
      for (const member of newMembers) {
        this.socketService.emitToAccount(accountId, 'member_joined', {
          chatId: ctx.chat.id,
          chatTitle: ctx.chat.title,
          member: {
            id: member.id,
            username: member.username,
            firstName: member.first_name,
            lastName: member.last_name
          }
        });
      }

      // 更新群组统计
      await this.accountManager.updateAccountStats(accountId, 'contactsAdded', newMembers.length);

      this.logger.info(`新成员加入处理完成: ${accountId}, 群组: ${ctx.chat.title}`);
    } catch (error) {
      this.logger.error(`处理新成员失败: ${accountId}`, error);
    }
  }

  /**
   * 处理成员离开
   */
  async handleLeftMember(accountId, ctx) {
    try {
      const leftMember = ctx.message.left_chat_member;
      
      this.socketService.emitToAccount(accountId, 'member_left', {
        chatId: ctx.chat.id,
        chatTitle: ctx.chat.title,
        member: {
          id: leftMember.id,
          username: leftMember.username,
          firstName: leftMember.first_name,
          lastName: leftMember.last_name
        }
      });

      this.logger.info(`成员离开处理完成: ${accountId}, 用户: ${leftMember.username || leftMember.id}`);
    } catch (error) {
      this.logger.error(`处理成员离开失败: ${accountId}`, error);
    }
  }

  /**
   * 自动回复处理
   */
  async handleAutoReply(accountId, ctx, autoReplyConfig) {
    try {
      const { keywords, response, delay } = autoReplyConfig;
      const text = ctx.message.text.toLowerCase();
      
      // 检查关键词匹配
      const hasKeyword = keywords.some(keyword => 
        text.includes(keyword.toLowerCase())
      );

      if (hasKeyword && response) {
        // 延迟回复
        setTimeout(async () => {
          try {
            await ctx.reply(response);
            await this.accountManager.updateAccountStats(accountId, 'messagesSent');
            this.logger.info(`自动回复已发送: ${accountId}`);
          } catch (error) {
            this.logger.error(`自动回复失败: ${accountId}`, error);
          }
        }, delay || 2000);
      }
    } catch (error) {
      this.logger.error(`自动回复处理失败: ${accountId}`, error);
    }
  }

  /**
   * 处理回调查询
   */
  async handleCallbackQuery(accountId, ctx) {
    try {
      const callbackData = ctx.callbackQuery.data;
      
      this.socketService.emitToAccount(accountId, 'callback_query', {
        id: ctx.callbackQuery.id,
        data: callbackData,
        userId: ctx.from.id,
        messageId: ctx.callbackQuery.message?.message_id
      });

      // 回应回调查询
      await ctx.answerCbQuery();
      
      this.logger.info(`回调查询已处理: ${accountId}, 数据: ${callbackData}`);
    } catch (error) {
      this.logger.error(`处理回调查询失败: ${accountId}`, error);
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(accountId, chatId, text, options = {}) {
    try {
      const telegram = this.telegramApi.get(accountId);
      if (!telegram) {
        throw new Error(`Bot 未连接: ${accountId}`);
      }

      const message = await telegram.sendMessage(chatId, text, options);

      // 更新发送统计
      await this.accountManager.updateAccountStats(accountId, 'messagesSent');

      this.logger.info(`消息发送成功: ${accountId} -> ${chatId}`);
      return message;
    } catch (error) {
      this.logger.error(`消息发送失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 群发消息
   */
  async sendBulkMessages(accountId, chatIds, text, options = {}) {
    const results = [];
    const telegram = this.telegramApi.get(accountId);
    
    if (!telegram) {
      throw new Error(`Bot 未连接: ${accountId}`);
    }

    for (const chatId of chatIds) {
      try {
        // 添加随机延迟
        if (options.randomDelay) {
          const delay = Math.random() * 5000 + 1000; // 1-6秒随机延迟
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const message = await this.sendMessage(accountId, chatId, text, options);
        
        results.push({
          chatId,
          status: 'success',
          messageId: message.message_id,
          timestamp: new Date()
        });

      } catch (error) {
        results.push({
          chatId,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });
        
        this.logger.error(`群发消息失败: ${accountId} -> ${chatId}`, error);
      }
    }

    return results;
  }

  /**
   * 发送媒体消息
   */
  async sendMedia(accountId, chatId, media, type = 'photo', options = {}) {
    try {
      const telegram = this.telegramApi.get(accountId);
      if (!telegram) {
        throw new Error(`Bot 未连接: ${accountId}`);
      }

      let message;
      
      switch (type) {
        case 'photo':
          message = await telegram.sendPhoto(chatId, media, options);
          break;
        case 'video':
          message = await telegram.sendVideo(chatId, media, options);
          break;
        case 'document':
          message = await telegram.sendDocument(chatId, media, options);
          break;
        case 'audio':
          message = await telegram.sendAudio(chatId, media, options);
          break;
        default:
          throw new Error(`不支持的媒体类型: ${type}`);
      }

      await this.accountManager.updateAccountStats(accountId, 'messagesSent');
      this.logger.info(`媒体消息发送成功: ${accountId} -> ${chatId}`);
      return message;
    } catch (error) {
      this.logger.error(`媒体消息发送失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取聊天信息
   */
  async getChat(accountId, chatId) {
    try {
      const telegram = this.telegramApi.get(accountId);
      if (!telegram) {
        throw new Error(`Bot 未连接: ${accountId}`);
      }

      return await telegram.getChat(chatId);
    } catch (error) {
      this.logger.error(`获取聊天信息失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取聊天成员
   */
  async getChatMember(accountId, chatId, userId) {
    try {
      const telegram = this.telegramApi.get(accountId);
      if (!telegram) {
        throw new Error(`Bot 未连接: ${accountId}`);
      }

      return await telegram.getChatMember(chatId, userId);
    } catch (error) {
      this.logger.error(`获取聊天成员失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 踢出聊天成员
   */
  async kickChatMember(accountId, chatId, userId) {
    try {
      const telegram = this.telegramApi.get(accountId);
      if (!telegram) {
        throw new Error(`Bot 未连接: ${accountId}`);
      }

      await telegram.kickChatMember(chatId, userId);
      this.logger.info(`成员已踢出: ${accountId}, 聊天: ${chatId}, 用户: ${userId}`);
    } catch (error) {
      this.logger.error(`踢出成员失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 断开 Bot 连接
   */
  async disconnectBot(accountId) {
    try {
      const bot = this.bots.get(accountId);
      if (bot) {
        bot.stop();
        this.bots.delete(accountId);
      }

      this.telegramApi.delete(accountId);
      this.logger.info(`Telegram Bot 已断开: ${accountId}`);
    } catch (error) {
      this.logger.error(`断开 Bot 失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 检查 Bot 状态
   */
  getBotStatus(accountId) {
    const bot = this.bots.get(accountId);
    return bot ? 'connected' : 'disconnected';
  }
}

module.exports = TelegramService;