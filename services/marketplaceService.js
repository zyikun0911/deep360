const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Plugin = require('../models/Plugin');

class MarketplaceService {
  constructor(logger) {
    this.logger = logger;
    this.marketplaceUrl = process.env.PLUGIN_MARKETPLACE_URL || 'https://plugins.deep360.com';
    this.apiKey = process.env.PLUGIN_MARKETPLACE_API_KEY;
    this.localCache = new Map();
    this.featuredPlugins = [];
    this.categories = [];
  }

  /**
   * 初始化市场服务
   */
  async initialize() {
    try {
      this.logger.info('初始化插件市场服务...');
      
      // 加载本地插件市场数据
      await this.loadLocalMarketplace();
      
      // 同步远程市场数据
      await this.syncRemoteMarketplace();
      
      // 初始化推荐插件
      await this.loadFeaturedPlugins();
      
      this.logger.info('插件市场服务初始化完成');
      
    } catch (error) {
      this.logger.error('插件市场服务初始化失败:', error);
    }
  }

  /**
   * 加载本地插件市场
   */
  async loadLocalMarketplace() {
    try {
      const marketplaceDir = path.join(process.cwd(), 'plugins/marketplace');
      const pluginDirs = await fs.readdir(marketplaceDir);

      for (const dir of pluginDirs) {
        const pluginPath = path.join(marketplaceDir, dir);
        const stats = await fs.stat(pluginPath);
        
        if (stats.isDirectory()) {
          await this.loadMarketplacePlugin(pluginPath);
        }
      }

      this.logger.info(`加载本地市场插件: ${this.localCache.size} 个`);

    } catch (error) {
      this.logger.error('加载本地插件市场失败:', error);
    }
  }

