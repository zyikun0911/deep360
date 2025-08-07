const Docker = require('dockerode');
const Account = require('../models/Account');
const { v4: uuidv4 } = require('uuid');

class AccountManager {
  constructor(redisClient, logger) {
    this.redis = redisClient;
    this.logger = logger;
    this.docker = new Docker();
    this.instances = new Map(); // accountId -> instance info
    this.containers = new Map(); // accountId -> container
  }

  /**
   * 创建新账号
   */
  async createAccount(userId, accountData) {
    try {
      const accountId = uuidv4();
      
      const account = new Account({
        userId,
        accountId,
        name: accountData.name,
        type: accountData.type,
        phoneNumber: accountData.phoneNumber,
        botToken: accountData.botToken,
        config: {
          ...accountData.config,
          isEnabled: true
        }
      });

      await account.save();
      
      this.logger.info(`账号创建成功: ${accountId}`);
      return account;
    } catch (error) {
      this.logger.error('创建账号失败:', error);
      throw error;
    }
  }

  /**
   * 启动账号实例
   */
  async startAccount(accountId) {
    try {
      const account = await Account.findOne({ accountId });
      if (!account) {
        throw new Error(`账号不存在: ${accountId}`);
      }

      // 检查是否已经运行
      if (this.instances.has(accountId)) {
        this.logger.warn(`账号实例已在运行: ${accountId}`);
        return this.instances.get(accountId);
      }

      // 创建 Docker 容器
      const container = await this.createContainer(account);
      await container.start();

      // 获取容器信息
      const containerInfo = await container.inspect();
      const port = this.getContainerPort(containerInfo);

      // 更新账号状态
      account.status = 'scanning';
      account.container = {
        id: containerInfo.Id,
        name: containerInfo.Name,
        image: containerInfo.Config.Image,
        status: containerInfo.State.Status,
        port: port,
        createdAt: new Date()
      };
      await account.save();

      // 存储实例信息
      const instanceInfo = {
        accountId,
        container,
        port,
        status: 'starting',
        startedAt: new Date()
      };
      
      this.instances.set(accountId, instanceInfo);
      this.containers.set(accountId, container);

      // 设置容器监控
      this.setupContainerMonitoring(accountId, container);

      this.logger.info(`账号实例启动成功: ${accountId}, 端口: ${port}`);
      return instanceInfo;

    } catch (error) {
      this.logger.error(`启动账号实例失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 停止账号实例
   */
  async stopAccount(accountId) {
    try {
      const container = this.containers.get(accountId);
      if (container) {
        await container.stop();
        await container.remove();
        this.containers.delete(accountId);
      }

      this.instances.delete(accountId);

      // 更新账号状态
      await Account.updateOne(
        { accountId },
        { 
          status: 'disconnected',
          'container.status': 'stopped'
        }
      );

      this.logger.info(`账号实例已停止: ${accountId}`);
    } catch (error) {
      this.logger.error(`停止账号实例失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 重启账号实例
   */
  async restartAccount(accountId) {
    try {
      await this.stopAccount(accountId);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
      return await this.startAccount(accountId);
    } catch (error) {
      this.logger.error(`重启账号实例失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取账号状态
   */
  async getAccountStatus(accountId) {
    try {
      const account = await Account.findOne({ accountId });
      if (!account) {
        throw new Error(`账号不存在: ${accountId}`);
      }

      const instanceInfo = this.instances.get(accountId);
      const container = this.containers.get(accountId);

      let containerStatus = 'stopped';
      if (container) {
        const containerInfo = await container.inspect();
        containerStatus = containerInfo.State.Status;
      }

      return {
        account: account.toJSON(),
        instance: instanceInfo || null,
        containerStatus,
        isHealthy: account.isHealthy()
      };
    } catch (error) {
      this.logger.error(`获取账号状态失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取用户所有账号
   */
  async getUserAccounts(userId) {
    try {
      const accounts = await Account.find({ userId }).sort({ createdAt: -1 });
      
      const accountsWithStatus = await Promise.all(
        accounts.map(async (account) => {
          const instanceInfo = this.instances.get(account.accountId);
          const container = this.containers.get(account.accountId);
          
          let containerStatus = 'stopped';
          if (container) {
            try {
              const containerInfo = await container.inspect();
              containerStatus = containerInfo.State.Status;
            } catch (err) {
              containerStatus = 'error';
            }
          }

          return {
            ...account.toJSON(),
            instanceStatus: instanceInfo?.status || 'stopped',
            containerStatus,
            isHealthy: account.isHealthy()
          };
        })
      );

      return accountsWithStatus;
    } catch (error) {
      this.logger.error(`获取用户账号列表失败: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 更新账号配置
   */
  async updateAccountConfig(accountId, config) {
    try {
      const account = await Account.findOneAndUpdate(
        { accountId },
        { $set: { config: { ...config } } },
        { new: true }
      );

      if (!account) {
        throw new Error(`账号不存在: ${accountId}`);
      }

      // 如果实例正在运行，发送配置更新信号
      const instanceInfo = this.instances.get(accountId);
      if (instanceInfo) {
        await this.sendInstanceCommand(accountId, 'update_config', config);
      }

      this.logger.info(`账号配置已更新: ${accountId}`);
      return account;
    } catch (error) {
      this.logger.error(`更新账号配置失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 删除账号
   */
  async deleteAccount(accountId) {
    try {
      // 先停止实例
      await this.stopAccount(accountId);

      // 删除数据库记录
      await Account.deleteOne({ accountId });

      // 清理 Redis 数据
      await this.redis.del(`account:${accountId}:*`);

      this.logger.info(`账号已删除: ${accountId}`);
    } catch (error) {
      this.logger.error(`删除账号失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 创建 Docker 容器
   */
  async createContainer(account) {
    const containerName = `deep360-${account.type}-${account.accountId}`;
    const imageName = account.type === 'whatsapp' ? 
      'deep360/whatsapp-instance' : 'deep360/telegram-instance';

    const containerConfig = {
      Image: imageName,
      name: containerName,
      Env: [
        `ACCOUNT_ID=${account.accountId}`,
        `ACCOUNT_TYPE=${account.type}`,
        `REDIS_URL=${process.env.REDIS_URL}`,
        `API_ENDPOINT=${process.env.API_ENDPOINT || 'http://app:3000'}`,
        `PHONE_NUMBER=${account.phoneNumber || ''}`,
        `BOT_TOKEN=${account.botToken || ''}`
      ],
      HostConfig: {
        NetworkMode: 'deep360_deep360-network',
        RestartPolicy: { Name: 'unless-stopped' },
        Memory: 512 * 1024 * 1024, // 512MB
        CpuShares: 512
      },
      ExposedPorts: {
        '3001/tcp': {}
      },
      HostConfig: {
        ...this.containerConfig?.HostConfig,
        PortBindings: {
          '3001/tcp': [{ HostPort: '0' }] // 动态分配端口
        }
      }
    };

    return await this.docker.createContainer(containerConfig);
  }

  /**
   * 获取容器端口
   */
  getContainerPort(containerInfo) {
    try {
      const ports = containerInfo.NetworkSettings.Ports;
      const binding = ports['3001/tcp'];
      return binding && binding[0] ? parseInt(binding[0].HostPort) : null;
    } catch (error) {
      this.logger.error('获取容器端口失败:', error);
      return null;
    }
  }

  /**
   * 设置容器监控
   */
  setupContainerMonitoring(accountId, container) {
    // 监控容器状态
    const monitorInterval = setInterval(async () => {
      try {
        const containerInfo = await container.inspect();
        const status = containerInfo.State.Status;

        // 更新实例状态
        const instanceInfo = this.instances.get(accountId);
        if (instanceInfo) {
          instanceInfo.containerStatus = status;
        }

        // 更新数据库
        await Account.updateOne(
          { accountId },
          { 'container.status': status }
        );

        // 如果容器停止，清理监控
        if (status === 'exited' || status === 'dead') {
          clearInterval(monitorInterval);
          this.instances.delete(accountId);
          this.containers.delete(accountId);
        }

      } catch (error) {
        this.logger.error(`容器监控错误: ${accountId}`, error);
        clearInterval(monitorInterval);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 发送实例命令
   */
  async sendInstanceCommand(accountId, command, data = {}) {
    try {
      const message = {
        command,
        data,
        timestamp: new Date().toISOString()
      };

      await this.redis.publish(`instance:${accountId}:commands`, JSON.stringify(message));
      this.logger.info(`命令已发送到实例: ${accountId}, 命令: ${command}`);
    } catch (error) {
      this.logger.error(`发送实例命令失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    const healthReport = {
      totalAccounts: this.instances.size,
      runningInstances: 0,
      healthyInstances: 0,
      accounts: []
    };

    for (const [accountId, instanceInfo] of this.instances) {
      try {
        const account = await Account.findOne({ accountId });
        const container = this.containers.get(accountId);

        let containerStatus = 'unknown';
        if (container) {
          const containerInfo = await container.inspect();
          containerStatus = containerInfo.State.Status;
        }

        const isRunning = containerStatus === 'running';
        const isHealthy = account ? account.isHealthy() : false;

        if (isRunning) healthReport.runningInstances++;
        if (isHealthy) healthReport.healthyInstances++;

        healthReport.accounts.push({
          accountId,
          status: account?.status || 'unknown',
          containerStatus,
          isRunning,
          isHealthy,
          lastHeartbeat: account?.health?.lastHeartbeat
        });

      } catch (error) {
        this.logger.error(`健康检查失败: ${accountId}`, error);
      }
    }

    return healthReport;
  }
}

module.exports = AccountManager;