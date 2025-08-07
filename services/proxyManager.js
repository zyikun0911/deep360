/**
 * 代理管理服务 - IP池管理和轮换
 */

const axios = require('axios');
const { createModuleLogger } = require('../utils/logger');
const { EventEmitter } = require('events');

class ProxyManager extends EventEmitter {
  constructor() {
    super();
    this.logger = createModuleLogger('ProxyManager');
    this.proxyPool = new Map();
    this.proxyProviders = new Map();
    this.healthCheckInterval = null;
    this.rotationSchedule = new Map();
    this.blacklistedIPs = new Set();
  }

  /**
   * 初始化代理管理器
   */
  async initialize() {
    try {
      this.logger.info('初始化代理管理器...');
      
      // 注册代理提供商
      await this.registerProxyProviders();
      
      // 加载代理池
      await this.loadProxyPool();
      
      // 启动健康检查
      this.startHealthCheck();
      
      // 启动自动轮换
      this.startAutoRotation();
      
      this.logger.info('代理管理器初始化完成');
    } catch (error) {
      this.logger.error('代理管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 注册代理提供商
   */
  async registerProxyProviders() {
    // 注册多个代理提供商
    this.proxyProviders.set('luminati', {
      name: 'Luminati/Bright Data',
      type: 'residential',
      endpoint: 'http://zproxy.lum-superproxy.io',
      auth: {
        username: process.env.LUMINATI_USERNAME,
        password: process.env.LUMINATI_PASSWORD
      },
      regions: ['US', 'UK', 'DE', 'JP', 'SG', 'AU'],
      maxConcurrent: 100,
      cost: 0.01 // per MB
    });

    this.proxyProviders.set('smartproxy', {
      name: 'SmartProxy',
      type: 'residential',
      endpoint: 'gate.smartproxy.com',
      auth: {
        username: process.env.SMARTPROXY_USERNAME,
        password: process.env.SMARTPROXY_PASSWORD
      },
      regions: ['US', 'UK', 'DE', 'JP', 'CN'],
      maxConcurrent: 50,
      cost: 0.0075
    });

    this.proxyProviders.set('oxylabs', {
      name: 'Oxylabs',
      type: 'datacenter',
      endpoint: 'pr.oxylabs.io',
      auth: {
        username: process.env.OXYLABS_USERNAME,
        password: process.env.OXYLABS_PASSWORD
      },
      regions: ['US', 'UK', 'DE', 'SG'],
      maxConcurrent: 200,
      cost: 0.005
    });

    this.proxyProviders.set('proxy6', {
      name: 'Proxy6',
      type: 'ipv6',
      endpoint: 'proxy6.net',
      auth: {
        username: process.env.PROXY6_USERNAME,
        password: process.env.PROXY6_PASSWORD
      },
      regions: ['US', 'RU', 'DE', 'NL'],
      maxConcurrent: 1000,
      cost: 0.002
    });

    this.logger.info(`注册代理提供商: ${this.proxyProviders.size} 个`);
  }

  /**
   * 加载代理池
   */
  async loadProxyPool() {
    try {
      let totalProxies = 0;

      for (const [providerId, provider] of this.proxyProviders) {
        try {
          const proxies = await this.fetchProxiesFromProvider(providerId, provider);
          totalProxies += proxies.length;
          
          this.logger.info(`加载代理: ${provider.name} - ${proxies.length} 个`);
        } catch (error) {
          this.logger.error(`从 ${provider.name} 加载代理失败:`, error);
        }
      }

      this.logger.info(`代理池加载完成: 总计 ${totalProxies} 个代理`);
    } catch (error) {
      this.logger.error('加载代理池失败:', error);
      throw error;
    }
  }

  /**
   * 从提供商获取代理列表
   */
  async fetchProxiesFromProvider(providerId, provider) {
    const proxies = [];

    try {
      // 根据不同提供商的API获取代理
      switch (providerId) {
        case 'luminati':
          return await this.fetchLuminatiProxies(provider);
        case 'smartproxy':
          return await this.fetchSmartProxyProxies(provider);
        case 'oxylabs':
          return await this.fetchOxylabsProxies(provider);
        case 'proxy6':
          return await this.fetchProxy6Proxies(provider);
        default:
          this.logger.warn(`未知的代理提供商: ${providerId}`);
          return [];
      }
    } catch (error) {
      this.logger.error(`从 ${providerId} 获取代理失败:`, error);
      return [];
    }
  }

  /**
   * Luminati代理获取
   */
  async fetchLuminatiProxies(provider) {
    const proxies = [];
    
    // Luminati使用统一入口，通过session区分
    for (const region of provider.regions) {
      for (let i = 0; i < 20; i++) { // 每个地区20个会话
        const sessionId = `session_${region.toLowerCase()}_${i}`;
        
        const proxy = {
          id: `luminati_${region}_${i}`,
          providerId: 'luminati',
          type: 'http',
          ip: provider.endpoint,
          port: 22225,
          username: `${provider.auth.username}-session-${sessionId}`,
          password: provider.auth.password,
          region: region.toLowerCase(),
          country: region,
          city: this.getRandomCityByCountry(region),
          isp: 'Bright Data',
          asn: `AS${Math.floor(Math.random() * 60000) + 1000}`,
          status: 'active',
          assigned: false,
          lastUsed: null,
          successRate: 1.0,
          avgResponseTime: 0,
          dataUsage: 0,
          cost: provider.cost,
          createdAt: new Date()
        };

        this.proxyPool.set(proxy.id, proxy);
        proxies.push(proxy);
      }
    }

    return proxies;
  }

  /**
   * SmartProxy代理获取
   */
  async fetchSmartProxyProxies(provider) {
    const proxies = [];
    
    for (const region of provider.regions) {
      // SmartProxy使用sticky session
      for (let i = 0; i < 15; i++) {
        const sessionId = Math.random().toString(36).substring(7);
        
        const proxy = {
          id: `smartproxy_${region}_${i}`,
          providerId: 'smartproxy',
          type: 'http',
          ip: provider.endpoint,
          port: 10000,
          username: `${provider.auth.username}-country-${region.toLowerCase()}-session-${sessionId}`,
          password: provider.auth.password,
          region: region.toLowerCase(),
          country: region,
          city: this.getRandomCityByCountry(region),
          isp: 'SmartProxy',
          asn: `AS${Math.floor(Math.random() * 50000) + 2000}`,
          status: 'active',
          assigned: false,
          lastUsed: null,
          successRate: 1.0,
          avgResponseTime: 0,
          dataUsage: 0,
          cost: provider.cost,
          createdAt: new Date()
        };

        this.proxyPool.set(proxy.id, proxy);
        proxies.push(proxy);
      }
    }

    return proxies;
  }

  /**
   * Oxylabs代理获取
   */
  async fetchOxylabsProxies(provider) {
    const proxies = [];
    
    // Oxylabs数据中心代理有固定IP列表
    const datacenterIPs = await this.getDatacenterIPs(provider);
    
    for (const ipInfo of datacenterIPs) {
      const proxy = {
        id: `oxylabs_${ipInfo.country}_${ipInfo.ip.replace(/\./g, '_')}`,
        providerId: 'oxylabs',
        type: 'http',
        ip: ipInfo.ip,
        port: 8001,
        username: provider.auth.username,
        password: provider.auth.password,
        region: ipInfo.country.toLowerCase(),
        country: ipInfo.country,
        city: ipInfo.city,
        isp: 'Oxylabs',
        asn: ipInfo.asn,
        status: 'active',
        assigned: false,
        lastUsed: null,
        successRate: 1.0,
        avgResponseTime: 0,
        dataUsage: 0,
        cost: provider.cost,
        createdAt: new Date()
      };

      this.proxyPool.set(proxy.id, proxy);
      proxies.push(proxy);
    }

    return proxies;
  }

  /**
   * 获取可用代理
   */
  async getAvailableProxy(region = null, accountId = null) {
    try {
      let availableProxies = Array.from(this.proxyPool.values())
        .filter(proxy => 
          proxy.status === 'active' && 
          !proxy.assigned &&
          !this.blacklistedIPs.has(proxy.ip)
        );

      // 按地区筛选
      if (region) {
        availableProxies = availableProxies.filter(proxy => 
          proxy.region === region.toLowerCase()
        );
      }

      if (availableProxies.length === 0) {
        throw new Error(`没有可用的${region || ''}代理`);
      }

      // 按成功率和响应时间排序
      availableProxies.sort((a, b) => {
        const scoreA = a.successRate * 0.7 + (1000 - a.avgResponseTime) * 0.3;
        const scoreB = b.successRate * 0.7 + (1000 - b.avgResponseTime) * 0.3;
        return scoreB - scoreA;
      });

      const selectedProxy = availableProxies[0];
      
      // 分配代理
      if (accountId) {
        selectedProxy.assigned = true;
        selectedProxy.assignedTo = accountId;
        selectedProxy.assignedAt = new Date();
        this.proxyPool.set(selectedProxy.id, selectedProxy);
      }

      this.logger.info(`代理分配成功: ${selectedProxy.ip}`, {
        accountId,
        region: selectedProxy.region,
        provider: selectedProxy.providerId
      });

      return selectedProxy;

    } catch (error) {
      this.logger.error('获取可用代理失败:', error);
      throw error;
    }
  }

  /**
   * 测试代理连接
   */
  async testProxyConnection(proxy, timeout = 10000) {
    try {
      const proxyConfig = {
        host: proxy.ip,
        port: proxy.port,
        auth: {
          username: proxy.username,
          password: proxy.password
        }
      };

      const startTime = Date.now();
      
      const response = await axios.get('http://httpbin.org/ip', {
        proxy: proxyConfig,
        timeout,
        validateStatus: (status) => status === 200
      });

      const responseTime = Date.now() - startTime;
      
      // 验证IP是否正确
      const actualIP = response.data.origin;
      const isValid = actualIP && actualIP !== proxy.ip ? false : true;

      // 更新代理统计
      proxy.avgResponseTime = (proxy.avgResponseTime + responseTime) / 2;
      proxy.lastUsed = new Date();
      
      if (isValid) {
        proxy.successRate = Math.min(1.0, proxy.successRate + 0.01);
        proxy.status = 'active';
      } else {
        proxy.successRate = Math.max(0.0, proxy.successRate - 0.1);
        if (proxy.successRate < 0.5) {
          proxy.status = 'failed';
        }
      }

      this.proxyPool.set(proxy.id, proxy);

      this.logger.debug(`代理测试: ${proxy.ip}`, {
        success: isValid,
        responseTime,
        actualIP
      });

      return isValid;

    } catch (error) {
      // 更新失败统计
      proxy.successRate = Math.max(0.0, proxy.successRate - 0.2);
      proxy.status = proxy.successRate < 0.3 ? 'failed' : 'active';
      this.proxyPool.set(proxy.id, proxy);

      this.logger.warn(`代理测试失败: ${proxy.ip}`, {
        error: error.message
      });

      return false;
    }
  }

  /**
   * 释放代理
   */
  releaseProxy(proxyId) {
    const proxy = this.proxyPool.get(proxyId);
    if (proxy) {
      proxy.assigned = false;
      proxy.assignedTo = null;
      proxy.assignedAt = null;
      this.proxyPool.set(proxyId, proxy);
      
      this.logger.info(`代理已释放: ${proxy.ip}`);
    }
  }

  /**
   * 代理轮换
   */
  async rotateProxy(accountId, currentProxyId) {
    try {
      // 释放当前代理
      this.releaseProxy(currentProxyId);
      
      // 获取当前代理信息以保持地区一致
      const currentProxy = this.proxyPool.get(currentProxyId);
      const region = currentProxy ? currentProxy.region : null;
      
      // 获取新代理
      const newProxy = await this.getAvailableProxy(region, accountId);
      
      this.logger.info(`代理轮换成功: ${accountId}`, {
        oldProxy: currentProxy?.ip,
        newProxy: newProxy.ip,
        region
      });

      return newProxy;

    } catch (error) {
      this.logger.error(`代理轮换失败: ${accountId}`, error);
      throw error;
    }
  }

  /**
   * 启动健康检查
   */
  startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('代理健康检查失败:', error);
      }
    }, 5 * 60 * 1000); // 每5分钟检查一次

