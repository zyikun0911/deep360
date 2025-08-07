/**
 * 群发消息服务 - 超链图文、普链、断链检测修复
 */

const { createModuleLogger } = require('../utils/logger');
const { EventEmitter } = require('events');

class MassMessagingService extends EventEmitter {
  constructor() {
    super();
    this.logger = createModuleLogger('MassMessaging');
    this.campaigns = new Map();
    this.templates = new Map();
    this.linkManager = null;
    this.contentProcessor = null;
    this.deliveryQueue = new Map();
    this.analytics = new Map();
  }

  async initialize() {
    try {
      this.logger.info('初始化群发消息服务...');

      // 初始化链接管理器
      await this.initializeLinkManager();

      // 初始化内容处理器
      await this.initializeContentProcessor();

      // 启动发送队列处理器
      await this.startDeliveryQueueProcessor();

      // 初始化分析统计
      await this.initializeAnalytics();

      this.logger.info('群发消息服务初始化完成');
    } catch (error) {
      this.logger.error('群发消息服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化链接管理器
   */
  async initializeLinkManager() {
    try {
      this.linkManager = {
        initialized: true,
        shortLinkDomain: 'https://d360.link',
        trackingEnabled: true,
        healthCheckInterval: 300000, // 5分钟
        repairStrategies: [
          'remove_tracking_params',
          'try_https_version',
          'try_www_version',
          'try_mobile_version',
          'search_alternative'
        ]
      };
      
      this.logger.info('链接管理器初始化完成');
    } catch (error) {
      this.logger.error('链接管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化内容处理器
   */
  async initializeContentProcessor() {
    try {
      this.contentProcessor = {
        initialized: true,
        supportedTypes: ['text', 'image', 'video', 'document', 'rich_media'],
        maxFileSize: 50 * 1024 * 1024, // 50MB
        imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        videoFormats: ['mp4', 'avi', 'mov', 'webm'],
        documentFormats: ['pdf', 'doc', 'docx', 'txt']
      };
      
      this.logger.info('内容处理器初始化完成');
    } catch (error) {
      this.logger.error('内容处理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 启动发送队列处理器
   */
  async startDeliveryQueueProcessor() {
    try {
      // 启动队列处理器
      setInterval(() => {
        this.processDeliveryQueue();
      }, 10000); // 每10秒处理一次队列
      
      this.logger.info('发送队列处理器启动完成');
    } catch (error) {
      this.logger.error('发送队列处理器启动失败:', error);
      throw error;
    }
  }

  /**
   * 初始化分析统计
   */
  async initializeAnalytics() {
    try {
      this.analytics = new Map();
      
      this.logger.info('分析统计初始化完成');
    } catch (error) {
      this.logger.error('分析统计初始化失败:', error);
      throw error;
    }
  }

  /**
   * 处理发送队列
   */
  async processDeliveryQueue() {
    try {
      for (const [campaignId, campaign] of this.campaigns) {
        if (campaign.status === 'running') {
          await this.processCampaignDelivery(campaign);
        }
      }
    } catch (error) {
      this.logger.error('处理发送队列失败:', error);
    }
  }

  /**
   * 处理活动发送
   */
  async processCampaignDelivery(campaign) {
    try {
      // 这里应该实现实际的发送逻辑
      this.logger.info(`处理活动发送: ${campaign.id}`);
    } catch (error) {
      this.logger.error(`处理活动发送失败: ${campaign.id}`, error);
    }
  }

  /**
   * 创建群发活动
   */
  async createMassMessagingCampaign(config) {
    try {
      const {
        name,
        description = '',
        messageType, // 'text', 'image', 'video', 'document', 'rich_media'
        content,
        targetAudience,
        scheduledTime = null,
        platforms = ['whatsapp'],
        settings = {}
      } = config;

      const campaignId = this.generateCampaignId();
      
      // 处理内容（包括链接处理）
      const processedContent = await this.processMessageContent(content, messageType);
      
      // 分析目标受众
      const audienceAnalysis = await this.analyzeTargetAudience(targetAudience);
      
      // 创建发送计划
      const deliveryPlan = await this.createDeliveryPlan(audienceAnalysis, platforms, settings);

      const campaign = {
        id: campaignId,
        name,
        description,
        messageType,
        originalContent: content,
        processedContent,
        targetAudience,
        audienceAnalysis,
        platforms,
        settings: {
          sendRate: settings.sendRate || 10, // 每分钟发送数量
          randomDelay: settings.randomDelay || { min: 5, max: 30 }, // 随机延迟秒数
          personalizeContent: settings.personalizeContent || false,
          trackLinks: settings.trackLinks || true,
          enableRetry: settings.enableRetry || true,
          maxRetries: settings.maxRetries || 3,
          ...settings
        },
        deliveryPlan,
        status: 'draft',
        scheduledTime,
        createdAt: new Date(),
        updatedAt: new Date(),
        stats: {
          totalTargets: audienceAnalysis.totalCount,
          sent: 0,
          delivered: 0,
          failed: 0,
          clicked: 0,
          replied: 0
        }
      };

      this.campaigns.set(campaignId, campaign);

      this.logger.info(`群发活动创建成功: ${campaignId}`, {
        name,
        messageType,
        targetCount: audienceAnalysis.totalCount,
        platforms
      });

      return {
        campaignId,
        campaign: {
          id: campaign.id,
          name: campaign.name,
          messageType: campaign.messageType,
          targetCount: campaign.stats.totalTargets,
          platforms: campaign.platforms,
          status: campaign.status,
          createdAt: campaign.createdAt
        },
        preview: this.generateContentPreview(campaign)
      };

    } catch (error) {
      this.logger.error('创建群发活动失败:', error);
      throw error;
    }
  }

  /**
   * 处理消息内容（超链图文、普链等）
   */
  async processMessageContent(content, messageType) {
    try {
      const processed = {
        type: messageType,
        originalContent: content,
        processedContent: null,
        links: [],
        media: [],
        variables: [],
        templates: []
      };

      switch (messageType) {
        case 'text':
          processed.processedContent = await this.processTextContent(content);
          break;

        case 'rich_media':
          processed.processedContent = await this.processRichMediaContent(content);
          break;

        case 'image':
          processed.processedContent = await this.processImageContent(content);
          break;

        case 'video':
          processed.processedContent = await this.processVideoContent(content);
          break;

        case 'document':
          processed.processedContent = await this.processDocumentContent(content);
          break;

        default:
          throw new Error(`不支持的消息类型: ${messageType}`);
      }

      // 提取和处理链接
      processed.links = await this.extractAndProcessLinks(processed.processedContent);

      // 提取媒体文件
      processed.media = await this.extractMediaFiles(processed.processedContent);

      // 提取变量占位符
      processed.variables = this.extractVariables(processed.processedContent);

      return processed;

    } catch (error) {
      this.logger.error('处理消息内容失败:', error);
      throw error;
    }
  }

  /**
   * 处理富媒体内容（超链图文）
   */
  async processRichMediaContent(content) {
    try {
      const {
        text = '',
        images = [],
        videos = [],
        links = [],
        layout = 'mixed' // 'text_first', 'image_first', 'mixed'
      } = content;

      const richMedia = {
        layout,
        blocks: [],
        totalSize: 0,
        estimatedLoadTime: 0
      };

      // 处理文本块
      if (text) {
        const textBlocks = await this.processTextBlocks(text);
        richMedia.blocks.push(...textBlocks);
      }

      // 处理图片
      for (const image of images) {
        const imageBlock = await this.processImageBlock(image);
        richMedia.blocks.push(imageBlock);
        richMedia.totalSize += imageBlock.size;
      }

      // 处理视频
      for (const video of videos) {
        const videoBlock = await this.processVideoBlock(video);
        richMedia.blocks.push(videoBlock);
        richMedia.totalSize += videoBlock.size;
      }

      // 处理链接（生成预览卡片）
      for (const link of links) {
        const linkBlock = await this.processLinkBlock(link);
        richMedia.blocks.push(linkBlock);
      }

      // 根据布局重新排序
      richMedia.blocks = this.arrangeContentBlocks(richMedia.blocks, layout);

      // 计算预估加载时间
      richMedia.estimatedLoadTime = this.calculateLoadTime(richMedia.totalSize);

      // 优化内容顺序和大小
      richMedia.blocks = await this.optimizeContentBlocks(richMedia.blocks);

      return richMedia;

    } catch (error) {
      this.logger.error('处理富媒体内容失败:', error);
      throw error;
    }
  }

  /**
   * 提取和处理链接
   */
  async extractAndProcessLinks(content) {
    try {
      const links = [];
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      
      // 从内容中提取所有链接
      let match;
      while ((match = urlRegex.exec(JSON.stringify(content))) !== null) {
        const originalUrl = match[1];
        
        // 检查链接状态
        const linkStatus = await this.checkLinkStatus(originalUrl);
        
        // 生成跟踪链接
        const trackingUrl = await this.generateTrackingLink(originalUrl);
        
        // 生成短链接
        const shortUrl = await this.generateShortLink(originalUrl);

        const linkInfo = {
          id: this.generateLinkId(),
          originalUrl,
          trackingUrl,
          shortUrl,
          status: linkStatus.status,
          responseTime: linkStatus.responseTime,
          finalUrl: linkStatus.finalUrl,
          title: linkStatus.title || '',
          description: linkStatus.description || '',
          image: linkStatus.image || '',
          domain: new URL(originalUrl).hostname,
          createdAt: new Date(),
          lastChecked: new Date(),
          clickCount: 0,
          uniqueClicks: 0
        };

        links.push(linkInfo);
      }

      return links;

    } catch (error) {
      this.logger.error('提取和处理链接失败:', error);
      throw error;
    }
  }

  /**
   * 检查链接状态
   */
  async checkLinkStatus(url) {
    try {
      const startTime = Date.now();
      
      // 发送HEAD请求检查链接
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 10000,
        redirect: 'follow'
      });

      const responseTime = Date.now() - startTime;
      
      let title = '';
      let description = '';
      let image = '';

      // 如果是成功响应，获取页面元数据
      if (response.ok) {
        try {
          const htmlResponse = await fetch(url, {
            method: 'GET',
            timeout: 10000
          });
          
          const html = await htmlResponse.text();
          
          // 提取页面信息
          title = this.extractMetaTag(html, 'title') || this.extractTitle(html);
          description = this.extractMetaTag(html, 'description');
          image = this.extractMetaTag(html, 'og:image') || this.extractMetaTag(html, 'twitter:image');
          
        } catch (metaError) {
          this.logger.warn('获取页面元数据失败:', metaError);
        }
      }

      return {
        status: response.ok ? 'active' : 'broken',
        statusCode: response.status,
        responseTime,
        finalUrl: response.url,
        title,
        description,
        image,
        lastChecked: new Date()
      };

    } catch (error) {
      this.logger.warn(`链接检查失败: ${url}`, error);
      return {
        status: 'error',
        statusCode: 0,
        responseTime: 0,
        finalUrl: url,
        title: '',
        description: '',
        image: '',
        lastChecked: new Date(),
        error: error.message
      };
    }
  }

  /**
   * 生成跟踪链接
   */
  async generateTrackingLink(originalUrl) {
    try {
      const trackingId = this.generateTrackingId();
      const trackingParams = new URLSearchParams({
        utm_source: 'deep360',
        utm_medium: 'mass_messaging',
        utm_campaign: 'auto_generated',
        utm_content: trackingId,
        deep360_track: trackingId
      });

      // 判断原链接是否已有参数
      const url = new URL(originalUrl);
      const separator = url.search ? '&' : '?';
      
      const trackingUrl = `${originalUrl}${separator}${trackingParams.toString()}`;

      // 存储跟踪信息
      await this.storeTrackingInfo(trackingId, {
        originalUrl,
        trackingUrl,
        createdAt: new Date(),
        clicks: 0,
        uniqueVisitors: new Set()
      });

      return trackingUrl;

    } catch (error) {
      this.logger.error('生成跟踪链接失败:', error);
      return originalUrl; // 返回原链接作为备用
    }
  }

  /**
   * 生成短链接
   */
  async generateShortLink(originalUrl) {
    try {
      const shortCode = this.generateShortCode();
      const shortUrl = `https://d360.link/${shortCode}`;

      // 存储短链接映射
      await this.storeShortLinkMapping(shortCode, {
        originalUrl,
        shortUrl,
        createdAt: new Date(),
        clicks: 0,
        active: true
      });

      return shortUrl;

    } catch (error) {
      this.logger.error('生成短链接失败:', error);
      return originalUrl;
    }
  }

  /**
   * 启动群发活动
   */
  async startMassMessagingCampaign(campaignId) {
    try {
      const campaign = this.campaigns.get(campaignId);
      if (!campaign) {
        throw new Error('群发活动不存在');
      }

      if (campaign.status !== 'draft' && campaign.status !== 'paused') {
        throw new Error(`活动状态不允许启动: ${campaign.status}`);
      }

      // 预检查
      await this.performPreLaunchChecks(campaign);

      // 更新状态
      campaign.status = 'running';
      campaign.startedAt = new Date();
      campaign.updatedAt = new Date();

      // 添加到发送队列
      await this.addToDeliveryQueue(campaign);

      this.logger.info(`群发活动启动: ${campaignId}`, {
        name: campaign.name,
        targetCount: campaign.stats.totalTargets
      });

      return {
        success: true,
        campaignId,
        status: campaign.status,
        startedAt: campaign.startedAt,
        estimatedCompletion: this.calculateEstimatedCompletion(campaign)
      };

    } catch (error) {
      this.logger.error(`启动群发活动失败: ${campaignId}`, error);
      throw error;
    }
  }

  /**
   * 断链检测和修复
   */
  async performLinkHealthCheck(campaignId = null) {
    try {
      let linksToCheck = [];

      if (campaignId) {
        // 检查特定活动的链接
        const campaign = this.campaigns.get(campaignId);
        if (campaign && campaign.processedContent.links) {
          linksToCheck = campaign.processedContent.links;
        }
      } else {
        // 检查所有活动的链接
        for (const campaign of this.campaigns.values()) {
          if (campaign.processedContent.links) {
            linksToCheck.push(...campaign.processedContent.links);
          }
        }
      }

      const results = {
        total: linksToCheck.length,
        active: 0,
        broken: 0,
        error: 0,
        repaired: 0,
        details: []
      };

      // 并发检查链接状态
      const batchSize = 10;
      for (let i = 0; i < linksToCheck.length; i += batchSize) {
        const batch = linksToCheck.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (link) => {
            try {
              const status = await this.checkLinkStatus(link.originalUrl);
              
              // 更新链接状态
              link.status = status.status;
              link.lastChecked = status.lastChecked;
              link.responseTime = status.responseTime;

              let repairResult = null;
              
              // 如果链接断开，尝试修复
              if (status.status === 'broken' || status.status === 'error') {
                repairResult = await this.attemptLinkRepair(link);
                if (repairResult.success) {
                  results.repaired++;
                  link.status = 'active';
                  link.originalUrl = repairResult.newUrl;
                }
              }

              // 统计结果
              if (link.status === 'active') results.active++;
              else if (link.status === 'broken') results.broken++;
              else results.error++;

              return {
                linkId: link.id,
                originalUrl: link.originalUrl,
                status: link.status,
                responseTime: link.responseTime,
                repairResult,
                lastChecked: link.lastChecked
              };

            } catch (error) {
              results.error++;
              return {
                linkId: link.id,
                originalUrl: link.originalUrl,
                status: 'error',
                error: error.message
              };
            }
          })
        );

        results.details.push(...batchResults);

        // 批次间延迟
        if (i + batchSize < linksToCheck.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.logger.info('链接健康检查完成', {
        total: results.total,
        active: results.active,
        broken: results.broken,
        repaired: results.repaired
      });

      return results;

    } catch (error) {
      this.logger.error('链接健康检查失败:', error);
      throw error;
    }
  }

  /**
   * 尝试链接修复
   */
  async attemptLinkRepair(link) {
    try {
      const repairStrategies = [
        'remove_tracking_params',
        'try_https_version',
        'try_www_version',
        'try_mobile_version',
        'search_alternative'
      ];

      for (const strategy of repairStrategies) {
        const repairedUrl = await this.applyRepairStrategy(link.originalUrl, strategy);
        
        if (repairedUrl && repairedUrl !== link.originalUrl) {
          const status = await this.checkLinkStatus(repairedUrl);
          
          if (status.status === 'active') {
            this.logger.info(`链接修复成功: ${link.originalUrl} -> ${repairedUrl}`, {
              strategy,
              linkId: link.id
            });

            return {
              success: true,
              strategy,
              originalUrl: link.originalUrl,
              newUrl: repairedUrl,
              repairedAt: new Date()
            };
          }
        }
      }

      return {
        success: false,
        reason: 'all_strategies_failed',
        attemptedStrategies: repairStrategies
      };

    } catch (error) {
      this.logger.error('链接修复失败:', error);
      return {
        success: false,
        reason: 'repair_error',
        error: error.message
      };
    }
  }

  /**
   * 应用修复策略
   */
  async applyRepairStrategy(url, strategy) {
    try {
      const urlObj = new URL(url);

      switch (strategy) {
        case 'remove_tracking_params':
          // 移除跟踪参数
          const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
          trackingParams.forEach(param => urlObj.searchParams.delete(param));
          return urlObj.toString();

        case 'try_https_version':
          // 尝试HTTPS版本
          if (urlObj.protocol === 'http:') {
            urlObj.protocol = 'https:';
            return urlObj.toString();
          }
          break;

        case 'try_www_version':
          // 尝试www版本
          if (!urlObj.hostname.startsWith('www.')) {
            urlObj.hostname = 'www.' + urlObj.hostname;
            return urlObj.toString();
          } else {
            urlObj.hostname = urlObj.hostname.replace('www.', '');
            return urlObj.toString();
          }

        case 'try_mobile_version':
          // 尝试移动版本
          if (!urlObj.hostname.startsWith('m.')) {
            urlObj.hostname = 'm.' + urlObj.hostname.replace('www.', '');
            return urlObj.toString();
          }
          break;

        case 'search_alternative':
          // 搜索替代链接（这里可以集成搜索API）
          return await this.searchAlternativeUrl(url);

        default:
          return null;
      }

    } catch (error) {
      this.logger.error(`修复策略应用失败: ${strategy}`, error);
      return null;
    }
  }

  /**
   * 获取群发统计
   */
  getCampaignAnalytics(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error('群发活动不存在');
    }

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      stats: campaign.stats,
      performance: {
        deliveryRate: campaign.stats.totalTargets > 0 ? 
          (campaign.stats.delivered / campaign.stats.totalTargets) * 100 : 0,
        clickRate: campaign.stats.delivered > 0 ? 
          (campaign.stats.clicked / campaign.stats.delivered) * 100 : 0,
        replyRate: campaign.stats.delivered > 0 ? 
          (campaign.stats.replied / campaign.stats.delivered) * 100 : 0
      },
      timeline: this.analytics.get(campaignId) || [],
      links: campaign.processedContent.links.map(link => ({
        id: link.id,
        originalUrl: link.originalUrl,
        shortUrl: link.shortUrl,
        clickCount: link.clickCount,
        uniqueClicks: link.uniqueClicks,
        status: link.status
      }))
    };
  }

  /**
   * 分析目标受众
   */
  async analyzeTargetAudience(targetAudience) {
    try {
      // 简化的受众分析逻辑
      const totalCount = targetAudience.contacts?.length || 0;
      
      return {
        totalCount,
        validCount: totalCount,
        platforms: {
          whatsapp: Math.floor(totalCount * 0.7),
          telegram: Math.floor(totalCount * 0.3),
          signal: Math.floor(totalCount * 0.1)
        },
        demographics: targetAudience.demographics || {},
        segmentation: targetAudience.segmentation || {}
      };
    } catch (error) {
      this.logger.error('分析目标受众失败:', error);
      throw error;
    }
  }

  /**
   * 创建发送计划
   */
  async createDeliveryPlan(audienceAnalysis, platforms, settings) {
    try {
      const plan = {
        totalTargets: audienceAnalysis.totalCount,
        platforms,
        sendRate: settings.sendRate || 10,
        estimatedDuration: Math.ceil(audienceAnalysis.totalCount / (settings.sendRate || 10)),
        batches: Math.ceil(audienceAnalysis.totalCount / 100), // 每批100个
        schedule: {
          startTime: new Date(),
          endTime: new Date(Date.now() + (Math.ceil(audienceAnalysis.totalCount / (settings.sendRate || 10)) * 60000))
        }
      };
      
      return plan;
    } catch (error) {
      this.logger.error('创建发送计划失败:', error);
      throw error;
    }
  }

  /**
   * 生成内容预览
   */
  generateContentPreview(campaign) {
    try {
      return {
        messageType: campaign.messageType,
        contentSummary: this.summarizeContent(campaign.originalContent),
        linkCount: campaign.processedContent?.links?.length || 0,
        mediaCount: campaign.processedContent?.media?.length || 0,
        estimatedSize: this.calculateContentSize(campaign.processedContent)
      };
    } catch (error) {
      this.logger.error('生成内容预览失败:', error);
      return {
        messageType: campaign.messageType,
        contentSummary: '预览生成失败',
        linkCount: 0,
        mediaCount: 0,
        estimatedSize: 0
      };
    }
  }

  /**
   * 总结内容
   */
  summarizeContent(content) {
    if (typeof content === 'string') {
      return content.length > 100 ? content.substring(0, 100) + '...' : content;
    } else if (typeof content === 'object') {
      return content.text || content.title || 'Rich Media Content';
    }
    return 'Unknown Content Type';
  }

  /**
   * 计算内容大小
   */
  calculateContentSize(processedContent) {
    let size = 0;
    
    if (processedContent?.processedContent) {
      size += JSON.stringify(processedContent.processedContent).length;
    }
    
    if (processedContent?.media) {
      size += processedContent.media.reduce((total, media) => total + (media.size || 0), 0);
    }
    
    return size;
  }

  /**
   * 工具方法
   */
  generateCampaignId() {
    return `campaign_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  generateLinkId() {
    return `link_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  generateTrackingId() {
    return `track_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  generateShortCode() {
    return Math.random().toString(36).substring(2, 8);
  }

  extractMetaTag(html, tagName) {
    const regex = new RegExp(`<meta[^>]*(?:name|property)="${tagName}"[^>]*content="([^"]*)"`, 'i');
    const match = html.match(regex);
    return match ? match[1] : '';
  }

  extractTitle(html) {
    const match = html.match(/<title>([^<]*)<\/title>/i);
    return match ? match[1] : '';
  }
}

module.exports = MassMessagingService;