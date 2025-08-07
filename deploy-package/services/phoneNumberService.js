const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class PhoneNumberService {
  constructor(logger) {
    this.logger = logger;
    this.providers = {
      fivesim: new FiveSimProvider(),
      smsactivate: new SmsActivateProvider(),
      twilio: new TwilioProvider(),
      smshub: new SmsHubProvider()
    };
    this.activeNumbers = new Map(); // phoneNumber -> provider info
    this.verificationCodes = new Map(); // phoneNumber -> codes
  }

  /**
   * 获取临时手机号
   */
  async getPhoneNumber(provider = 'fivesim', country = 'china', service = 'whatsapp') {
    try {
      const providerInstance = this.providers[provider];
      if (!providerInstance) {
        throw new Error(`不支持的服务商: ${provider}`);
      }

      const phoneData = await providerInstance.getNumber(country, service);
      
      // 记录号码信息
      this.activeNumbers.set(phoneData.phoneNumber, {
        provider,
        orderId: phoneData.orderId,
        phoneNumber: phoneData.phoneNumber,
        country,
        service,
        status: 'waiting',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000) // 20分钟过期
      });

      this.logger.info(`获取手机号成功: ${phoneData.phoneNumber} from ${provider}`);
      return phoneData;

    } catch (error) {
      this.logger.error(`获取手机号失败: ${provider}`, error);
      throw error;
    }
  }

  /**
   * 获取验证码
   */
  async getVerificationCode(phoneNumber, timeout = 300000) {
    try {
      const numberInfo = this.activeNumbers.get(phoneNumber);
      if (!numberInfo) {
        throw new Error(`手机号不存在: ${phoneNumber}`);
      }

      const providerInstance = this.providers[numberInfo.provider];
      const startTime = Date.now();

      // 轮询获取验证码
      while (Date.now() - startTime < timeout) {
        try {
          const code = await providerInstance.getCode(numberInfo.orderId);
          if (code) {
            this.verificationCodes.set(phoneNumber, {
              code,
              receivedAt: new Date(),
              orderId: numberInfo.orderId
            });

            // 更新号码状态
            numberInfo.status = 'received';
            
            this.logger.info(`收到验证码: ${phoneNumber} - ${code}`);
            return {
              phoneNumber,
              code,
              receivedAt: new Date()
            };
          }
        } catch (error) {
          this.logger.warn(`获取验证码失败: ${phoneNumber}`, error.message);
        }

        // 等待10秒再次尝试
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      throw new Error(`验证码获取超时: ${phoneNumber}`);

    } catch (error) {
      this.logger.error(`获取验证码失败: ${phoneNumber}`, error);
      throw error;
    }
  }

  /**
   * 释放手机号
   */
  async releasePhoneNumber(phoneNumber) {
    try {
      const numberInfo = this.activeNumbers.get(phoneNumber);
      if (!numberInfo) {
        return;
      }

      const providerInstance = this.providers[numberInfo.provider];
      await providerInstance.finishOrder(numberInfo.orderId);

      this.activeNumbers.delete(phoneNumber);
      this.verificationCodes.delete(phoneNumber);

      this.logger.info(`手机号已释放: ${phoneNumber}`);
    } catch (error) {
      this.logger.error(`释放手机号失败: ${phoneNumber}`, error);
    }
  }

  /**
   * 批量获取手机号
   */
  async getBatchPhoneNumbers(count, provider = 'fivesim', country = 'china', service = 'whatsapp') {
    const results = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        const phoneData = await this.getPhoneNumber(provider, country, service);
        results.push(phoneData);
        
        // 添加延迟避免频率限制
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        errors.push({
          index: i,
          error: error.message
        });
      }
    }

    return {
      success: results,
      errors,
      total: count,
      successCount: results.length,
      errorCount: errors.length
    };
  }

  /**
   * 获取支持的国家和服务
   */
  async getSupportedServices(provider = 'fivesim') {
    try {
      const providerInstance = this.providers[provider];
      return await providerInstance.getSupportedServices();
    } catch (error) {
      this.logger.error(`获取支持服务失败: ${provider}`, error);
      throw error;
    }
  }

  /**
   * 获取价格信息
   */
  async getPricing(provider = 'fivesim', country = 'china', service = 'whatsapp') {
    try {
      const providerInstance = this.providers[provider];
      return await providerInstance.getPricing(country, service);
    } catch (error) {
      this.logger.error(`获取价格信息失败: ${provider}`, error);
      throw error;
    }
  }

  /**
   * 清理过期号码
   */
  async cleanupExpiredNumbers() {
    const now = new Date();
    const expiredNumbers = [];

    for (const [phoneNumber, numberInfo] of this.activeNumbers.entries()) {
      if (now > numberInfo.expiresAt) {
        expiredNumbers.push(phoneNumber);
      }
    }

    for (const phoneNumber of expiredNumbers) {
      await this.releasePhoneNumber(phoneNumber);
    }

    if (expiredNumbers.length > 0) {
      this.logger.info(`清理过期号码: ${expiredNumbers.length} 个`);
    }
  }

  /**
   * 获取账户余额
   */
  async getBalance(provider = 'fivesim') {
    try {
      const providerInstance = this.providers[provider];
      return await providerInstance.getBalance();
    } catch (error) {
      this.logger.error(`获取余额失败: ${provider}`, error);
      throw error;
    }
  }
}

