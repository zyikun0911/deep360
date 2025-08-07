/**
 * 容器管理服务 - Docker容器隔离管理
 */

const Docker = require('dockerode');
const path = require('path');
const fs = require('fs').promises;
const { createModuleLogger } = require('../utils/logger');

class ContainerManager {
  constructor() {
    this.logger = createModuleLogger('ContainerManager');
    this.docker = new Docker();
    this.containers = new Map(); // 容器实例缓存
    this.networks = new Map(); // 网络配置缓存
    this.volumes = new Map(); // 数据卷缓存
    this.resourceLimits = {
      memory: '512m',
      cpu: '0.5',
      disk: '2g',
      networkBandwidth: '10m'
    };
  }

  /**
   * 初始化容器管理器
   */
  async initialize() {
    try {
      this.logger.info('初始化容器管理器...');

      // 检查Docker连接
      await this.verifyDockerConnection();

      // 创建基础网络
      await this.createBaseNetworks();

      // 构建基础镜像
      await this.buildBaseImages();

      // 清理僵尸容器
      await this.cleanupZombieContainers();

      this.logger.info('容器管理器初始化完成');
    } catch (error) {
      this.logger.error('容器管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 验证Docker连接
   */
  async verifyDockerConnection() {
    try {
      const info = await this.docker.info();
      this.logger.info('Docker连接成功', {
        version: info.ServerVersion,
        containers: info.Containers,
        images: info.Images
      });
    } catch (error) {
      throw new Error(`Docker连接失败: ${error.message}`);
    }
  }

  /**
   * 创建基础网络
   */
  async createBaseNetworks() {
    try {
      // 创建隔离网络
      const isolationNetwork = await this.createNetwork('deep360-isolation', {
        Driver: 'bridge',
        IPAM: {
          Config: [{
            Subnet: '172.30.0.0/16',
            Gateway: '172.30.0.1'
          }]
        },
        Options: {
          'com.docker.network.enable_ipv6': 'false',
          'com.docker.network.bridge.enable_ip_masquerade': 'true'
        }
      });

      this.networks.set('isolation', isolationNetwork);
      this.logger.info('隔离网络创建成功');

      // 创建代理网络
      const proxyNetwork = await this.createNetwork('deep360-proxy', {
        Driver: 'bridge',
        IPAM: {
          Config: [{
            Subnet: '172.31.0.0/16',
            Gateway: '172.31.0.1'
          }]
        }
      });

      this.networks.set('proxy', proxyNetwork);
      this.logger.info('代理网络创建成功');

    } catch (error) {
      this.logger.error('创建基础网络失败:', error);
      throw error;
    }
  }

  /**
   * 创建网络
   */
  async createNetwork(name, config) {
    try {
      // 检查网络是否已存在
      const networks = await this.docker.listNetworks();
      const existingNetwork = networks.find(net => net.Name === name);
      
      if (existingNetwork) {
        this.logger.info(`网络已存在: ${name}`);
        return this.docker.getNetwork(existingNetwork.Id);
      }

      // 创建新网络
      const network = await this.docker.createNetwork({
        Name: name,
        ...config
      });

      this.logger.info(`网络创建成功: ${name}`);
      return network;

    } catch (error) {
      this.logger.error(`创建网络失败: ${name}`, error);
      throw error;
    }
  }

  /**
   * 构建基础镜像
   */
  async buildBaseImages() {
    try {
      // 检查基础镜像是否存在
      const images = await this.docker.listImages();
      const baseImageExists = images.some(img => 
        img.RepoTags && img.RepoTags.includes('deep360/account-runtime:latest')
      );

      if (baseImageExists) {
        this.logger.info('基础镜像已存在');
        return;
      }

      // 构建基础镜像
      await this.buildAccountRuntimeImage();

    } catch (error) {
      this.logger.error('构建基础镜像失败:', error);
      throw error;
    }
  }

  /**
   * 构建账号运行时镜像
   */
  async buildAccountRuntimeImage() {
    const dockerfile = `
FROM node:18-alpine

# 安装必要的系统包
RUN apk add --no-cache \\
    chromium \\
    nss \\
    freetype \\
    freetype-dev \\
    harfbuzz \\
    ca-certificates \\
    ttf-freefont \\
    curl \\
    wget \\
    xvfb \\
    dbus \\
    procps

# 设置Chrome环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \\
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 创建应用用户
RUN addgroup -g 1001 -S appuser && \\
    adduser -S appuser -u 1001 -G appuser

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制应用代码
COPY --chown=appuser:appuser ./runtime ./

# 创建数据目录
RUN mkdir -p /app/data /app/logs /app/profiles && \\
    chown -R appuser:appuser /app

# 切换到非root用户
USER appuser

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "index.js"]
`;

    try {
      // 创建构建上下文
      const buildContext = await this.createBuildContext(dockerfile);
      
      // 构建镜像
      const stream = await this.docker.buildImage(buildContext, {
        t: 'deep360/account-runtime:latest'
      });

      // 等待构建完成
      await this.followBuildProgress(stream);

      this.logger.info('账号运行时镜像构建成功');

    } catch (error) {
      this.logger.error('构建账号运行时镜像失败:', error);
      throw error;
    }
  }

  /**
   * 为账号创建隔离容器
   */
  async createAccountContainer(accountId, config) {
    try {
      const {
        fingerprint,
        proxy,
        platform,
        resources = this.resourceLimits
      } = config;

      // 创建数据卷
      const dataVolume = await this.createAccountVolume(accountId);

      // 配置容器参数
      const containerConfig = {
        Image: 'deep360/account-runtime:latest',
        name: `account_${accountId}`,
        Hostname: `account-${accountId}`,
        Env: [
          `ACCOUNT_ID=${accountId}`,
          `PLATFORM=${platform}`,
          `USER_AGENT=${fingerprint.device.userAgent}`,
          `SCREEN_WIDTH=${fingerprint.device.screenResolution.width}`,
          `SCREEN_HEIGHT=${fingerprint.device.screenResolution.height}`,
          `TIMEZONE=${fingerprint.device.timezone}`,
          `LANGUAGE=${fingerprint.device.language}`,
          `PROXY_HOST=${proxy.ip}`,
          `PROXY_PORT=${proxy.port}`,
          `PROXY_USER=${proxy.username}`,
          `PROXY_PASS=${proxy.password}`,
          `NODE_ENV=production`
        ],
        HostConfig: {
          // 资源限制
          Memory: this.parseMemory(resources.memory),
          CpuShares: this.parseCpu(resources.cpu),
          
          // 网络配置
          NetworkMode: 'deep360-isolation',
          
          // 存储配置
          Binds: [
            `${dataVolume.name}:/app/data`,
            `/tmp/.X11-unix:/tmp/.X11-unix:rw`
          ],
          
          // 安全配置
          SecurityOpt: [
            'no-new-privileges:true',
            'apparmor:docker-default'
          ],
          
          // 只读根文件系统
          ReadonlyRootfs: false,
          
          // 禁用特权
          Privileged: false,
          
          // 限制设备访问
          DeviceCgroupRules: [
            'c 1:* rmw',  // /dev/null, /dev/zero等
            'c 5:* rmw',  // /dev/tty等
            'c 136:* rmw' // /dev/pts/*
          ],
          
          // 系统调用限制
          Sysctls: {
            'net.ipv4.ip_forward': '0',
            'net.ipv6.conf.all.forwarding': '0'
          },
          
          // DNS配置
          Dns: ['8.8.8.8', '1.1.1.1'],
          
          // 临时文件系统
          Tmpfs: {
            '/tmp': 'noexec,nosuid,size=100m',
            '/var/tmp': 'noexec,nosuid,size=50m'
          }
        },
        
        // 网络配置
        NetworkingConfig: {
          EndpointsConfig: {
            'deep360-isolation': {
              IPAMConfig: {
                IPv4Address: await this.allocateIP(accountId)
              }
            }
          }
        },
        
        // 健康检查
        Healthcheck: {
          Test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
          Interval: 30000000000, // 30秒
          Timeout: 10000000000,  // 10秒
          Retries: 3
        },
        
        // 重启策略
        RestartPolicy: {
          Name: 'unless-stopped'
        },
        
        // 标签
        Labels: {
          'deep360.account.id': accountId,
          'deep360.platform': platform,
          'deep360.isolation': 'true',
          'deep360.created': new Date().toISOString()
        }
      };

      // 创建容器
      const container = await this.docker.createContainer(containerConfig);

      // 启动容器
      await container.start();

      // 缓存容器实例
      this.containers.set(accountId, {
        container,
        accountId,
        status: 'running',
        createdAt: new Date(),
        config: containerConfig
      });

      this.logger.info(`账号容器创建成功: ${accountId}`, {
        containerId: container.id.substring(0, 12),
        ip: await this.getContainerIP(container)
      });

      return container;

    } catch (error) {
      this.logger.error(`创建账号容器失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 停止账号容器
   */
  async stopAccountContainer(accountId) {
    try {
      const containerInfo = this.containers.get(accountId);
      if (!containerInfo) {
        throw new Error(`容器不存在: ${accountId}`);
      }

      const { container } = containerInfo;

      // 优雅停止容器
      await container.stop({ t: 10 }); // 10秒超时

      // 更新状态
      containerInfo.status = 'stopped';
      containerInfo.stoppedAt = new Date();

      this.logger.info(`账号容器停止成功: ${accountId}`);

    } catch (error) {
      this.logger.error(`停止账号容器失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 删除账号容器
   */
  async removeAccountContainer(accountId, options = {}) {
    try {
      const { removeVolume = false } = options;
      
      const containerInfo = this.containers.get(accountId);
      if (!containerInfo) {
        this.logger.warn(`容器不存在: ${accountId}`);
        return;
      }

      const { container } = containerInfo;

      // 停止容器（如果还在运行）
      try {
        await container.stop({ t: 5 });
      } catch (error) {
        // 容器可能已经停止
        this.logger.debug(`容器已停止: ${accountId}`);
      }

      // 删除容器
      await container.remove({ force: true });

      // 删除数据卷（可选）
      if (removeVolume) {
        await this.removeAccountVolume(accountId);
      }

      // 从缓存中移除
      this.containers.delete(accountId);

      this.logger.info(`账号容器删除成功: ${accountId}`);

    } catch (error) {
      this.logger.error(`删除账号容器失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 重启账号容器
   */
  async restartAccountContainer(accountId) {
    try {
      const containerInfo = this.containers.get(accountId);
      if (!containerInfo) {
        throw new Error(`容器不存在: ${accountId}`);
      }

      const { container } = containerInfo;
      await container.restart();

      // 更新状态
      containerInfo.status = 'running';
      containerInfo.restartedAt = new Date();

      this.logger.info(`账号容器重启成功: ${accountId}`);

    } catch (error) {
      this.logger.error(`重启账号容器失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取容器状态
   */
  async getContainerStatus(accountId) {
    try {
      const containerInfo = this.containers.get(accountId);
      if (!containerInfo) {
        return { status: 'not_found' };
      }

      const { container } = containerInfo;
      const inspect = await container.inspect();

      return {
        status: inspect.State.Status,
        running: inspect.State.Running,
        startedAt: inspect.State.StartedAt,
        finishedAt: inspect.State.FinishedAt,
        exitCode: inspect.State.ExitCode,
        health: inspect.State.Health?.Status,
        resources: {
          memory: inspect.HostConfig.Memory,
          cpu: inspect.HostConfig.CpuShares
        },
        network: {
          ip: await this.getContainerIP(container),
          ports: inspect.NetworkSettings.Ports
        }
      };

    } catch (error) {
      this.logger.error(`获取容器状态失败: ${accountId}`, error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * 获取容器日志
   */
  async getContainerLogs(accountId, options = {}) {
    try {
      const {
        tail = 100,
        since = null,
        follow = false
      } = options;

      const containerInfo = this.containers.get(accountId);
      if (!containerInfo) {
        throw new Error(`容器不存在: ${accountId}`);
      }

      const { container } = containerInfo;
      
      const logOptions = {
        stdout: true,
        stderr: true,
        tail,
        follow
      };

      if (since) {
        logOptions.since = since;
      }

      const stream = await container.logs(logOptions);
      
      if (follow) {
        return stream;
      } else {
        return stream.toString();
      }

    } catch (error) {
      this.logger.error(`获取容器日志失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 执行容器命令
   */
  async execInContainer(accountId, command, options = {}) {
    try {
      const containerInfo = this.containers.get(accountId);
      if (!containerInfo) {
        throw new Error(`容器不存在: ${accountId}`);
      }

      const { container } = containerInfo;
      
      const exec = await container.exec({
        Cmd: Array.isArray(command) ? command : ['sh', '-c', command],
        AttachStdout: true,
        AttachStderr: true,
        ...options
      });

      const stream = await exec.start();
      const result = await this.streamToString(stream);

      return result;

    } catch (error) {
      this.logger.error(`容器命令执行失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 创建账号数据卷
   */
  async createAccountVolume(accountId) {
    try {
      const volumeName = `deep360_account_${accountId}`;
      
      const volume = await this.docker.createVolume({
        Name: volumeName,
        Labels: {
          'deep360.account.id': accountId,
          'deep360.type': 'account-data'
        }
      });

      this.volumes.set(accountId, volume);
      return volume;

    } catch (error) {
      this.logger.error(`创建数据卷失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 删除账号数据卷
   */
  async removeAccountVolume(accountId) {
    try {
      const volume = this.volumes.get(accountId);
      if (volume) {
        await volume.remove();
        this.volumes.delete(accountId);
        this.logger.info(`数据卷删除成功: ${accountId}`);
      }
    } catch (error) {
      this.logger.error(`删除数据卷失败: ${accountId}`, error);
    }
  }

  /**
   * 获取容器统计信息
   */
  async getContainerStats() {
    try {
      const stats = {
        total: this.containers.size,
        running: 0,
        stopped: 0,
        failed: 0,
        resources: {
          totalMemory: 0,
          totalCPU: 0
        }
      };

      for (const [accountId, containerInfo] of this.containers) {
        try {
          const status = await this.getContainerStatus(accountId);
          
          if (status.running) stats.running++;
          else if (status.status === 'exited') stats.stopped++;
          else stats.failed++;

          stats.resources.totalMemory += status.resources?.memory || 0;
          stats.resources.totalCPU += status.resources?.cpu || 0;

        } catch (error) {
          stats.failed++;
        }
      }

      return stats;

    } catch (error) {
      this.logger.error('获取容器统计失败:', error);
      throw error;
    }
  }

  /**
   * 清理僵尸容器
   */
  async cleanupZombieContainers() {
    try {
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: ['deep360.isolation=true'] }
      });

      let cleanedCount = 0;

      for (const containerInfo of containers) {
        if (containerInfo.State === 'exited' || containerInfo.State === 'dead') {
          try {
            const container = this.docker.getContainer(containerInfo.Id);
            await container.remove({ force: true });
            cleanedCount++;
          } catch (error) {
            this.logger.warn(`清理容器失败: ${containerInfo.Id}`, error);
          }
        }
      }

      if (cleanedCount > 0) {
        this.logger.info(`清理僵尸容器: ${cleanedCount} 个`);
      }

    } catch (error) {
      this.logger.error('清理僵尸容器失败:', error);
    }
  }

  /**
   * 工具方法
   */
  parseMemory(memStr) {
    const units = { 'k': 1024, 'm': 1024 * 1024, 'g': 1024 * 1024 * 1024 };
    const match = memStr.toLowerCase().match(/^(\d+)([kmg]?)$/);
    if (!match) return 512 * 1024 * 1024; // 默认512MB
    
    const value = parseInt(match[1]);
    const unit = match[2] || '';
    return value * (units[unit] || 1);
  }

  parseCpu(cpuStr) {
    const value = parseFloat(cpuStr);
    return Math.round(value * 1024); // Docker CPU shares
  }

  async allocateIP(accountId) {
    // 简单的IP分配算法
    const hash = require('crypto').createHash('md5').update(accountId).digest('hex');
    const octet = parseInt(hash.substring(0, 2), 16) % 254 + 2; // 2-255
    return `172.30.0.${octet}`;
  }

  async getContainerIP(container) {
    try {
      const inspect = await container.inspect();
      const networks = inspect.NetworkSettings.Networks;
      const isolationNetwork = networks['deep360-isolation'];
      return isolationNetwork?.IPAddress || null;
    } catch (error) {
      return null;
    }
  }

  async streamToString(stream) {
    return new Promise((resolve, reject) => {
      let data = '';
      stream.on('data', chunk => data += chunk);
      stream.on('end', () => resolve(data));
      stream.on('error', reject);
    });
  }
}

module.exports = ContainerManager;