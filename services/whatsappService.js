const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

class WhatsAppService {
  constructor(accountManager, socketService, logger) {
    this.accountManager = accountManager;
    this.socketService = socketService;
    this.logger = logger;
    this.clients = new Map(); // accountId -> WhatsApp Client
    this.qrCodes = new Map(); // accountId -> QR Code data
  }

  /**
   * 初始化 WhatsApp 客户端
   */
  async initializeClient(accountId, sessionPath) {
    try {
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: accountId,
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      // 设置事件监听器
      this.setupEventListeners(client, accountId);

      // 启动客户端
      await client.initialize();

      this.clients.set(accountId, client);
      this.logger.info(`WhatsApp 客户端初始化成功: ${accountId}`);

      return client;
    } catch (error) {
      this.logger.error(`WhatsApp 客户端初始化失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners(client, accountId) {
    // QR 码生成
    client.on('qr', async (qr) => {
      try {
        const qrCodeDataURL = await qrcode.toDataURL(qr);
        this.qrCodes.set(accountId, qrCodeDataURL);

        // 更新账号状态
        await this.accountManager.updateAccountStatus(accountId, 'scanning', {
          qrCode: qrCodeDataURL
        });

        // 通过 WebSocket 推送 QR 码
        this.socketService.emitToAccount(accountId, 'qr_code', {
          qrCode: qrCodeDataURL,
          message: '请使用 WhatsApp 扫描二维码登录'
        });

        this.logger.info(`QR 码已生成: ${accountId}`);
      } catch (error) {
        this.logger.error(`QR 码生成失败: ${accountId}`, error);
      }
    });

    // 客户端就绪
    client.on('ready', async () => {
      try {
        const info = client.info;
        
        // 更新账号信息
        await this.accountManager.updateAccountStatus(accountId, 'connected', {
          profile: {
            name: info.pushname,
            phoneNumber: info.wid.user,
            isVerified: false
          }
        });

        // 清除 QR 码
        this.qrCodes.delete(accountId);

        // 推送连接成功消息
        this.socketService.emitToAccount(accountId, 'connected', {
          message: 'WhatsApp 连接成功',
          profile: info
        });

        this.logger.info(`WhatsApp 客户端已连接: ${accountId}`);
      } catch (error) {
        this.logger.error(`WhatsApp 连接处理失败: ${accountId}`, error);
      }
    });

    // 认证失败
    client.on('auth_failure', async (msg) => {
      this.logger.error(`WhatsApp 认证失败: ${accountId}`, msg);
      
      await this.accountManager.updateAccountStatus(accountId, 'error', {
        error: '认证失败，请重新扫码登录'
      });

      this.socketService.emitToAccount(accountId, 'auth_failure', {
        message: '认证失败，请重新扫码登录',
        error: msg
      });
    });

    // 客户端断开连接
    client.on('disconnected', async (reason) => {
      this.logger.warn(`WhatsApp 客户端断开连接: ${accountId}, 原因: ${reason}`);
      
      await this.accountManager.updateAccountStatus(accountId, 'disconnected', {
        disconnectReason: reason
      });

      this.socketService.emitToAccount(accountId, 'disconnected', {
        message: '连接已断开',
        reason
      });

      // 清理客户端
      this.clients.delete(accountId);
    });

    // 消息接收
    client.on('message', async (message) => {
      try {
        await this.handleIncomingMessage(accountId, message);
      } catch (error) {
        this.logger.error(`处理消息失败: ${accountId}`, error);
      }
    });

    // 消息发送确认
    client.on('message_ack', async (message, ack) => {
      this.socketService.emitToAccount(accountId, 'message_ack', {
        messageId: message.id._serialized,
        ack,
        timestamp: new Date()
      });
    });

    // 群组邀请
    client.on('group_join', async (notification) => {
      this.logger.info(`收到群组邀请: ${accountId}`, notification);
      
      this.socketService.emitToAccount(accountId, 'group_invite', {
        groupId: notification.id.remote,
        inviter: notification.author,
        timestamp: new Date()
      });
    });
  }

  /**
   * 处理接收到的消息
   */
  async handleIncomingMessage(accountId, message) {
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
        id: message.id._serialized,
        from: message.from,
        to: message.to,
        body: message.body,
        type: message.type,
        timestamp: message.timestamp,
        isGroup: message.from.includes('@g.us'),
        contact: message.getContact ? await message.getContact() : null
      };

      // 推送消息到前端
      this.socketService.emitToAccount(accountId, 'message_received', messageData);

      // 自动回复处理
      if (account.config.autoReply?.enabled) {
        await this.handleAutoReply(accountId, message, account.config.autoReply);
      }

      // AI 内容处理
      if (account.config.aiEnabled) {
        await this.handleAIResponse(accountId, message, account.config);
      }

      this.logger.info(`消息已处理: ${accountId}, 来自: ${message.from}`);
    } catch (error) {
      this.logger.error(`处理消息失败: ${accountId}`, error);
    }
  }

  /**
   * 自动回复处理
   */
  async handleAutoReply(accountId, message, autoReplyConfig) {
    try {
      const { keywords, response, delay } = autoReplyConfig;
      
      // 检查关键词匹配
      const hasKeyword = keywords.some(keyword => 
        message.body.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasKeyword && response) {
        // 延迟回复
        setTimeout(async () => {
          try {
            await this.sendMessage(accountId, message.from, response);
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
   * AI 响应处理
   */
  async handleAIResponse(accountId, message, config) {
    try {
      // 这里可以集成 OpenAI 或其他 AI 服务
      // 暂时跳过实现
      this.logger.info(`AI 响应处理: ${accountId}`);
    } catch (error) {
      this.logger.error(`AI 响应处理失败: ${accountId}`, error);
    }
  }

  /**
   * 发送消息
   */
  async sendMessage(accountId, to, content, options = {}) {
    try {
      const client = this.clients.get(accountId);
      if (!client) {
        throw new Error(`客户端未连接: ${accountId}`);
      }

      let message;
      
      if (options.media) {
        // 发送媒体消息
        const media = MessageMedia.fromFilePath(options.media.path);
        message = await client.sendMessage(to, media, {
          caption: content || options.media.caption
        });
      } else {
        // 发送文本消息
        message = await client.sendMessage(to, content);
      }

      // 更新发送统计
      await this.accountManager.updateAccountStats(accountId, 'messagesSent');

      this.logger.info(`消息发送成功: ${accountId} -> ${to}`);
      return message;
    } catch (error) {
      this.logger.error(`消息发送失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 群发消息
   */
  async sendBulkMessages(accountId, targets, content, options = {}) {
    const results = [];
    const client = this.clients.get(accountId);
    
    if (!client) {
      throw new Error(`客户端未连接: ${accountId}`);
    }

    for (const target of targets) {
      try {
        // 添加随机延迟
        if (options.randomDelay) {
          const delay = Math.random() * 5000 + 1000; // 1-6秒随机延迟
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const message = await this.sendMessage(accountId, target, content, options);
        
        results.push({
          target,
          status: 'success',
          messageId: message.id._serialized,
          timestamp: new Date()
        });

      } catch (error) {
        results.push({
          target,
          status: 'failed',
          error: error.message,
          timestamp: new Date()
        });
        
        this.logger.error(`群发消息失败: ${accountId} -> ${target}`, error);
      }
    }

    return results;
  }

  /**
   * 创建群组
   */
  async createGroup(accountId, groupName, participants) {
    try {
      const client = this.clients.get(accountId);
      if (!client) {
        throw new Error(`客户端未连接: ${accountId}`);
      }

      const group = await client.createGroup(groupName, participants);
      
      this.logger.info(`群组创建成功: ${accountId}, 群组: ${groupName}`);
      return group;
    } catch (error) {
      this.logger.error(`群组创建失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取联系人
   */
  async getContacts(accountId) {
    try {
      const client = this.clients.get(accountId);
      if (!client) {
        throw new Error(`客户端未连接: ${accountId}`);
      }

      const contacts = await client.getContacts();
      return contacts.map(contact => ({
        id: contact.id._serialized,
        name: contact.name,
        pushname: contact.pushname,
        isGroup: contact.isGroup,
        isMyContact: contact.isMyContact
      }));
    } catch (error) {
      this.logger.error(`获取联系人失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取聊天记录
   */
  async getChats(accountId, limit = 50) {
    try {
      const client = this.clients.get(accountId);
      if (!client) {
        throw new Error(`客户端未连接: ${accountId}`);
      }

      const chats = await client.getChats();
      return chats.slice(0, limit).map(chat => ({
        id: chat.id._serialized,
        name: chat.name,
        isGroup: chat.isGroup,
        timestamp: chat.timestamp,
        unreadCount: chat.unreadCount,
        lastMessage: chat.lastMessage ? {
          body: chat.lastMessage.body,
          timestamp: chat.lastMessage.timestamp,
          from: chat.lastMessage.from
        } : null
      }));
    } catch (error) {
      this.logger.error(`获取聊天记录失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 断开客户端连接
   */
  async disconnectClient(accountId) {
    try {
      const client = this.clients.get(accountId);
      if (client) {
        await client.destroy();
        this.clients.delete(accountId);
      }

      this.qrCodes.delete(accountId);
      this.logger.info(`WhatsApp 客户端已断开: ${accountId}`);
    } catch (error) {
      this.logger.error(`断开客户端失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取 QR 码
   */
  getQRCode(accountId) {
    return this.qrCodes.get(accountId);
  }

  /**
   * 检查客户端状态
   */
  getClientStatus(accountId) {
    const client = this.clients.get(accountId);
    if (!client) {
      return 'disconnected';
    }

    return client.info ? 'connected' : 'connecting';
  }
}

module.exports = WhatsAppService;