// 5sim.net 服务商
class FiveSimProvider {
  constructor() {
    this.apiKey = process.env.FIVESIM_API_KEY;
    this.baseURL = 'https://5sim.net/v1';
  }

  async getNumber(country, service) {
    const response = await axios.get(`${this.baseURL}/user/buy/activation/${country}/${service}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (response.data.success) {
      return {
        orderId: response.data.id,
        phoneNumber: response.data.phone,
        cost: response.data.cost,
        provider: '5sim'
      };
    }

    throw new Error(`5sim 获取号码失败: ${response.data.message}`);
  }

  async getCode(orderId) {
    const response = await axios.get(`${this.baseURL}/user/check/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (response.data.status === 'RECEIVED') {
      return response.data.sms;
    }

    return null;
  }

  async finishOrder(orderId) {
    await axios.get(`${this.baseURL}/user/finish/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });
  }

  async getSupportedServices() {
    const response = await axios.get(`${this.baseURL}/guest/products`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.data;
  }

  async getPricing(country, service) {
    const response = await axios.get(`${this.baseURL}/guest/prices?country=${country}&product=${service}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    return response.data;
  }

  async getBalance() {
    const response = await axios.get(`${this.baseURL}/user/profile`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      }
    });

    return {
      balance: response.data.balance,
      currency: 'RUB'
    };
  }
}

// SMS-Activate 服务商
class SmsActivateProvider {
  constructor() {
    this.apiKey = process.env.SMSACTIVATE_API_KEY;
    this.baseURL = 'https://sms-activate.org/stubs/handler_api.php';
  }

  async getNumber(country, service) {
    const response = await axios.get(this.baseURL, {
      params: {
        api_key: this.apiKey,
        action: 'getNumber',
        service: this.mapService(service),
        country: this.mapCountry(country)
      }
    });

    const data = response.data.split(':');
    if (data[0] === 'ACCESS_NUMBER') {
      return {
        orderId: data[1],
        phoneNumber: data[2],
        provider: 'sms-activate'
      };
    }

    throw new Error(`SMS-Activate 获取号码失败: ${response.data}`);
  }

  async getCode(orderId) {
    const response = await axios.get(this.baseURL, {
      params: {
        api_key: this.apiKey,
        action: 'getStatus',
        id: orderId
      }
    });

    const data = response.data.split(':');
    if (data[0] === 'STATUS_OK') {
      return data[1];
    }

    return null;
  }

  async finishOrder(orderId) {
    await axios.get(this.baseURL, {
      params: {
        api_key: this.apiKey,
        action: 'setStatus',
        status: '6',
        id: orderId
      }
    });
  }

  async getSupportedServices() {
    // SMS-Activate 的服务列表
    return {
      whatsapp: 'wa',
      telegram: 'tg',
      facebook: 'fb',
      instagram: 'ig'
    };
  }

  async getPricing(country, service) {
    const response = await axios.get(this.baseURL, {
      params: {
        api_key: this.apiKey,
        action: 'getPrices',
        service: this.mapService(service),
        country: this.mapCountry(country)
      }
    });

    return response.data;
  }

  async getBalance() {
    const response = await axios.get(this.baseURL, {
      params: {
        api_key: this.apiKey,
        action: 'getBalance'
      }
    });

    return {
      balance: parseFloat(response.data.split(':')[1]),
      currency: 'RUB'
    };
  }

