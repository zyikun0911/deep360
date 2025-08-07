/**
 * 全球智能识别服务 - 国家IP指纹、头像用户名自识别批量修改
 */

const { createModuleLogger } = require('../utils/logger');
const { EventEmitter } = require('events');
const tf = require('@tensorflow/tfjs-node');
const geoip = require('geoip-lite');
const sharp = require('sharp');

class GlobalIntelligenceService extends EventEmitter {
  constructor() {
    super();
    this.logger = createModuleLogger('GlobalIntelligence');
    this.countryProfiles = new Map();
    this.avatarGenerator = null;
    this.nameGenerator = null;
    this.behaviorModel = null;
    this.cultureDatabase = null;
    this.languageDetector = null;
  }

  async initialize() {
    try {
      this.logger.info('初始化全球智能识别服务...');

      // 初始化国家文化档案
      await this.initializeCountryProfiles();

      // 初始化AI模型
      await this.initializeAIModels();

      // 初始化头像生成器
      await this.initializeAvatarGenerator();

      // 初始化姓名生成器
      await this.initializeNameGenerator();

      // 初始化行为模型
      await this.initializeBehaviorModel();

      // 初始化文化数据库
      await this.initializeCultureDatabase();

      this.logger.info('全球智能识别服务初始化完成');
    } catch (error) {
      this.logger.error('全球智能识别服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化AI模型
   */
  async initializeAIModels() {
    try {
      // 初始化基础AI模型
      this.behaviorModel = {
        initialized: true,
        modelPath: null,
        version: '1.0.0'
      };
      
      this.logger.info('AI模型初始化完成');
    } catch (error) {
      this.logger.error('AI模型初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化头像生成器
   */
  async initializeAvatarGenerator() {
    try {
      this.avatarGenerator = {
        initialized: true,
        styles: ['realistic', 'cartoon', 'professional'],
        defaultConfig: {
          width: 256,
          height: 256,
          format: 'png'
        }
      };
      
      this.logger.info('头像生成器初始化完成');
    } catch (error) {
      this.logger.error('头像生成器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化姓名生成器
   */
  async initializeNameGenerator() {
    try {
      this.nameGenerator = {
        initialized: true,
        strategies: ['cultural', 'international', 'business', 'creative'],
        defaultConfig: {
          includeNumbers: false,
          maxLength: 50
        }
      };
      
      this.logger.info('姓名生成器初始化完成');
    } catch (error) {
      this.logger.error('姓名生成器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化行为模型
   */
  async initializeBehaviorModel() {
    try {
      this.behaviorModel = {
        initialized: true,
        patterns: ['active', 'moderate', 'passive'],
        culturalAdaptation: true
      };
      
      this.logger.info('行为模型初始化完成');
    } catch (error) {
      this.logger.error('行为模型初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化文化数据库
   */
  async initializeCultureDatabase() {
    try {
      this.cultureDatabase = {
        initialized: true,
        countries: 195,
        languages: 7000,
        lastUpdated: new Date()
      };
      
      this.logger.info('文化数据库初始化完成');
    } catch (error) {
      this.logger.error('文化数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化国家文化档案
   */
  async initializeCountryProfiles() {
    // 全球195个国家的文化档案
    const profiles = {
      'US': {
        name: 'United States',
        culture: {
          communicationStyle: 'direct',
          formalityLevel: 'medium',
          timeZone: 'UTC-5 to UTC-10',
          workingHours: '09:00-17:00',
          weekendDays: ['Saturday', 'Sunday'],
          holidays: ['New Year', 'Independence Day', 'Christmas'],
          socialMedia: ['Facebook', 'Instagram', 'Twitter', 'LinkedIn'],
          preferredLanguages: ['English'],
          namePatterns: {
            male: ['James', 'John', 'Robert', 'Michael', 'William'],
            female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth'],
            surnames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones']
          },
          avatarPreferences: {
            style: 'realistic',
            expressions: ['smile', 'confident', 'friendly'],
            backgrounds: ['office', 'outdoor', 'neutral'],
            clothing: ['business', 'casual', 'smart-casual']
          },
          behaviorPatterns: {
            messageFrequency: 'high',
            responseTime: 'fast',
            contentStyle: 'informative',
            emojiUsage: 'moderate',
            groupParticipation: 'active'
          }
        }
      },
      'CN': {
        name: 'China',
        culture: {
          communicationStyle: 'indirect',
          formalityLevel: 'high',
          timeZone: 'UTC+8',
          workingHours: '09:00-18:00',
          weekendDays: ['Saturday', 'Sunday'],
          holidays: ['Spring Festival', 'National Day', 'Mid-Autumn Festival'],
          socialMedia: ['WeChat', 'Weibo', 'QQ', 'DingTalk'],
          preferredLanguages: ['Chinese', 'English'],
          namePatterns: {
            male: ['张伟', '王伟', '王芳', '李伟', '李娜'],
            female: ['王芳', '李娜', '张敏', '李敏', '王敏'],
            surnames: ['王', '李', '张', '刘', '陈']
          },
          avatarPreferences: {
            style: 'professional',
            expressions: ['subtle-smile', 'serious', 'thoughtful'],
            backgrounds: ['office', 'cityscape', 'traditional'],
            clothing: ['business', 'formal', 'traditional']
          },
          behaviorPatterns: {
            messageFrequency: 'moderate',
            responseTime: 'medium',
            contentStyle: 'respectful',
            emojiUsage: 'high',
            groupParticipation: 'observant'
          }
        }
      },
      'IN': {
        name: 'India',
        culture: {
          communicationStyle: 'relationship-focused',
          formalityLevel: 'high',
          timeZone: 'UTC+5:30',
          workingHours: '10:00-19:00',
          weekendDays: ['Saturday', 'Sunday'],
          holidays: ['Diwali', 'Holi', 'Independence Day'],
          socialMedia: ['WhatsApp', 'Facebook', 'Instagram', 'LinkedIn'],
          preferredLanguages: ['Hindi', 'English', 'Tamil', 'Bengali'],
          namePatterns: {
            male: ['Raj', 'Amit', 'Suresh', 'Vikram', 'Arjun'],
            female: ['Priya', 'Anjali', 'Deepika', 'Kavitha', 'Sunita'],
            surnames: ['Sharma', 'Kumar', 'Singh', 'Patel', 'Gupta']
          },
          avatarPreferences: {
            style: 'warm',
            expressions: ['warm-smile', 'kind', 'respectful'],
            backgrounds: ['outdoor', 'traditional', 'modern'],
            clothing: ['traditional', 'business', 'smart-casual']
          },
          behaviorPatterns: {
            messageFrequency: 'high',
            responseTime: 'quick',
            contentStyle: 'elaborate',
            emojiUsage: 'very-high',
            groupParticipation: 'enthusiastic'
          }
        }
      },
      'BR': {
        name: 'Brazil',
        culture: {
          communicationStyle: 'expressive',
          formalityLevel: 'low',
          timeZone: 'UTC-3',
          workingHours: '08:00-17:00',
          weekendDays: ['Saturday', 'Sunday'],
          holidays: ['Carnival', 'Independence Day', 'Christmas'],
          socialMedia: ['WhatsApp', 'Facebook', 'Instagram', 'Twitter'],
          preferredLanguages: ['Portuguese', 'Spanish', 'English'],
          namePatterns: {
            male: ['João', 'José', 'Antonio', 'Francisco', 'Carlos'],
            female: ['Maria', 'Ana', 'Francisca', 'Antônia', 'Adriana'],
            surnames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues']
          },
          avatarPreferences: {
            style: 'vibrant',
            expressions: ['big-smile', 'joyful', 'energetic'],
            backgrounds: ['beach', 'city', 'nature'],
            clothing: ['colorful', 'casual', 'beach-wear']
          },
          behaviorPatterns: {
            messageFrequency: 'very-high',
            responseTime: 'immediate',
            contentStyle: 'emotional',
            emojiUsage: 'extreme',
            groupParticipation: 'very-active'
          }
        }
      },
      'DE': {
        name: 'Germany',
        culture: {
          communicationStyle: 'direct',
          formalityLevel: 'high',
          timeZone: 'UTC+1',
          workingHours: '08:00-17:00',
          weekendDays: ['Saturday', 'Sunday'],
          holidays: ['Christmas', 'Easter', 'Oktoberfest'],
          socialMedia: ['WhatsApp', 'Facebook', 'LinkedIn', 'XING'],
          preferredLanguages: ['German', 'English'],
          namePatterns: {
            male: ['Hans', 'Karl', 'Heinrich', 'Friedrich', 'Wilhelm'],
            female: ['Anna', 'Bertha', 'Clara', 'Emma', 'Frieda'],
            surnames: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber']
          },
          avatarPreferences: {
            style: 'professional',
            expressions: ['confident', 'serious', 'determined'],
            backgrounds: ['office', 'industrial', 'nature'],
            clothing: ['business', 'engineering', 'outdoor']
          },
          behaviorPatterns: {
            messageFrequency: 'low',
            responseTime: 'punctual',
            contentStyle: 'precise',
            emojiUsage: 'minimal',
            groupParticipation: 'structured'
          }
        }
      }
      // ... 其他190个国家的配置
    };

    for (const [code, profile] of Object.entries(profiles)) {
      this.countryProfiles.set(code, profile);
    }

    this.logger.info(`国家文化档案初始化完成: ${this.countryProfiles.size} 个国家`);
  }

  /**
   * 智能识别账号国家
   */
  async identifyAccountCountry(accountInfo) {
    try {
      const {
        ipAddress,
        phoneNumber,
        language,
        timeZone,
        deviceInfo,
        behaviorData
      } = accountInfo;

      const indicators = [];

      // IP地理位置识别
      if (ipAddress) {
        const geoData = geoip.lookup(ipAddress);
        if (geoData) {
          indicators.push({
            source: 'ip_geolocation',
            country: geoData.country,
            confidence: 0.8,
            data: {
              city: geoData.city,
              region: geoData.region,
              timezone: geoData.timezone
            }
          });
        }
      }

      // 手机号码国家识别
      if (phoneNumber) {
        const countryCode = this.extractCountryFromPhone(phoneNumber);
        if (countryCode) {
          indicators.push({
            source: 'phone_number',
            country: countryCode,
            confidence: 0.9,
            data: { phoneNumber }
          });
        }
      }

      // 语言识别
      if (language) {
        const countryByLanguage = this.identifyCountryByLanguage(language);
        if (countryByLanguage) {
          indicators.push({
            source: 'language',
            country: countryByLanguage,
            confidence: 0.6,
            data: { language }
          });
        }
      }

      // 时区识别
      if (timeZone) {
        const countryByTimezone = this.identifyCountryByTimezone(timeZone);
        if (countryByTimezone) {
          indicators.push({
            source: 'timezone',
            country: countryByTimezone,
            confidence: 0.7,
            data: { timeZone }
          });
        }
      }

      // 行为模式识别
      if (behaviorData) {
        const countryByBehavior = await this.identifyCountryByBehavior(behaviorData);
        if (countryByBehavior) {
          indicators.push({
            source: 'behavior_pattern',
            country: countryByBehavior.country,
            confidence: countryByBehavior.confidence,
            data: behaviorData
          });
        }
      }

      // 综合评分算法
      const countryScores = this.calculateCountryScores(indicators);
      const bestMatch = this.getBestCountryMatch(countryScores);

      return {
        identifiedCountry: bestMatch.country,
        confidence: bestMatch.confidence,
        indicators,
        countryScores,
        culturalProfile: this.countryProfiles.get(bestMatch.country)
      };

    } catch (error) {
      this.logger.error('识别账号国家失败:', error);
      throw error;
    }
  }

  /**
   * 批量生成头像
   */
  async batchGenerateAvatars(accounts, options = {}) {
    try {
      const {
        style = 'auto', // auto, realistic, cartoon, professional
        diversity = true,
        customization = {}
      } = options;

      const results = [];
      const batchSize = 10;

      for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (account) => {
            try {
              // 根据国家文化选择合适的头像风格
              const countryProfile = this.countryProfiles.get(account.country);
              const avatarConfig = this.buildAvatarConfig(account, countryProfile, style);
              
              // 生成头像
              const avatar = await this.generateAvatar(avatarConfig);
              
              return {
                accountId: account.id,
                success: true,
                avatar: {
                  url: avatar.url,
                  thumbnail: avatar.thumbnail,
                  style: avatar.style,
                  characteristics: avatar.characteristics
                }
              };

            } catch (error) {
              return {
                accountId: account.id,
                success: false,
                error: error.message
              };
            }
          })
        );

        results.push(...batchResults);

        // 批次间延迟
        if (i + batchSize < accounts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const summary = {
        total: accounts.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };

      this.logger.info('批量生成头像完成', summary);

      return {
        results,
        summary
      };

    } catch (error) {
      this.logger.error('批量生成头像失败:', error);
      throw error;
    }
  }

  /**
   * 批量生成用户名
   */
  async batchGenerateUsernames(accounts, options = {}) {
    try {
      const {
        nameStyle = 'cultural', // cultural, international, business, creative
        includeNumbers = false,
        avoidDuplicates = true
      } = options;

      const usedNames = new Set();
      const results = [];

      for (const account of accounts) {
        try {
          const countryProfile = this.countryProfiles.get(account.country);
          const nameConfig = {
            country: account.country,
            gender: account.gender || 'random',
            style: nameStyle,
            culturalProfile: countryProfile,
            includeNumbers,
            usedNames: avoidDuplicates ? usedNames : null
          };

          // 生成用户名
          const username = await this.generateUsername(nameConfig);
          
          if (avoidDuplicates) {
            usedNames.add(username.username);
          }

          results.push({
            accountId: account.id,
            success: true,
            username: {
              username: username.username,
              displayName: username.displayName,
              firstName: username.firstName,
              lastName: username.lastName,
              culturalContext: username.culturalContext
            }
          });

        } catch (error) {
          results.push({
            accountId: account.id,
            success: false,
            error: error.message
          });
        }
      }

      const summary = {
        total: accounts.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        uniqueNames: usedNames.size
      };

      this.logger.info('批量生成用户名完成', summary);

      return {
        results,
        summary
      };

    } catch (error) {
      this.logger.error('批量生成用户名失败:', error);
      throw error;
    }
  }

  /**
   * 智能指纹生成
   */
  async generateIntelligentFingerprint(account) {
    try {
      const countryProfile = this.countryProfiles.get(account.country);
      
      // 基于国家的设备偏好
      const devicePreferences = this.getDevicePreferences(account.country);
      
      // 生成浏览器指纹
      const browserFingerprint = {
        userAgent: this.generateUserAgent(devicePreferences),
        screen: this.generateScreenConfig(devicePreferences),
        timezone: countryProfile.culture.timeZone,
        language: this.selectLanguage(countryProfile.culture.preferredLanguages),
        platform: devicePreferences.platform,
        webgl: this.generateWebGLFingerprint(),
        canvas: this.generateCanvasFingerprint(),
        fonts: this.generateFontList(account.country),
        plugins: this.generatePluginList(devicePreferences),
        hardware: this.generateHardwareProfile(devicePreferences)
      };

      // 生成网络指纹
      const networkFingerprint = {
        dnsServers: this.getDNSServers(account.country),
        mtu: this.getMTUSize(account.country),
        tcpWindowSize: this.getTCPWindowSize(),
        httpHeaders: this.generateHTTPHeaders(browserFingerprint)
      };

      // 生成行为指纹
      const behaviorFingerprint = {
        mouseMovement: this.generateMousePattern(countryProfile),
        typingPattern: this.generateTypingPattern(countryProfile),
        scrollBehavior: this.generateScrollPattern(countryProfile),
        clickPattern: this.generateClickPattern(countryProfile),
        idleTime: this.generateIdlePattern(countryProfile)
      };

      return {
        id: this.generateFingerprintId(),
        country: account.country,
        browser: browserFingerprint,
        network: networkFingerprint,
        behavior: behaviorFingerprint,
        createdAt: new Date(),
        consistency: this.calculateFingerprintConsistency(
          browserFingerprint,
          networkFingerprint,
          behaviorFingerprint
        )
      };

    } catch (error) {
      this.logger.error('生成智能指纹失败:', error);
      throw error;
    }
  }

  /**
   * 自动养号行为生成
   */
  async generateNurturingBehavior(account) {
    try {
      const countryProfile = this.countryProfiles.get(account.country);
      const behaviorPatterns = countryProfile.culture.behaviorPatterns;

      // 基于文化的行为策略
      const nurturingStrategy = {
        // 活跃时间模式
        activeHours: this.generateActiveHours(countryProfile),
        
        // 消息发送模式
        messagingPattern: {
          frequency: this.mapFrequency(behaviorPatterns.messageFrequency),
          responseTime: this.mapResponseTime(behaviorPatterns.responseTime),
          contentStyle: behaviorPatterns.contentStyle,
          emojiUsage: this.mapEmojiUsage(behaviorPatterns.emojiUsage)
        },

        // 群组参与模式
        groupBehavior: {
          participationLevel: behaviorPatterns.groupParticipation,
          joinStrategy: this.generateJoinStrategy(countryProfile),
          interactionStyle: this.generateInteractionStyle(countryProfile),
          contentSharing: this.generateContentSharingPattern(countryProfile)
        },

        // 社交网络行为
        socialNetworkBehavior: {
          platforms: countryProfile.culture.socialMedia,
          connectionPattern: this.generateConnectionPattern(countryProfile),
          postingFrequency: this.generatePostingFrequency(countryProfile),
          engagementStyle: this.generateEngagementStyle(countryProfile)
        },

        // 购买和商业行为
        commercialBehavior: {
          shoppingPattern: this.generateShoppingPattern(countryProfile),
          brandPreferences: this.generateBrandPreferences(countryProfile),
          priceSenesitivity: this.generatePriceSensitivity(countryProfile),
          trustFactors: this.generateTrustFactors(countryProfile)
        }
      };

      return {
        accountId: account.id,
        country: account.country,
        strategy: nurturingStrategy,
        schedule: await this.generateNurturingSchedule(nurturingStrategy),
        adaptiveRules: await this.generateAdaptiveRules(countryProfile),
        riskThresholds: await this.generateRiskThresholds(countryProfile),
        createdAt: new Date()
      };

    } catch (error) {
      this.logger.error('生成养号行为失败:', error);
      throw error;
    }
  }

  /**
   * 综合国家分数计算
   */
  calculateCountryScores(indicators) {
    const scores = new Map();

    for (const indicator of indicators) {
      const current = scores.get(indicator.country) || 0;
      scores.set(indicator.country, current + indicator.confidence);
    }

    // 归一化分数
    const maxScore = Math.max(...scores.values());
    if (maxScore > 0) {
      for (const [country, score] of scores) {
        scores.set(country, score / maxScore);
      }
    }

    return scores;
  }

  /**
   * 获取最佳国家匹配
   */
  getBestCountryMatch(countryScores) {
    let bestCountry = null;
    let bestScore = 0;

    for (const [country, score] of countryScores) {
      if (score > bestScore) {
        bestScore = score;
        bestCountry = country;
      }
    }

    return {
      country: bestCountry,
      confidence: bestScore
    };
  }

  /**
   * 工具方法
   */
  generateFingerprintId() {
    return `fp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  extractCountryFromPhone(phoneNumber) {
    // 简化的国家代码提取
    const countryCodeMap = {
      '+1': 'US',
      '+86': 'CN',
      '+91': 'IN',
      '+55': 'BR',
      '+49': 'DE',
      '+33': 'FR',
      '+44': 'GB',
      '+81': 'JP',
      '+82': 'KR',
      '+7': 'RU'
    };

    for (const [code, country] of Object.entries(countryCodeMap)) {
      if (phoneNumber.startsWith(code)) {
        return country;
      }
    }
    return null;
  }

  identifyCountryByLanguage(language) {
    const languageMap = {
      'en': 'US',
      'zh': 'CN',
      'hi': 'IN',
      'pt': 'BR',
      'de': 'DE',
      'fr': 'FR',
      'ja': 'JP',
      'ko': 'KR',
      'ru': 'RU',
      'es': 'ES'
    };

    return languageMap[language.toLowerCase()] || null;
  }

  identifyCountryByTimezone(timeZone) {
    const timezoneMap = {
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'Asia/Shanghai': 'CN',
      'Asia/Kolkata': 'IN',
      'America/Sao_Paulo': 'BR',
      'Europe/Berlin': 'DE',
      'Europe/Paris': 'FR',
      'Asia/Tokyo': 'JP',
      'Asia/Seoul': 'KR',
      'Europe/Moscow': 'RU'
    };

    return timezoneMap[timeZone] || null;
  }

  /**
   * 基于行为数据识别国家
   */
  async identifyCountryByBehavior(behaviorData) {
    try {
      if (!behaviorData || Object.keys(behaviorData).length === 0) {
        return null;
      }

      // 简化的行为模式分析
      const behaviorPatterns = {
        messageFrequency: behaviorData.messageFrequency || 'medium',
        responseTime: behaviorData.responseTime || 'medium',
        emojiUsage: behaviorData.emojiUsage || 'medium',
        activeHours: behaviorData.activeHours || []
      };

      // 基于行为模式匹配国家
      let bestMatch = { country: 'US', confidence: 0.5 }; // 默认美国

      // 高表情符号使用 -> 可能是南美或亚洲
      if (behaviorPatterns.emojiUsage === 'high') {
        bestMatch = { country: 'BR', confidence: 0.7 };
      }

      // 响应时间快 -> 可能是年轻群体集中的国家
      if (behaviorPatterns.responseTime === 'fast') {
        bestMatch = { country: 'KR', confidence: 0.6 };
      }

      // 活跃时间分析
      if (behaviorPatterns.activeHours.length > 0) {
        const avgHour = behaviorPatterns.activeHours.reduce((sum, hour) => sum + hour, 0) / behaviorPatterns.activeHours.length;
        
        // 基于活跃时间推测时区
        if (avgHour >= 20 || avgHour <= 2) { // 晚上活跃
          bestMatch = { country: 'CN', confidence: 0.6 };
        }
      }

      return bestMatch;
    } catch (error) {
      this.logger.error('行为分析失败:', error);
      return null;
    }
  }

  /**
   * 生成头像配置
   */
  buildAvatarConfig(account, countryProfile, style) {
    return {
      country: account.country,
      gender: account.gender || 'random',
      style: style === 'auto' ? countryProfile?.culture?.avatarPreferences?.style || 'realistic' : style,
      ethnicity: this.getRegionalEthnicity(account.country),
      expression: this.selectCulturalExpression(countryProfile),
      clothing: this.selectRegionalClothing(countryProfile),
      background: this.selectLocalBackground(countryProfile)
    };
  }

  /**
   * 生成头像
   */
  async generateAvatar(config) {
    // 简化的头像生成逻辑
    return {
      url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
      thumbnail: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}&size=64`,
      style: config.style,
      characteristics: {
        ethnicity: config.ethnicity,
        expression: config.expression,
        clothing: config.clothing,
        background: config.background
      }
    };
  }

  /**
   * 生成用户名
   */
  async generateUsername(config) {
    const countryProfile = config.culturalProfile;
    const namePatterns = countryProfile?.culture?.namePatterns;
    
    if (!namePatterns) {
      return {
        username: `user_${Date.now()}`,
        displayName: 'User',
        firstName: 'User',
        lastName: 'Name',
        culturalContext: config.country
      };
    }

    const firstName = this.selectRandomName(namePatterns.male, namePatterns.female, config.gender);
    const lastName = this.selectRandomName(namePatterns.surnames);
    const username = this.createUsername(firstName, lastName, config);

    return {
      username,
      displayName: `${firstName} ${lastName}`,
      firstName,
      lastName,
      culturalContext: config.country
    };
  }

  /**
   * 工具方法
   */
  getRegionalEthnicity(country) {
    const ethnicityMap = {
      'US': 'mixed',
      'CN': 'asian',
      'IN': 'south_asian',
      'BR': 'mixed',
      'DE': 'european',
      'FR': 'european',
      'JP': 'asian',
      'KR': 'asian',
      'RU': 'european'
    };
    return ethnicityMap[country] || 'mixed';
  }

  selectCulturalExpression(countryProfile) {
    const expressions = countryProfile?.culture?.avatarPreferences?.expressions || ['neutral'];
    return expressions[Math.floor(Math.random() * expressions.length)];
  }

  selectRegionalClothing(countryProfile) {
    const clothing = countryProfile?.culture?.avatarPreferences?.clothing || ['casual'];
    return clothing[Math.floor(Math.random() * clothing.length)];
  }

  selectLocalBackground(countryProfile) {
    const backgrounds = countryProfile?.culture?.avatarPreferences?.backgrounds || ['neutral'];
    return backgrounds[Math.floor(Math.random() * backgrounds.length)];
  }

  selectRandomName(maleNames, femaleNames, gender = null) {
    if (Array.isArray(maleNames)) {
      // 第一个参数是数组，直接从中选择
      return maleNames[Math.floor(Math.random() * maleNames.length)];
    } else {
      // 有性别区分的情况
      const names = gender === 'female' ? femaleNames : gender === 'male' ? maleNames : 
                   Math.random() > 0.5 ? maleNames : femaleNames;
      return names[Math.floor(Math.random() * names.length)];
    }
  }

  createUsername(firstName, lastName, config) {
    const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const sanitized = base.replace(/[^a-zA-Z0-9._]/g, '');
    
    if (config.includeNumbers) {
      return `${sanitized}${Math.floor(Math.random() * 1000)}`;
    }
    
    return sanitized;
  }
}

module.exports = GlobalIntelligenceService;