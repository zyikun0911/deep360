const PhoneNumberService = require('./phoneNumberService');
const WhatsAppService = require('./whatsappService');
const TelegramService = require('./telegramService');
const Account = require('../models/Account');
const { v4: uuidv4 } = require('uuid');

class AutoRegistrationService {
  constructor(accountManager, socketService, logger) {
    this.accountManager = accountManager;
    this.socketService = socketService;
    this.logger = logger;
    this.phoneService = new PhoneNumberService(logger);
    this.registrationQueue = [];
    this.isProcessing = false;
    this.maxConcurrent = 3; // 最大并发注册数
    this.currentRegistrations = new Map(); // 当前进行中的注册
  }

  /**
   * 批量自动注册 WhatsApp 账号
   */
  async batchRegisterWhatsApp(userId, config) {
    try {
      const {
        count = 1,
        provider = 'fivesim',
        country = 'china',
        proxy = null,
        accountPrefix = 'WA',
        autoStart = true
      } = config;

      this.logger.info(`开始批量注册 WhatsApp 账号: ${count} 个`);

      const registrationId = uuidv4();
      const results = {
        registrationId,
        total: count,
        success: [],
        failed: [],
        pending: [],
        status: 'running',
        startedAt: new Date()
      };

      // 推送注册开始事件
      this.socketService.emitToUser(userId, 'registration_started', {
        registrationId,
        platform: 'whatsapp',
        count,
        provider
      });

      // 分批处理注册
      const batches = this.createBatches(count, this.maxConcurrent);
      
      for (const batch of batches) {
        const batchPromises = batch.map(index => 
          this.registerSingleWhatsApp(userId, {
            index,
            provider,
            country,
            proxy,
            accountPrefix,
            registrationId
          })
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, batchIndex) => {
          if (result.status === 'fulfilled') {
            results.success.push(result.value);
          } else {
            results.failed.push({
              index: batch[batchIndex],
              error: result.reason.message
            });
          }
        });

        // 推送进度更新
        this.socketService.emitToUser(userId, 'registration_progress', {
          registrationId,
          completed: results.success.length + results.failed.length,
          total: count,
          success: results.success.length,
          failed: results.failed.length
        });

        // 批次间延迟
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      results.status = 'completed';
      results.completedAt = new Date();

      // 推送注册完成事件
      this.socketService.emitToUser(userId, 'registration_completed', results);

      this.logger.info(`批量注册完成: 成功 ${results.success.length}, 失败 ${results.failed.length}`);
      return results;

    } catch (error) {
      this.logger.error('批量注册失败:', error);
      throw error;
    }
  }

  /**
   * 单个 WhatsApp 账号注册
   */
  async registerSingleWhatsApp(userId, config) {
    const {
      index,
      provider,
      country,
      proxy,
      accountPrefix,
      registrationId
    } = config;

    let phoneNumber = null;
    let account = null;

    try {
      this.logger.info(`开始注册 WhatsApp 账号 #${index}`);

      // 1. 获取手机号
      const phoneData = await this.phoneService.getPhoneNumber(provider, country, 'whatsapp');
      phoneNumber = phoneData.phoneNumber;

      this.logger.info(`获取到手机号: ${phoneNumber}`);

      // 2. 创建账号记录
      const accountName = `${accountPrefix}_${index}_${Date.now()}`;
      account = await this.accountManager.createAccount(userId, {
        name: accountName,
        type: 'whatsapp',
        phoneNumber: phoneNumber,
        config: {
          isEnabled: false, // 初始状态为禁用
          autoReconnect: true,
          proxy: proxy
        }
      });

      // 3. 启动 WhatsApp 实例
      const instanceInfo = await this.accountManager.startAccount(account.accountId);

      // 4. 等待二维码生成
      await this.waitForQRCode(account.accountId, 60000); // 等待1分钟

      // 5. 模拟扫码（这里需要实际的扫码逻辑）
      // 在实际环境中，这里应该是自动化的扫码过程
      await this.simulateQRCodeScan(account.accountId, phoneNumber);

      // 6. 等待验证码
      const verificationCode = await this.phoneService.getVerificationCode(phoneNumber, 300000);

      this.logger.info(`收到验证码: ${phoneNumber} - ${verificationCode.code}`);

      // 7. 输入验证码完成注册
      await this.inputVerificationCode(account.accountId, verificationCode.code);

      // 8. 等待连接成功
      await this.waitForConnection(account.accountId, 120000); // 等待2分钟

      // 9. 更新账号状态
      await Account.findOneAndUpdate(
        { accountId: account.accountId },
        {
          status: 'connected',
          'config.isEnabled': true,
          'profile.phoneNumber': phoneNumber,
          'profile.registeredAt': new Date()
        }
      );

      // 10. 释放手机号
      await this.phoneService.releasePhoneNumber(phoneNumber);

      const result = {
        index,
        accountId: account.accountId,
        accountName,
        phoneNumber,
        status: 'success',
        registeredAt: new Date()
      };

      this.logger.info(`WhatsApp 账号注册成功: ${accountName} - ${phoneNumber}`);
      
      // 推送单个注册成功事件
      this.socketService.emitToUser(userId, 'account_registered', {
        registrationId,
        platform: 'whatsapp',
        account: result
      });

      return result;

    } catch (error) {
      this.logger.error(`WhatsApp 账号注册失败 #${index}:`, error);

      // 清理资源
      if (phoneNumber) {
        await this.phoneService.releasePhoneNumber(phoneNumber);
      }
      
      if (account) {
        await this.accountManager.deleteAccount(account.accountId);
      }

      throw new Error(`注册失败 #${index}: ${error.message}`);
    }
  }

