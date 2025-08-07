const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class WhatsAppBusinessService {
  constructor(logger) {
    this.logger = logger;
    this.facebookGraphAPI = 'https://graph.facebook.com/v18.0';
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    this.businessId = process.env.FACEBOOK_BUSINESS_ID;
    this.wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  }

  /**
   * 批量创建 WhatsApp Business 账号
   */
  async batchCreateBusinessAccounts(userId, config) {
    try {
      const {
        count = 1,
        businesses = [], // 企业信息列表
        autoVerify = true,
        requestBlueCheck = true
      } = config;

      this.logger.info(`开始批量创建 WhatsApp Business 账号: ${count} 个`);

      const results = {
        total: count,
        success: [],
        failed: [],
        pending: [],
        businessAccounts: [],
        verificationRequests: []
      };

      for (let i = 0; i < count; i++) {
        try {
          const businessInfo = businesses[i] || this.generateDefaultBusiness(i);
          
          // 1. 创建 WhatsApp Business 账号
          const businessAccount = await this.createWhatsAppBusinessAccount(businessInfo);
          results.businessAccounts.push(businessAccount);

          // 2. 设置业务资料
          await this.setupBusinessProfile(businessAccount.id, businessInfo);

          // 3. 上传企业文件
          if (businessInfo.documents) {
            await this.uploadBusinessDocuments(businessAccount.id, businessInfo.documents);
          }

          // 4. 申请蓝标认证
          if (requestBlueCheck) {
            const verificationRequest = await this.requestBlueCheckVerification(
              businessAccount.id, 
              businessInfo
            );
            results.verificationRequests.push(verificationRequest);
          }

          // 5. 设置 Webhook
          await this.setupWebhook(businessAccount.id);

          results.success.push({
            index: i + 1,
            businessAccountId: businessAccount.id,
            phoneNumberId: businessAccount.phoneNumberId,
            businessName: businessInfo.name,
            status: 'created',
            verificationStatus: requestBlueCheck ? 'pending' : 'not_requested'
          });

          this.logger.info(`Business 账号创建成功 #${i + 1}: ${businessInfo.name}`);

          // 避免频率限制
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          results.failed.push({
            index: i + 1,
            error: error.message,
            businessInfo: businesses[i]
          });
          
          this.logger.error(`Business 账号创建失败 #${i + 1}:`, error);
        }
      }

      this.logger.info(`批量创建完成: 成功 ${results.success.length}, 失败 ${results.failed.length}`);
      return results;

    } catch (error) {
      this.logger.error('批量创建 Business 账号失败:', error);
      throw error;
    }
  }

  /**
   * 创建 WhatsApp Business 账号
   */
  async createWhatsAppBusinessAccount(businessInfo) {
    try {
      const response = await axios.post(
        `${this.facebookGraphAPI}/${this.businessId}/whatsapp_business_accounts`,
        {
          name: businessInfo.name,
          category: businessInfo.category,
          description: businessInfo.description,
          profile_picture_url: businessInfo.profilePicture,
          websites: businessInfo.websites,
          vertical: businessInfo.vertical
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const wabaId = response.data.id;

      // 购买电话号码
      const phoneNumber = await this.purchasePhoneNumber(wabaId, businessInfo.country);

      return {
        id: wabaId,
        phoneNumberId: phoneNumber.id,
        phoneNumber: phoneNumber.display_phone_number,
        status: 'active'
      };

    } catch (error) {
      this.logger.error('创建 WhatsApp Business 账号失败:', error);
      throw error;
    }
  }

  /**
   * 购买电话号码
   */
  async purchasePhoneNumber(wabaId, country = 'US') {
    try {
      // 1. 搜索可用号码
      const searchResponse = await axios.get(
        `${this.facebookGraphAPI}/${wabaId}/phone_numbers`,
        {
          params: {
            country: country,
            type: 'local',
            limit: 10
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      if (searchResponse.data.data.length === 0) {
        throw new Error(`没有可用的 ${country} 号码`);
      }

      const availableNumber = searchResponse.data.data[0];

      // 2. 购买号码
      const purchaseResponse = await axios.post(
        `${this.facebookGraphAPI}/${wabaId}/phone_numbers`,
        {
          phone_number: availableNumber.phone_number,
          messaging_product: 'whatsapp'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return purchaseResponse.data;

    } catch (error) {
      this.logger.error('购买电话号码失败:', error);
      throw error;
    }
  }

  /**
   * 设置业务资料
   */
  async setupBusinessProfile(wabaId, businessInfo) {
    try {
      const response = await axios.post(
        `${this.facebookGraphAPI}/${wabaId}/phone_numbers`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      const phoneNumberId = response.data.data[0].id;

      // 更新业务资料
      await axios.post(
        `${this.facebookGraphAPI}/${phoneNumberId}`,
        {
          messaging_product: 'whatsapp',
          about: businessInfo.about,
          address: businessInfo.address,
          description: businessInfo.description,
          email: businessInfo.email,
          profile_picture_url: businessInfo.profilePicture,
          websites: businessInfo.websites,
          vertical: businessInfo.vertical
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.info(`业务资料设置完成: ${wabaId}`);

    } catch (error) {
      this.logger.error('设置业务资料失败:', error);
      throw error;
    }
  }

  /**
   * 申请蓝标认证
   */
  async requestBlueCheckVerification(wabaId, businessInfo) {
    try {
      // WhatsApp Business API 蓝标认证申请
      const verificationData = {
        messaging_product: 'whatsapp',
        business_info: {
          business_name: businessInfo.name,
          business_description: businessInfo.description,
          business_industry: businessInfo.industry,
          business_email: businessInfo.email,
          business_website: businessInfo.website,
          business_address: {
            street_1: businessInfo.address.street,
            street_2: businessInfo.address.street2 || '',
            city: businessInfo.address.city,
            state: businessInfo.address.state,
            postal_code: businessInfo.address.postalCode,
            country: businessInfo.address.country
          }
        },
        business_documents: businessInfo.verificationDocuments || [],
        verification_type: 'BLUE_CHECK'
      };

      const response = await axios.post(
        `${this.facebookGraphAPI}/${wabaId}/business_verification`,
        verificationData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.info(`蓝标认证申请已提交: ${wabaId}`);
      
      return {
        wabaId,
        verificationId: response.data.id,
        status: 'pending',
        submittedAt: new Date(),
        expectedReviewTime: '7-14 工作日'
      };

    } catch (error) {
      this.logger.error('申请蓝标认证失败:', error);
      throw error;
    }
  }

  /**
   * 上传企业文件
   */
  async uploadBusinessDocuments(wabaId, documents) {
    try {
      const uploadedDocs = [];

      for (const doc of documents) {
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', fs.createReadStream(doc.filePath));
        formData.append('type', doc.type); // business_license, tax_id, etc.

        const response = await axios.post(
          `${this.facebookGraphAPI}/${wabaId}/media`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              ...formData.getHeaders()
            }
          }
        );

        uploadedDocs.push({
          type: doc.type,
          mediaId: response.data.id,
          filename: doc.filename
        });
      }

      this.logger.info(`企业文件上传完成: ${uploadedDocs.length} 个文件`);
      return uploadedDocs;

    } catch (error) {
      this.logger.error('上传企业文件失败:', error);
      throw error;
    }
  }

  /**
   * 设置 Webhook
   */
  async setupWebhook(wabaId) {
    try {
      await axios.post(
        `${this.facebookGraphAPI}/${wabaId}/subscribed_apps`,
        {
          subscribed_fields: [
            'messages',
            'message_deliveries', 
            'message_reads',
            'message_echoes'
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.info(`Webhook 设置完成: ${wabaId}`);

    } catch (error) {
      this.logger.error('设置 Webhook 失败:', error);
      throw error;
    }
  }

  /**
   * 检查认证状态
   */
  async checkVerificationStatus(wabaId) {
    try {
      const response = await axios.get(
        `${this.facebookGraphAPI}/${wabaId}`,
        {
          params: {
            fields: 'account_review_status,business_verification_status,name'
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      return {
        wabaId,
        name: response.data.name,
        reviewStatus: response.data.account_review_status,
        verificationStatus: response.data.business_verification_status,
        checkedAt: new Date()
      };

    } catch (error) {
      this.logger.error('检查认证状态失败:', error);
      throw error;
    }
  }

  /**
   * 批量检查认证状态
   */
  async batchCheckVerificationStatus(wabaIds) {
    const results = [];
    
    for (const wabaId of wabaIds) {
      try {
        const status = await this.checkVerificationStatus(wabaId);
        results.push(status);
        
        // 避免频率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          wabaId,
          error: error.message,
          checkedAt: new Date()
        });
      }
    }

    return results;
  }

  /**
   * 创建消息模板（蓝标认证后可用）
   */
  async createMessageTemplate(wabaId, templateData) {
    try {
      const response = await axios.post(
        `${this.facebookGraphAPI}/${wabaId}/message_templates`,
        {
          name: templateData.name,
          language: templateData.language,
          category: templateData.category,
          components: templateData.components
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.info(`消息模板创建成功: ${templateData.name}`);
      return response.data;

    } catch (error) {
      this.logger.error('创建消息模板失败:', error);
      throw error;
    }
  }

  /**
   * 发送模板消息（蓝标账号专用）
   */
  async sendTemplateMessage(phoneNumberId, to, templateName, languageCode, parameters = []) {
    try {
      const response = await axios.post(
        `${this.facebookGraphAPI}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: parameters.length > 0 ? [
              {
                type: 'body',
                parameters: parameters
              }
            ] : []
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.logger.info(`模板消息发送成功: ${templateName} -> ${to}`);
      return response.data;

    } catch (error) {
      this.logger.error('发送模板消息失败:', error);
      throw error;
    }
  }

  /**
   * 生成默认企业信息
   */
  generateDefaultBusiness(index) {
    const industries = ['E-commerce', 'Technology', 'Healthcare', 'Education', 'Finance'];
    const categories = ['BUSINESS_SERVICE', 'ECOMMERCE', 'EDUCATION', 'ENTERTAINMENT', 'UTILITY'];
    
    return {
      name: `Business Account ${index + 1}`,
      description: `Professional business account for customer communication`,
      category: categories[index % categories.length],
      industry: industries[index % industries.length],
      vertical: 'UNDEFINED',
      country: 'US',
      email: `business${index + 1}@example.com`,
      website: `https://business${index + 1}.example.com`,
      websites: [`https://business${index + 1}.example.com`],
      about: 'We provide excellent customer service through WhatsApp',
      address: {
        street: `${100 + index} Business Street`,
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'US'
      },
      profilePicture: null,
      verificationDocuments: []
    };
  }

  /**
   * 获取蓝标认证指南
   */
  getBlueCheckRequirements() {
    return {
      eligibility: [
        '企业必须是真实存在的合法实体',
        '提供准确完整的企业信息',
        '企业必须有官方网站',
        '提供有效的企业联系方式',
        '遵守 WhatsApp 商业政策'
      ],
      requiredDocuments: [
        {
          type: 'business_license',
          description: '营业执照或企业注册证明',
          format: 'PDF, JPG, PNG',
          maxSize: '8MB'
        },
        {
          type: 'tax_certificate',
          description: '税务登记证明',
          format: 'PDF, JPG, PNG',
          maxSize: '8MB'
        },
        {
          type: 'bank_statement',
          description: '企业银行对账单（最近3个月）',
          format: 'PDF',
          maxSize: '8MB'
        },
        {
          type: 'website_screenshot',
          description: '企业官网截图',
          format: 'JPG, PNG',
          maxSize: '5MB'
        }
      ],
      reviewProcess: [
        '提交申请和相关文件',
        'Facebook 团队审核（7-14个工作日）',
        '可能需要提供额外信息',
        '审核通过后获得蓝标认证',
        '可以使用高级商业功能'
      ],
      benefits: [
        '提升品牌可信度和专业形象',
        '获得蓝色认证徽章',
        '使用官方消息模板',
        '发送营销和通知消息',
        '访问高级分析功能',
        '更高的消息发送限制',
        '优先客服支持'
      ]
    };
  }
}

module.exports = WhatsAppBusinessService;