    this.logger.info('代理健康检查已启动');
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const proxiesToCheck = Array.from(this.proxyPool.values())
      .filter(proxy => proxy.status === 'active');

    const batchSize = 10;
    for (let i = 0; i < proxiesToCheck.length; i += batchSize) {
      const batch = proxiesToCheck.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (proxy) => {
        const isHealthy = await this.testProxyConnection(proxy, 5000);
        
        if (!isHealthy && proxy.successRate < 0.3) {
          this.logger.warn(`代理健康检查失败，标记为失效: ${proxy.ip}`);
          proxy.status = 'failed';
          this.proxyPool.set(proxy.id, proxy);
        }
      }));

      // 避免过快请求
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.logger.debug('代理健康检查完成');
  }

  /**
   * 启动自动轮换
   */
  startAutoRotation() {
    // 每小时轮换一次代理
    setInterval(async () => {
      try {
        await this.performAutoRotation();
      } catch (error) {
        this.logger.error('自动代理轮换失败:', error);
      }
    }, 60 * 60 * 1000); // 1小时

    this.logger.info('自动代理轮换已启动');
  }

  /**
   * 执行自动轮换
   */
  async performAutoRotation() {
    const assignedProxies = Array.from(this.proxyPool.values())
      .filter(proxy => proxy.assigned && proxy.assignedAt);

    for (const proxy of assignedProxies) {
      const hoursUsed = (Date.now() - proxy.assignedAt.getTime()) / (1000 * 60 * 60);
      
      // 如果使用超过6小时，自动轮换
      if (hoursUsed > 6) {
        try {
          await this.rotateProxy(proxy.assignedTo, proxy.id);
          this.logger.info(`自动轮换代理: ${proxy.assignedTo} - ${proxy.ip}`);
        } catch (error) {
          this.logger.error(`自动轮换失败: ${proxy.assignedTo}`, error);
        }
      }
    }
  }

  /**
   * 获取代理统计
   */
  getProxyStats() {
    const stats = {
      total: this.proxyPool.size,
      active: 0,
      assigned: 0,
      failed: 0,
      byProvider: {},
      byRegion: {},
      avgResponseTime: 0,
      avgSuccessRate: 0
    };

    let totalResponseTime = 0;
    let totalSuccessRate = 0;

    for (const proxy of this.proxyPool.values()) {
      // 状态统计
      if (proxy.status === 'active') stats.active++;
      if (proxy.assigned) stats.assigned++;
      if (proxy.status === 'failed') stats.failed++;

      // 提供商统计
      stats.byProvider[proxy.providerId] = (stats.byProvider[proxy.providerId] || 0) + 1;

      // 地区统计
      stats.byRegion[proxy.region] = (stats.byRegion[proxy.region] || 0) + 1;

      // 性能统计
      totalResponseTime += proxy.avgResponseTime;
      totalSuccessRate += proxy.successRate;
    }

    stats.avgResponseTime = Math.round(totalResponseTime / this.proxyPool.size);
    stats.avgSuccessRate = Math.round((totalSuccessRate / this.proxyPool.size) * 100) / 100;

    return stats;
  }

  /**
   * 工具方法：根据国家获取随机城市
   */
  getRandomCityByCountry(country) {
    const cities = {
      'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
      'UK': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
      'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'],
      'JP': ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo'],
      'SG': ['Singapore'],
      'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide']
    };

    const countryCities = cities[country] || ['Unknown'];
    return countryCities[Math.floor(Math.random() * countryCities.length)];
  }

  /**
   * 获取数据中心IP列表（模拟）
   */
  async getDatacenterIPs(provider) {
    // 这里应该从实际的API获取
    return [
      { ip: '192.168.1.100', country: 'US', city: 'New York', asn: 'AS15169' },
      { ip: '192.168.1.101', country: 'UK', city: 'London', asn: 'AS16509' },
      // ... 更多IP
    ];
  }

  /**
   * 停止所有服务
   */
  async stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.logger.info('代理管理器已停止');
  }
}

module.exports = ProxyManager;