  mapService(service) {
    const serviceMap = {
      whatsapp: 'wa',
      telegram: 'tg',
      facebook: 'fb',
      instagram: 'ig'
    };
    return serviceMap[service] || service;
  }

  mapCountry(country) {
    const countryMap = {
      china: '3',
      russia: '0',
      ukraine: '1',
      kazakhstan: '2'
    };
    return countryMap[country] || '0';
  }
}

// Twilio 服务商（用于真实手机号）
class TwilioProvider {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.baseURL = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  async getNumber(country, service) {
    // Twilio 购买手机号
    const response = await axios.post(`${this.baseURL}/IncomingPhoneNumbers.json`, 
      new URLSearchParams({
        AreaCode: this.getAreaCode(country)
      }), {
        auth: {
          username: this.accountSid,
          password: this.authToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return {
      orderId: response.data.sid,
      phoneNumber: response.data.phone_number,
      provider: 'twilio'
    };
  }

  async getCode(orderId) {
    // Twilio 接收短信
    const response = await axios.get(`${this.baseURL}/Messages.json?To=${orderId}`, {
      auth: {
        username: this.accountSid,
        password: this.authToken
      }
    });

    const messages = response.data.messages;
    if (messages.length > 0) {
      const latestMessage = messages[0];
      const codeMatch = latestMessage.body.match(/\d{4,6}/);
      return codeMatch ? codeMatch[0] : null;
    }

    return null;
  }

  async finishOrder(orderId) {
    // Twilio 释放号码
    await axios.delete(`${this.baseURL}/IncomingPhoneNumbers/${orderId}.json`, {
      auth: {
        username: this.accountSid,
        password: this.authToken
      }
    });
  }

  async getSupportedServices() {
    return ['whatsapp', 'telegram', 'sms', 'voice'];
  }

  async getPricing(country, service) {
    const response = await axios.get(`${this.baseURL}/Pricing/PhoneNumbers/Countries/${country}.json`, {
      auth: {
        username: this.accountSid,
        password: this.authToken
      }
    });

    return response.data;
  }

  async getBalance() {
    const response = await axios.get(`${this.baseURL}.json`, {
      auth: {
        username: this.accountSid,
        password: this.authToken
      }
    });

    return {
      balance: parseFloat(response.data.balance),
      currency: 'USD'
    };
  }

  getAreaCode(country) {
    const areaCodes = {
      china: '86',
      usa: '1',
      uk: '44',
      canada: '1'
    };
    return areaCodes[country] || '1';
  }
}

// SMS-Hub 服务商
class SmsHubProvider {
  constructor() {
    this.apiKey = process.env.SMSHUB_API_KEY;
    this.baseURL = 'https://smshub.org/stubs/handler_api.php';
  }

  async getNumber(country, service) {
    const response = await axios.post(this.baseURL, new URLSearchParams({
      api_key: this.apiKey,
      action: 'getNumber',
      service: service,
      country: country
    }));

    const data = response.data.split(':');
    if (data[0] === 'ACCESS_NUMBER') {
      return {
        orderId: data[1],
        phoneNumber: data[2],
        provider: 'smshub'
      };
    }

    throw new Error(`SMS-Hub 获取号码失败: ${response.data}`);
  }

  async getCode(orderId) {
    const response = await axios.post(this.baseURL, new URLSearchParams({
      api_key: this.apiKey,
      action: 'getStatus',
      id: orderId
    }));

    const data = response.data.split(':');
    if (data[0] === 'STATUS_OK') {
      return data[1];
    }

    return null;
  }

  async finishOrder(orderId) {
    await axios.post(this.baseURL, new URLSearchParams({
      api_key: this.apiKey,
      action: 'setStatus',
      status: '6',
      id: orderId
    }));
  }

  async getSupportedServices() {
    const response = await axios.post(this.baseURL, new URLSearchParams({
      api_key: this.apiKey,
      action: 'getServices'
    }));

    return JSON.parse(response.data);
  }

  async getPricing(country, service) {
    const response = await axios.post(this.baseURL, new URLSearchParams({
      api_key: this.apiKey,
      action: 'getPrices',
      service: service,
      country: country
    }));

    return JSON.parse(response.data);
  }

  async getBalance() {
    const response = await axios.post(this.baseURL, new URLSearchParams({
      api_key: this.apiKey,
      action: 'getBalance'
    }));

    return {
      balance: parseFloat(response.data.split(':')[1]),
      currency: 'RUB'
    };
  }
}

module.exports = PhoneNumberService;