  /**
   * 加载市场插件
   */
  async loadMarketplacePlugin(pluginPath) {
    try {
      const manifestPath = path.join(pluginPath, 'plugin.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);

      // 验证插件信息
      this.validateMarketplacePlugin(manifest);

      // 添加到本地缓存
      this.localCache.set(manifest.id, {
        ...manifest,
        localPath: pluginPath,
        source: 'local',
        lastUpdated: new Date()
      });

    } catch (error) {
      this.logger.error(`加载市场插件失败 ${pluginPath}:`, error);
    }
  }

  /**
   * 同步远程市场数据
   */
  async syncRemoteMarketplace() {
    try {
      if (!this.apiKey) {
        this.logger.warn('未配置市场API密钥，跳过远程同步');
        return;
      }

      const response = await axios.get(`${this.marketplaceUrl}/api/plugins`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'Deep360-PluginManager/1.0'
        },
        timeout: 10000
      });

      const remotePlugins = response.data.plugins || [];
      
      for (const plugin of remotePlugins) {
        this.localCache.set(plugin.id, {
          ...plugin,
          source: 'remote',
          lastUpdated: new Date()
        });
      }

      this.logger.info(`同步远程插件: ${remotePlugins.length} 个`);

    } catch (error) {
      this.logger.error('同步远程市场失败:', error);
    }
  }

  /**
   * 搜索插件
   */
  async searchPlugins(query, filters = {}) {
    try {
      const {
        category,
        type,
        featured,
        verified,
        free,
        page = 1,
        limit = 20,
        sortBy = 'popularity'
      } = filters;

      let plugins = Array.from(this.localCache.values());

      // 关键词搜索
      if (query) {
        const searchTerms = query.toLowerCase().split(' ');
        plugins = plugins.filter(plugin => {
          const searchableText = [
            plugin.name,
            plugin.displayName,
            plugin.description,
            ...(plugin.keywords || []),
            ...(plugin.tags || [])
          ].join(' ').toLowerCase();

          return searchTerms.every(term => searchableText.includes(term));
        });
      }

      // 应用过滤器
      if (category) {
        plugins = plugins.filter(plugin => plugin.category === category);
      }

      if (type) {
        plugins = plugins.filter(plugin => plugin.type === type);
      }

      if (featured) {
        plugins = plugins.filter(plugin => plugin.marketplace?.featured);
      }

      if (verified) {
        plugins = plugins.filter(plugin => plugin.marketplace?.verified);
      }

      if (free) {
        plugins = plugins.filter(plugin => 
          !plugin.pricing || plugin.pricing.model === 'free'
        );
      }

      // 排序
      plugins = this.sortPlugins(plugins, sortBy);

      // 分页
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPlugins = plugins.slice(startIndex, endIndex);

      return {
        plugins: paginatedPlugins,
        total: plugins.length,
        page,
        limit,
        totalPages: Math.ceil(plugins.length / limit)
      };

    } catch (error) {
      this.logger.error('搜索插件失败:', error);
      throw error;
    }
  }

  /**
   * 获取插件详情
   */
  async getPluginDetails(pluginId) {
    try {
      const plugin = this.localCache.get(pluginId);
      if (!plugin) {
        // 尝试从远程获取
        if (this.apiKey) {
          const response = await axios.get(
            `${this.marketplaceUrl}/api/plugins/${pluginId}`,
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`
              }
            }
          );
          return response.data;
        }
        return null;
      }

      // 添加下载统计
      await this.trackPluginView(pluginId);

      return plugin;

    } catch (error) {
      this.logger.error(`获取插件详情失败 ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * 获取推荐插件
   */
  async getFeaturedPlugins(limit = 10) {
    try {
      const featured = Array.from(this.localCache.values())
        .filter(plugin => plugin.marketplace?.featured)
        .sort((a, b) => {
          const scoreA = (a.marketplace?.rating?.average || 0) * 0.7 + 
                         Math.log(a.marketplace?.downloads + 1 || 1) * 0.3;
          const scoreB = (b.marketplace?.rating?.average || 0) * 0.7 + 
                         Math.log(b.marketplace?.downloads + 1 || 1) * 0.3;
          return scoreB - scoreA;
        })
        .slice(0, limit);

      return featured;

    } catch (error) {
      this.logger.error('获取推荐插件失败:', error);
      throw error;
    }
  }

  /**
   * 获取插件分类
   */
  async getCategories() {
    try {
      const categories = {};
      
      for (const plugin of this.localCache.values()) {
        const category = plugin.category;
        if (!categories[category]) {
          categories[category] = {
            name: category,
            displayName: this.getCategoryDisplayName(category),
            count: 0,
            plugins: []
          };
        }
        categories[category].count++;
        categories[category].plugins.push(plugin.id);
      }

      return Object.values(categories);

    } catch (error) {
      this.logger.error('获取插件分类失败:', error);
      throw error;
    }
  }

  /**
   * 下载插件
   */
  async downloadPlugin(pluginId, version = 'latest') {
    try {
      const plugin = this.localCache.get(pluginId);
      if (!plugin) {
        throw new Error(`插件不存在: ${pluginId}`);
      }

      let downloadUrl;
      
      if (plugin.source === 'local') {
        // 本地插件，直接返回路径
        return {
          type: 'local',
          path: plugin.localPath,
          plugin
        };
      } else {
        // 远程插件，获取下载链接
        const response = await axios.get(
          `${this.marketplaceUrl}/api/plugins/${pluginId}/download`,
          {
            params: { version },
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        downloadUrl = response.data.downloadUrl;
      }

      // 下载插件包
      const downloadResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
      });

      // 生成临时文件名
      const tempFileName = `plugin-${pluginId}-${Date.now()}.zip`;
      const tempPath = path.join(process.cwd(), 'plugins/temp', tempFileName);

      // 保存到临时目录
      await fs.writeFile(tempPath, downloadResponse.data);

      // 验证文件完整性
      const fileHash = crypto.createHash('sha256')
        .update(downloadResponse.data)
        .digest('hex');

      // 更新下载统计
      await this.trackPluginDownload(pluginId);

      return {
        type: 'download',
        path: tempPath,
        hash: fileHash,
        plugin
      };

    } catch (error) {
      this.logger.error(`下载插件失败 ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * 检查插件更新
   */
  async checkForUpdates(installedPlugins) {
    try {
      const updates = [];

      for (const installedPlugin of installedPlugins) {
        const marketplacePlugin = this.localCache.get(installedPlugin.id);
        
        if (marketplacePlugin) {
          const hasUpdate = this.compareVersions(
            marketplacePlugin.version,
            installedPlugin.version
          ) > 0;

          if (hasUpdate) {
            updates.push({
              pluginId: installedPlugin.id,
              currentVersion: installedPlugin.version,
              latestVersion: marketplacePlugin.version,
              changelog: marketplacePlugin.changelog?.find(
                entry => entry.version === marketplacePlugin.version
              )
            });
          }
        }
      }

      return updates;

    } catch (error) {
      this.logger.error('检查插件更新失败:', error);
      throw error;
    }
  }

  /**
   * 提交插件评价
   */
  async submitReview(pluginId, userId, rating, comment) {
    try {
      // 更新本地缓存
      const plugin = this.localCache.get(pluginId);
      if (plugin) {
        if (!plugin.marketplace) plugin.marketplace = {};
        if (!plugin.marketplace.reviews) plugin.marketplace.reviews = [];

        plugin.marketplace.reviews.push({
          userId,
          rating,
          comment,
          date: new Date()
        });

        // 重新计算平均评分
        const reviews = plugin.marketplace.reviews;
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        plugin.marketplace.rating = {
          average: totalRating / reviews.length,
          count: reviews.length
        };
      }

      // 同步到远程服务器
      if (this.apiKey) {
        await axios.post(
          `${this.marketplaceUrl}/api/plugins/${pluginId}/reviews`,
          { rating, comment },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'X-User-ID': userId
            }
          }
        );
      }

      this.logger.info(`提交插件评价: ${pluginId}, 评分: ${rating}`);

    } catch (error) {
      this.logger.error('提交插件评价失败:', error);
      throw error;
    }
  }

  /**
   * 发布插件到市场
   */
  async publishPlugin(pluginData, userId) {
    try {
      if (!this.apiKey) {
        throw new Error('需要配置市场API密钥才能发布插件');
      }

      // 验证插件数据
      this.validatePluginForPublishing(pluginData);

      // 创建插件包
      const pluginPackage = await this.createPluginPackage(pluginData);

      // 上传到市场
      const formData = new FormData();
      formData.append('plugin', pluginPackage.buffer, {
        filename: `${pluginData.id}-${pluginData.version}.zip`,
        contentType: 'application/zip'
      });
      formData.append('metadata', JSON.stringify(pluginData));

      const response = await axios.post(
        `${this.marketplaceUrl}/api/plugins/publish`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-User-ID': userId,
            ...formData.getHeaders()
          },
          timeout: 120000
        }
      );

      this.logger.info(`插件发布成功: ${pluginData.id}`);
      return response.data;

    } catch (error) {
      this.logger.error('发布插件失败:', error);
      throw error;
    }
  }

  /**
   * 获取插件统计数据
   */
  async getMarketplaceStats() {
    try {
      const stats = {
        totalPlugins: this.localCache.size,
        categories: {},
        topRated: [],
        mostDownloaded: [],
        recentlyAdded: [],
        bySource: { local: 0, remote: 0 }
      };

      const plugins = Array.from(this.localCache.values());

      // 分类统计
      for (const plugin of plugins) {
        const category = plugin.category;
        stats.categories[category] = (stats.categories[category] || 0) + 1;
        stats.bySource[plugin.source]++;
      }

      // 评分最高
      stats.topRated = plugins
        .filter(p => p.marketplace?.rating?.average)
        .sort((a, b) => b.marketplace.rating.average - a.marketplace.rating.average)
        .slice(0, 10);

      // 下载最多
      stats.mostDownloaded = plugins
        .filter(p => p.marketplace?.downloads)
        .sort((a, b) => b.marketplace.downloads - a.marketplace.downloads)
        .slice(0, 10);

      // 最近添加
      stats.recentlyAdded = plugins
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
        .slice(0, 10);

      return stats;

    } catch (error) {
      this.logger.error('获取市场统计失败:', error);
      throw error;
    }
  }

  /**
   * 排序插件
   */
  sortPlugins(plugins, sortBy) {
    switch (sortBy) {
      case 'popularity':
        return plugins.sort((a, b) => {
          const scoreA = (a.marketplace?.downloads || 0) * 0.6 + 
                         (a.marketplace?.rating?.average || 0) * 40;
          const scoreB = (b.marketplace?.downloads || 0) * 0.6 + 
                         (b.marketplace?.rating?.average || 0) * 40;
          return scoreB - scoreA;
        });

      case 'rating':
        return plugins.sort((a, b) => 
          (b.marketplace?.rating?.average || 0) - (a.marketplace?.rating?.average || 0)
        );

      case 'downloads':
        return plugins.sort((a, b) => 
          (b.marketplace?.downloads || 0) - (a.marketplace?.downloads || 0)
        );

      case 'updated':
        return plugins.sort((a, b) => 
          new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0)
        );

      case 'name':
        return plugins.sort((a, b) => a.name.localeCompare(b.name));

      default:
        return plugins;
    }
  }

  /**
   * 比较版本号
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * 获取分类显示名称
   */
  getCategoryDisplayName(category) {
    const displayNames = {
      'messaging': '消息通讯',
      'automation': '自动化',
      'ai': 'AI增强',
      'analytics': '数据分析',
      'security': '安全防护',
      'integration': '第三方集成',
      'utility': '实用工具',
      'marketing': '营销工具',
      'crm': '客户管理',
      'workflow': '工作流'
    };
    
    return displayNames[category] || category;
  }

  /**
   * 验证市场插件
   */
  validateMarketplacePlugin(plugin) {
    const required = ['id', 'name', 'version', 'description', 'category'];
    
    for (const field of required) {
      if (!plugin[field]) {
        throw new Error(`插件信息缺少必需字段: ${field}`);
      }
    }
  }

  /**
   * 验证发布插件
   */
  validatePluginForPublishing(plugin) {
    // 更严格的验证
    const required = [
      'id', 'name', 'version', 'description', 'author', 
      'category', 'main', 'permissions'
    ];
    
    for (const field of required) {
      if (!plugin[field]) {
        throw new Error(`发布插件缺少必需字段: ${field}`);
      }
    }

    // 验证作者信息
    if (!plugin.author.name || !plugin.author.email) {
      throw new Error('作者信息不完整');
    }

    // 验证版本格式
    if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
      throw new Error('版本号格式不正确');
    }
  }

  /**
   * 记录插件查看
   */
  async trackPluginView(pluginId) {
    try {
      // 这里可以实现查看统计逻辑
      this.logger.debug(`插件查看: ${pluginId}`);
    } catch (error) {
      this.logger.error('记录插件查看失败:', error);
    }
  }

  /**
   * 记录插件下载
   */
  async trackPluginDownload(pluginId) {
    try {
      const plugin = this.localCache.get(pluginId);
      if (plugin && plugin.marketplace) {
        plugin.marketplace.downloads = (plugin.marketplace.downloads || 0) + 1;
      }
      
      this.logger.info(`插件下载: ${pluginId}`);
    } catch (error) {
      this.logger.error('记录插件下载失败:', error);
    }
  }

  /**
   * 加载推荐插件
   */
  async loadFeaturedPlugins() {
    try {
      this.featuredPlugins = await this.getFeaturedPlugins();
      this.logger.info(`加载推荐插件: ${this.featuredPlugins.length} 个`);
    } catch (error) {
      this.logger.error('加载推荐插件失败:', error);
    }
  }
}

module.exports = MarketplaceService;