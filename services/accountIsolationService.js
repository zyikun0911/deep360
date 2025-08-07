/**
 * 账号隔离服务 - 指纹伪装和IP隔离
 */

const crypto = require('crypto');
const { createModuleLogger } = require('../utils/logger');
const Account = require('../models/Account');

class AccountIsolationService {
  constructor() {
    this.logger = createModuleLogger('AccountIsolation');
    this.fingerprints = new Map(); // 账号指纹缓存
    this.proxyPool = new Map(); // 代理池
    this.ipSessions = new Map(); // IP会话管理
    this.deviceProfiles = new Map(); // 设备配置文件
  }

  /**
   * 初始化账号隔离服务
   */
  async initialize() {
    try {
      this.logger.info('初始化账号隔离服务...');
      
      // 加载代理池
      await this.loadProxyPool();
      
      // 加载设备配置文件
      await this.loadDeviceProfiles();
      
      // 初始化指纹数据库
      await this.initializeFingerprintDatabase();
      
      this.logger.info('账号隔离服务初始化完成');
    } catch (error) {
      this.logger.error('账号隔离服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 为账号创建唯一指纹环境
   */
  async createAccountFingerprint(accountId, options = {}) {
    try {
      const {
        platform = 'whatsapp',
        region = 'random',
        deviceType = 'mobile',
        riskLevel = 'low'
      } = options;

      // 生成设备指纹
      const deviceFingerprint = this.generateDeviceFingerprint(deviceType, region);
      
      // 生成浏览器指纹
      const browserFingerprint = this.generateBrowserFingerprint(region);
      
      // 分配专用IP
      const dedicatedProxy = await this.assignDedicatedProxy(accountId, region);
      
      // 生成网络指纹
      const networkFingerprint = this.generateNetworkFingerprint(dedicatedProxy);
      
      // 生成行为模式
      const behaviorProfile = this.generateBehaviorProfile(platform, riskLevel);

      const fingerprint = {
        accountId,
        platform,
        createdAt: new Date(),
        device: deviceFingerprint,
        browser: browserFingerprint,
        network: networkFingerprint,
        proxy: dedicatedProxy,
        behavior: behaviorProfile,
        isolation: {
          containerId: null,
          processId: null,
          namespace: `account_${accountId}`,
          isolated: true
        }
      };

      // 保存指纹信息
      this.fingerprints.set(accountId, fingerprint);
      
      // 持久化到数据库
      await this.saveFingerprintToDatabase(fingerprint);

      this.logger.info(`账号指纹创建成功: ${accountId}`, {
        deviceType: deviceFingerprint.type,
        region: dedicatedProxy.region,
        proxyIP: dedicatedProxy.ip
      });

      return fingerprint;

    } catch (error) {
      this.logger.error(`创建账号指纹失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 生成设备指纹
   */
  generateDeviceFingerprint(deviceType, region) {
    const deviceConfigs = {
      mobile: {
        android: {
          userAgents: [
            'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 10; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.105 Mobile Safari/537.36'
          ],
          models: ['SM-G991B', 'Pixel 6', 'SM-A505F', 'OnePlus 9', 'Xiaomi Mi 11'],
          androidVersions: ['10', '11', '12', '13'],
          buildNumbers: ['QP1A.190711.020', 'RQ3A.210905.001', 'SP1A.210812.016']
        },
        ios: {
          userAgents: [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
          ],
          models: ['iPhone 13', 'iPhone 12', 'iPhone 11', 'iPhone SE'],
          iosVersions: ['14.7.1', '15.0', '15.1', '16.0'],
          buildNumbers: ['18G82', '19A346', '19B74', '20A362']
        }
      },
      desktop: {
        windows: {
          userAgents: [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
          ],
          versions: ['10.0', '11.0'],
          architectures: ['x64', 'x86']
        },
        mac: {
          userAgents: [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          ],
          versions: ['10.15.7', '11.6', '12.0'],
          models: ['MacBookPro', 'MacBookAir', 'iMac']
        }
      }
    };

    // 根据地区选择合适的设备配置
    const platformConfigs = deviceConfigs[deviceType];
    const platforms = Object.keys(platformConfigs);
    const selectedPlatform = platforms[Math.floor(Math.random() * platforms.length)];
    const config = platformConfigs[selectedPlatform];

    const fingerprint = {
      type: deviceType,
      platform: selectedPlatform,
      userAgent: config.userAgents[Math.floor(Math.random() * config.userAgents.length)],
      model: config.models ? config.models[Math.floor(Math.random() * config.models.length)] : null,
      version: config.versions ? config.versions[Math.floor(Math.random() * config.versions.length)] : 
               config.androidVersions ? config.androidVersions[Math.floor(Math.random() * config.androidVersions.length)] :
               config.iosVersions ? config.iosVersions[Math.floor(Math.random() * config.iosVersions.length)] : null,
      buildNumber: config.buildNumbers ? config.buildNumbers[Math.floor(Math.random() * config.buildNumbers.length)] : null,
      screenResolution: this.generateScreenResolution(deviceType),
      timezone: this.getTimezoneByRegion(region),
      language: this.getLanguageByRegion(region),
      hardwareFingerprint: this.generateHardwareFingerprint()
    };

    return fingerprint;
  }

  /**
   * 生成浏览器指纹
   */
  generateBrowserFingerprint(region) {
    const browsers = [
      {
        name: 'Chrome',
        versions: ['91.0.4472.124', '92.0.4515.107', '93.0.4577.82', '94.0.4606.61'],
        engines: ['WebKit/537.36']
      },
      {
        name: 'Firefox', 
        versions: ['89.0', '90.0', '91.0', '92.0'],
        engines: ['Gecko/20100101']
      },
      {
        name: 'Safari',
        versions: ['14.1.2', '15.0', '15.1'],
        engines: ['WebKit/605.1.15']
      }
    ];

    const selectedBrowser = browsers[Math.floor(Math.random() * browsers.length)];
    
    return {
      name: selectedBrowser.name,
      version: selectedBrowser.versions[Math.floor(Math.random() * selectedBrowser.versions.length)],
      engine: selectedBrowser.engines[Math.floor(Math.random() * selectedBrowser.engines.length)],
      plugins: this.generateBrowserPlugins(),
      webgl: this.generateWebGLFingerprint(),
      canvas: this.generateCanvasFingerprint(),
      audio: this.generateAudioFingerprint(),
      fonts: this.generateFontFingerprint(),
      cookiesEnabled: true,
      doNotTrack: Math.random() > 0.7,
      localStorage: true,
      sessionStorage: true,
      indexedDB: true,
      webWorkers: true,
      serviceWorkers: true
    };
  }

  /**
   * 生成网络指纹
   */
  generateNetworkFingerprint(proxy) {
    return {
      ip: proxy.ip,
      port: proxy.port,
      type: proxy.type,
      country: proxy.country,
      region: proxy.region,
      city: proxy.city,
      isp: proxy.isp,
      asn: proxy.asn,
      dns: this.generateDNSFingerprint(proxy.country),
      mtu: 1500,
      tcpWindowSize: 65535,
      ttl: this.generateTTL(proxy.country),
      httpHeaders: this.generateHTTPHeaders()
    };
  }

  /**
   * 分配专用代理IP
   */
  async assignDedicatedProxy(accountId, region = 'random') {
    try {
      // 从代理池中选择可用代理
      const availableProxies = Array.from(this.proxyPool.values())
        .filter(proxy => !proxy.assigned && (region === 'random' || proxy.region === region));

      if (availableProxies.length === 0) {
        throw new Error(`没有可用的${region}地区代理`);
      }

      // 随机选择一个代理
      const selectedProxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
      
      // 标记为已分配
      selectedProxy.assigned = true;
      selectedProxy.assignedTo = accountId;
      selectedProxy.assignedAt = new Date();

      // 更新代理池
      this.proxyPool.set(selectedProxy.id, selectedProxy);

      // 测试代理连接
      const isValid = await this.testProxyConnection(selectedProxy);
      if (!isValid) {
        // 如果代理不可用，标记为失效并重新分配
        selectedProxy.status = 'failed';
        return await this.assignDedicatedProxy(accountId, region);
      }

      this.logger.info(`代理分配成功: ${accountId}`, {
        proxyId: selectedProxy.id,
        ip: selectedProxy.ip,
        country: selectedProxy.country
      });

      return selectedProxy;

    } catch (error) {
      this.logger.error(`代理分配失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 生成行为模式
   */
  generateBehaviorProfile(platform, riskLevel) {
    const profiles = {
      low: {
        activityPattern: 'conservative',
        messageFrequency: { min: 10, max: 50, unit: 'per_day' },
        onlineHours: { start: 9, end: 22 },
        breakPatterns: [
          { type: 'lunch', start: 12, duration: 60 },
          { type: 'evening', start: 18, duration: 120 }
        ],
        responseDelay: { min: 30, max: 300, unit: 'seconds' },
        typoRate: 0.02,
        emojiUsage: 0.15
      },
      medium: {
        activityPattern: 'moderate',
        messageFrequency: { min: 50, max: 150, unit: 'per_day' },
        onlineHours: { start: 8, end: 23 },
        breakPatterns: [
          { type: 'morning', start: 10, duration: 15 },
          { type: 'lunch', start: 12, duration: 45 },
          { type: 'afternoon', start: 15, duration: 15 }
        ],
        responseDelay: { min: 10, max: 180, unit: 'seconds' },
        typoRate: 0.03,
        emojiUsage: 0.25
      },
      high: {
        activityPattern: 'aggressive',
        messageFrequency: { min: 150, max: 500, unit: 'per_day' },
        onlineHours: { start: 6, end: 24 },
        breakPatterns: [
          { type: 'short', start: 14, duration: 10 }
        ],
        responseDelay: { min: 5, max: 60, unit: 'seconds' },
        typoRate: 0.01,
        emojiUsage: 0.35
      }
    };

    const baseProfile = profiles[riskLevel];
    
    return {
      ...baseProfile,
      platform,
      humanization: {
        randomDelay: true,
        naturalTyping: true,
        mouseMovement: true,
        scrollPattern: 'human-like'
      },
      antiDetection: {
        headerRotation: true,
        cookieManagement: true,
        sessionPersistence: true,
        browserCache: true
      }
    };
  }

  /**
   * 创建隔离容器环境
   */
  async createIsolatedContainer(accountId, fingerprint) {
    try {
      const containerConfig = {
        image: 'deep360/account-runtime:latest',
        name: `account_${accountId}`,
        environment: {
          ACCOUNT_ID: accountId,
          USER_AGENT: fingerprint.device.userAgent,
          PROXY_HOST: fingerprint.proxy.ip,
          PROXY_PORT: fingerprint.proxy.port,
          PROXY_USER: fingerprint.proxy.username,
          PROXY_PASS: fingerprint.proxy.password,
          TIMEZONE: fingerprint.device.timezone,
          LANGUAGE: fingerprint.device.language,
          SCREEN_WIDTH: fingerprint.device.screenResolution.width,
          SCREEN_HEIGHT: fingerprint.device.screenResolution.height
        },
        resources: {
          memory: '512m',
          cpu: '0.5',
          disk: '2g'
        },
        network: {
          mode: 'bridge',
          proxy: fingerprint.proxy
        },
        volumes: [
          {
            host: `./data/accounts/${accountId}`,
            container: '/app/data'
          }
        ],
        security: {
          noNewPrivileges: true,
          readOnly: false,
          user: 'nobody:nobody'
        }
      };

      // 启动容器
      const container = await this.dockerManager.createContainer(containerConfig);
      await container.start();

      // 更新指纹信息
      fingerprint.isolation.containerId = container.id;
      fingerprint.isolation.isolated = true;

      this.logger.info(`隔离容器创建成功: ${accountId}`, {
        containerId: container.id,
        proxy: fingerprint.proxy.ip
      });

      return container;

    } catch (error) {
      this.logger.error(`创建隔离容器失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 验证账号隔离状态
   */
  async validateIsolation(accountId) {
    try {
      const fingerprint = this.fingerprints.get(accountId);
      if (!fingerprint) {
        return { isolated: false, reason: 'Fingerprint not found' };
      }

      const validations = {
        proxyActive: await this.validateProxyConnection(fingerprint.proxy),
        containerRunning: await this.validateContainer(fingerprint.isolation.containerId),
        ipUnique: await this.validateIPUniqueness(fingerprint.proxy.ip, accountId),
        fingerprintUnique: await this.validateFingerprintUniqueness(fingerprint, accountId)
      };

      const allValid = Object.values(validations).every(v => v);

      return {
        isolated: allValid,
        validations,
        fingerprint: fingerprint.isolation
      };

    } catch (error) {
      this.logger.error(`验证账号隔离失败: ${accountId}`, error);
      return { isolated: false, error: error.message };
    }
  }

  /**
   * 轮换账号指纹
   */
  async rotateFingerprint(accountId, options = {}) {
    try {
      const { keepProxy = false, keepDevice = false } = options;
      
      const currentFingerprint = this.fingerprints.get(accountId);
      if (!currentFingerprint) {
        throw new Error('账号指纹不存在');
      }

      // 创建新指纹
      const newFingerprint = await this.createAccountFingerprint(accountId, {
        platform: currentFingerprint.platform,
        region: currentFingerprint.proxy.region,
        deviceType: currentFingerprint.device.type
      });

      // 选择性保留部分指纹信息
      if (keepProxy) {
        newFingerprint.proxy = currentFingerprint.proxy;
        newFingerprint.network = currentFingerprint.network;
      }

      if (keepDevice) {
        newFingerprint.device = currentFingerprint.device;
      }

      // 停止旧容器
      if (currentFingerprint.isolation.containerId) {
        await this.stopContainer(currentFingerprint.isolation.containerId);
      }

      // 释放旧代理（如果不保留）
      if (!keepProxy && currentFingerprint.proxy) {
        await this.releaseProxy(currentFingerprint.proxy.id);
      }

      // 创建新容器
      await this.createIsolatedContainer(accountId, newFingerprint);

      this.logger.info(`账号指纹轮换成功: ${accountId}`, {
        keepProxy,
        keepDevice,
        newProxyIP: newFingerprint.proxy.ip
      });

      return newFingerprint;

    } catch (error) {
      this.logger.error(`账号指纹轮换失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 获取账号隔离统计
   */
  async getIsolationStats() {
    try {
      const stats = {
        totalAccounts: this.fingerprints.size,
        isolatedAccounts: 0,
        activeProxies: 0,
        availableProxies: 0,
        failedProxies: 0,
        containerStats: {
          running: 0,
          stopped: 0,
          failed: 0
        },
        regionDistribution: {},
        deviceTypeDistribution: {}
      };

      // 统计指纹信息
      for (const [accountId, fingerprint] of this.fingerprints) {
        if (fingerprint.isolation.isolated) {
          stats.isolatedAccounts++;
        }

        // 地区分布
        const region = fingerprint.proxy.region;
        stats.regionDistribution[region] = (stats.regionDistribution[region] || 0) + 1;

        // 设备类型分布
        const deviceType = fingerprint.device.type;
        stats.deviceTypeDistribution[deviceType] = (stats.deviceTypeDistribution[deviceType] || 0) + 1;
      }

      // 统计代理信息
      for (const proxy of this.proxyPool.values()) {
        if (proxy.assigned) {
          stats.activeProxies++;
        } else if (proxy.status === 'active') {
          stats.availableProxies++;
        } else if (proxy.status === 'failed') {
          stats.failedProxies++;
        }
      }

      // 统计容器状态
      stats.containerStats = await this.getContainerStats();

      return stats;

    } catch (error) {
      this.logger.error('获取隔离统计失败:', error);
      throw error;
    }
  }

  /**
   * 工具方法：生成屏幕分辨率
   */
  generateScreenResolution(deviceType) {
    const resolutions = {
      mobile: [
        { width: 375, height: 812 }, // iPhone X
        { width: 414, height: 896 }, // iPhone 11
        { width: 360, height: 640 }, // Android
        { width: 412, height: 869 }  // Pixel
      ],
      desktop: [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 2560, height: 1440 }
      ]
    };

    const deviceResolutions = resolutions[deviceType] || resolutions.desktop;
    return deviceResolutions[Math.floor(Math.random() * deviceResolutions.length)];
  }

  /**
   * 工具方法：根据地区获取时区
   */
  getTimezoneByRegion(region) {
    const timezones = {
      'us': 'America/New_York',
      'uk': 'Europe/London', 
      'de': 'Europe/Berlin',
      'jp': 'Asia/Tokyo',
      'cn': 'Asia/Shanghai',
      'sg': 'Asia/Singapore',
      'au': 'Australia/Sydney',
      'random': 'UTC'
    };

    return timezones[region] || timezones.random;
  }

  /**
   * 工具方法：根据地区获取语言
   */
  getLanguageByRegion(region) {
    const languages = {
      'us': 'en-US',
      'uk': 'en-GB',
      'de': 'de-DE',
      'jp': 'ja-JP',
      'cn': 'zh-CN',
      'sg': 'en-SG',
      'au': 'en-AU',
      'random': 'en-US'
    };

    return languages[region] || languages.random;
  }

  /**
   * 生成硬件指纹
   */
  generateHardwareFingerprint() {
    return {
      cpu: {
        cores: Math.floor(Math.random() * 8) + 1,
        architecture: Math.random() > 0.5 ? 'x64' : 'arm64'
      },
      memory: Math.floor(Math.random() * 8) + 2, // 2-10GB
      gpu: this.generateGPUFingerprint(),
      sensors: this.generateSensorFingerprint(),
      battery: this.generateBatteryFingerprint()
    };
  }

  /**
   * 其他指纹生成方法...
   */
  generateBrowserPlugins() {
    const commonPlugins = [
      'Chrome PDF Plugin',
      'Chrome PDF Viewer', 
      'Native Client',
      'Widevine Content Decryption Module'
    ];
    
    return commonPlugins.slice(0, Math.floor(Math.random() * commonPlugins.length) + 1);
  }

  generateWebGLFingerprint() {
    return {
      vendor: 'WebKit',
      renderer: 'WebKit WebGL',
      version: 'WebGL 1.0'
    };
  }

  generateCanvasFingerprint() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateAudioFingerprint() {
    return {
      sampleRate: 44100,
      channels: 2,
      bitDepth: 16
    };
  }

  generateFontFingerprint() {
    const commonFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
      'Verdana', 'Georgia', 'Palatino', 'Garamond'
    ];
    
    return commonFonts.slice(0, Math.floor(Math.random() * 5) + 3);
  }
}

module.exports = AccountIsolationService;