  /**
   * 批量自动注册 Telegram 账号
   */
  async batchRegisterTelegram(userId, config) {
    try {
      const {
        count = 1,
        provider = 'fivesim',
        country = 'china',
        proxy = null,
        accountPrefix = 'TG'
      } = config;

      this.logger.info(`开始批量注册 Telegram 账号: ${count} 个`);

      const registrationId = uuidv4();
      const results = {
        registrationId,
        total: count,
        success: [],
        failed: [],
        status: 'running',
        startedAt: new Date()
      };

      // 推送注册开始事件
      this.socketService.emitToUser(userId, 'registration_started', {
        registrationId,
        platform: 'telegram',
        count,
        provider
      });

      // 分批处理注册
      const batches = this.createBatches(count, this.maxConcurrent);
      
      for (const batch of batches) {
        const batchPromises = batch.map(index => 
          this.registerSingleTelegram(userId, {
            index,
            provider,
            country,
            proxy,
            accountPrefix,
            registrationId
          })
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, batchIndex) => {
          if (result.status === 'fulfilled') {
            results.success.push(result.value);
          } else {
            results.failed.push({
              index: batch[batchIndex],
              error: result.reason.message
            });
          }
        });

        // 推送进度更新
        this.socketService.emitToUser(userId, 'registration_progress', {
          registrationId,
          completed: results.success.length + results.failed.length,
          total: count,
          success: results.success.length,
          failed: results.failed.length
        });
      }

      results.status = 'completed';
      results.completedAt = new Date();

      this.socketService.emitToUser(userId, 'registration_completed', results);
      return results;

    } catch (error) {
      this.logger.error('Telegram 批量注册失败:', error);
      throw error;
    }
  }

  /**
   * 单个 Telegram 账号注册
   */
  async registerSingleTelegram(userId, config) {
    const {
      index,
      provider,
      country,
      proxy,
      accountPrefix,
      registrationId
    } = config;

    let phoneNumber = null;
    let account = null;

    try {
      this.logger.info(`开始注册 Telegram 账号 #${index}`);

      // 1. 获取手机号
      const phoneData = await this.phoneService.getPhoneNumber(provider, country, 'telegram');
      phoneNumber = phoneData.phoneNumber;

      // 2. 使用 Telegram API 发送验证码
      await this.sendTelegramVerificationCode(phoneNumber);

      // 3. 获取验证码
      const verificationCode = await this.phoneService.getVerificationCode(phoneNumber, 300000);

      // 4. 验证并创建会话
      const sessionData = await this.verifyTelegramCode(phoneNumber, verificationCode.code);

      // 5. 创建账号记录
      const accountName = `${accountPrefix}_${index}_${Date.now()}`;
      account = await this.accountManager.createAccount(userId, {
        name: accountName,
        type: 'telegram',
        phoneNumber: phoneNumber,
        sessionData: sessionData,
        config: {
          isEnabled: true,
          autoReconnect: true,
          proxy: proxy
        }
      });

      // 6. 启动 Telegram 实例
      await this.accountManager.startAccount(account.accountId);

      // 7. 释放手机号
      await this.phoneService.releasePhoneNumber(phoneNumber);

      const result = {
        index,
        accountId: account.accountId,
        accountName,
        phoneNumber,
        status: 'success',
        registeredAt: new Date()
      };

      this.logger.info(`Telegram 账号注册成功: ${accountName} - ${phoneNumber}`);
      
      this.socketService.emitToUser(userId, 'account_registered', {
        registrationId,
        platform: 'telegram',
        account: result
      });

      return result;

    } catch (error) {
      this.logger.error(`Telegram 账号注册失败 #${index}:`, error);

      if (phoneNumber) {
        await this.phoneService.releasePhoneNumber(phoneNumber);
      }
      
      if (account) {
        await this.accountManager.deleteAccount(account.accountId);
      }

      throw new Error(`注册失败 #${index}: ${error.message}`);
    }
  }

  /**
   * 账号养号服务
   */
  async startAccountNurturing(accountIds, config = {}) {
    const {
      duration = 7, // 养号天数
      activityLevel = 'medium', // low, medium, high
      interactions = {
        viewStories: true,
        likeMessages: true,
        joinGroups: true,
        sendMessages: false
      }
    } = config;

    for (const accountId of accountIds) {
      await this.nurtureSingleAccount(accountId, {
        duration,
        activityLevel,
        interactions
      });
    }
  }

  async nurtureSingleAccount(accountId, config) {
    const nurturingPlan = this.generateNurturingPlan(config);
    
    for (const activity of nurturingPlan) {
      try {
        await this.executeNurturingActivity(accountId, activity);
        
        // 随机延迟
        const delay = Math.random() * 60000 + 30000; // 30秒到1.5分钟
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        this.logger.error(`养号活动执行失败: ${accountId}`, error);
      }
    }
  }

  generateNurturingPlan(config) {
    const activities = [];
    const { activityLevel, interactions, duration } = config;

    const dailyActivities = this.getDailyActivityCount(activityLevel);
    
    for (let day = 0; day < duration; day++) {
      for (let i = 0; i < dailyActivities; i++) {
        const activity = this.selectRandomActivity(interactions);
        activities.push({
          ...activity,
          scheduledAt: new Date(Date.now() + day * 24 * 60 * 60 * 1000 + Math.random() * 24 * 60 * 60 * 1000)
        });
      }
    }

    return activities.sort((a, b) => a.scheduledAt - b.scheduledAt);
  }

  getDailyActivityCount(level) {
    const counts = {
      low: 3,
      medium: 8,
      high: 15
    };
    return counts[level] || 5;
  }

  selectRandomActivity(interactions) {
    const activities = [];
    
    if (interactions.viewStories) {
      activities.push({ type: 'view_story' });
    }
    if (interactions.likeMessages) {
      activities.push({ type: 'like_message' });
    }
    if (interactions.joinGroups) {
      activities.push({ type: 'join_group' });
    }
    if (interactions.sendMessages) {
      activities.push({ type: 'send_message' });
    }

    return activities[Math.floor(Math.random() * activities.length)];
  }

  async executeNurturingActivity(accountId, activity) {
    switch (activity.type) {
      case 'view_story':
        await this.viewRandomStory(accountId);
        break;
      case 'like_message':
        await this.likeRandomMessage(accountId);
        break;
      case 'join_group':
        await this.joinRandomGroup(accountId);
        break;
      case 'send_message':
        await this.sendRandomMessage(accountId);
        break;
    }
  }

  // 工具方法
  createBatches(total, batchSize) {
    const batches = [];
    for (let i = 0; i < total; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, total); j++) {
        batch.push(j + 1);
      }
      batches.push(batch);
    }
    return batches;
  }

  async waitForQRCode(accountId, timeout) {
    // 等待二维码生成的逻辑
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('等待二维码超时'));
      }, timeout);

      // 监听二维码生成事件
      const checkQR = setInterval(async () => {
        try {
          const qrCode = this.accountManager.whatsappService.getQRCode(accountId);
          if (qrCode) {
            clearTimeout(timer);
            clearInterval(checkQR);
            resolve(qrCode);
          }
        } catch (error) {
          // 继续等待
        }
      }, 2000);
    });
  }

  async simulateQRCodeScan(accountId, phoneNumber) {
    // 这里应该实现自动扫码逻辑
    // 可以使用无头浏览器或移动设备模拟器
    this.logger.info(`模拟扫码: ${accountId} - ${phoneNumber}`);
  }

  async inputVerificationCode(accountId, code) {
    // 向 WhatsApp 实例输入验证码
    this.logger.info(`输入验证码: ${accountId} - ${code}`);
  }

  async waitForConnection(accountId, timeout) {
    // 等待连接成功
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('等待连接超时'));
      }, timeout);

      const checkConnection = setInterval(async () => {
        try {
          const status = await this.accountManager.getAccountStatus(accountId);
          if (status.account.status === 'connected') {
            clearTimeout(timer);
            clearInterval(checkConnection);
            resolve(true);
          }
        } catch (error) {
          // 继续等待
        }
      }, 5000);
    });
  }

  async sendTelegramVerificationCode(phoneNumber) {
    // 发送 Telegram 验证码
    this.logger.info(`发送 Telegram 验证码: ${phoneNumber}`);
  }

  async verifyTelegramCode(phoneNumber, code) {
    // 验证 Telegram 验证码并返回会话数据
    this.logger.info(`验证 Telegram 验证码: ${phoneNumber} - ${code}`);
    return { sessionString: 'encrypted_session_data' };
  }

  // 养号相关方法
  async viewRandomStory(accountId) {
    this.logger.info(`查看随机故事: ${accountId}`);
  }

  async likeRandomMessage(accountId) {
    this.logger.info(`点赞随机消息: ${accountId}`);
  }

  async joinRandomGroup(accountId) {
    this.logger.info(`加入随机群组: ${accountId}`);
  }

  async sendRandomMessage(accountId) {
    this.logger.info(`发送随机消息: ${accountId}`);
  }
}

module.exports = AutoRegistrationService;