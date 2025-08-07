const express = require('express');
const multer = require('multer');
const path = require('path');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const WhatsAppBusinessService = require('../services/whatsappBusinessService');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/business-docs/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传 JPEG, PNG, PDF 格式的文件'));
    }
  }
});

// 批量创建蓝标认证账号
router.post('/batch-create', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const {
      count = 1,
      businesses = [],
      autoVerify = true,
      requestBlueCheck = true
    } = req.body;

    // 验证参数
    if (count < 1 || count > 10) {
      return res.status(400).json({
        success: false,
        message: '批量创建数量必须在 1-10 之间'
      });
    }

    if (businesses.length > 0 && businesses.length < count) {
      return res.status(400).json({
        success: false,
        message: '企业信息数量不足，请提供完整的企业信息列表'
      });
    }

    const businessService = new WhatsAppBusinessService(services.logger);
    const result = await businessService.batchCreateBusinessAccounts(req.user.userId, {
      count,
      businesses,
      autoVerify,
      requestBlueCheck
    });

    res.json({
      success: true,
      message: '批量创建蓝标认证账号已启动',
      data: result
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('批量创建蓝标账号失败:', error);
    res.status(500).json({
      success: false,
      message: '批量创建蓝标账号失败',
      error: error.message
    });
  }
});

// 单个蓝标认证申请
router.post('/single-create', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { businessInfo, requestBlueCheck = true } = req.body;

    if (!businessInfo || !businessInfo.name) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的企业信息'
      });
    }

    const businessService = new WhatsAppBusinessService(services.logger);
    
    // 创建单个 Business 账号
    const businessAccount = await businessService.createWhatsAppBusinessAccount(businessInfo);
    
    // 设置业务资料
    await businessService.setupBusinessProfile(businessAccount.id, businessInfo);
    
    let verificationRequest = null;
    if (requestBlueCheck) {
      verificationRequest = await businessService.requestBlueCheckVerification(
        businessAccount.id, 
        businessInfo
      );
    }

    res.json({
      success: true,
      message: 'WhatsApp Business 账号创建成功',
      data: {
        businessAccount,
        verificationRequest,
        nextSteps: requestBlueCheck ? [
          '等待 Facebook 审核（7-14个工作日）',
          '准备补充材料（如需要）',
          '审核通过后即可获得蓝标认证'
        ] : [
          '账号已创建，可开始使用基础功能',
          '如需蓝标认证，请提交认证申请'
        ]
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('创建蓝标账号失败:', error);
    res.status(500).json({
      success: false,
      message: '创建蓝标账号失败',
      error: error.message
    });
  }
});

// 上传企业认证文件
router.post('/upload-documents/:wabaId', 
  authMiddleware, 
  requirePermission('account_manage'),
  upload.array('documents', 10),
  async (req, res) => {
    try {
      const { services } = req.app.locals;
      const { wabaId } = req.params;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请上传至少一个认证文件'
        });
      }

      // 处理上传的文件
      const documents = files.map(file => ({
        type: req.body[`${file.fieldname}_type`] || 'business_license',
        filePath: file.path,
        filename: file.originalname,
        size: file.size
      }));

      const businessService = new WhatsAppBusinessService(services.logger);
      const uploadResult = await businessService.uploadBusinessDocuments(wabaId, documents);

      res.json({
        success: true,
        message: '企业认证文件上传成功',
        data: {
          wabaId,
          uploadedDocuments: uploadResult,
          totalFiles: files.length
        }
      });

    } catch (error) {
      const { services } = req.app.locals;
      services.logger.error('上传企业文件失败:', error);
      res.status(500).json({
        success: false,
        message: '上传企业文件失败',
        error: error.message
      });
    }
  }
);

// 申请蓝标认证
router.post('/request-verification/:wabaId', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { wabaId } = req.params;
    const { businessInfo } = req.body;

    if (!businessInfo) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的企业信息'
      });
    }

    const businessService = new WhatsAppBusinessService(services.logger);
    const verificationRequest = await businessService.requestBlueCheckVerification(wabaId, businessInfo);

    res.json({
      success: true,
      message: '蓝标认证申请已提交',
      data: {
        verificationRequest,
        estimatedReviewTime: '7-14个工作日',
        requirements: businessService.getBlueCheckRequirements()
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('申请蓝标认证失败:', error);
    res.status(500).json({
      success: false,
      message: '申请蓝标认证失败',
      error: error.message
    });
  }
});

// 检查认证状态
router.get('/verification-status/:wabaId', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { wabaId } = req.params;

    const businessService = new WhatsAppBusinessService(services.logger);
    const status = await businessService.checkVerificationStatus(wabaId);

    res.json({
      success: true,
      data: {
        ...status,
        statusExplanation: this.getStatusExplanation(status.verificationStatus)
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('检查认证状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查认证状态失败',
      error: error.message
    });
  }
});

// 批量检查认证状态
router.post('/batch-check-status', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { wabaIds } = req.body;

    if (!wabaIds || !Array.isArray(wabaIds) || wabaIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的 WABA ID 列表'
      });
    }

    const businessService = new WhatsAppBusinessService(services.logger);
    const results = await businessService.batchCheckVerificationStatus(wabaIds);

    const summary = {
      total: results.length,
      verified: results.filter(r => r.verificationStatus === 'VERIFIED').length,
      pending: results.filter(r => r.verificationStatus === 'PENDING').length,
      rejected: results.filter(r => r.verificationStatus === 'REJECTED').length,
      notSubmitted: results.filter(r => r.verificationStatus === 'NOT_SUBMITTED').length
    };

    res.json({
      success: true,
      data: {
        results,
        summary
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('批量检查认证状态失败:', error);
    res.status(500).json({
      success: false,
      message: '批量检查认证状态失败',
      error: error.message
    });
  }
});

// 创建消息模板
router.post('/create-template/:wabaId', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { wabaId } = req.params;
    const { templateData } = req.body;

    if (!templateData || !templateData.name) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的模板信息'
      });
    }

    const businessService = new WhatsAppBusinessService(services.logger);
    const template = await businessService.createMessageTemplate(wabaId, templateData);

    res.json({
      success: true,
      message: '消息模板创建成功',
      data: {
        template,
        note: '模板需要通过 WhatsApp 审核后才能使用'
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('创建消息模板失败:', error);
    res.status(500).json({
      success: false,
      message: '创建消息模板失败',
      error: error.message
    });
  }
});

// 发送模板消息
router.post('/send-template/:phoneNumberId', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { phoneNumberId } = req.params;
    const { to, templateName, languageCode, parameters } = req.body;

    if (!to || !templateName || !languageCode) {
      return res.status(400).json({
        success: false,
        message: '请提供收件人、模板名称和语言代码'
      });
    }

    const businessService = new WhatsAppBusinessService(services.logger);
    const result = await businessService.sendTemplateMessage(
      phoneNumberId, 
      to, 
      templateName, 
      languageCode, 
      parameters || []
    );

    res.json({
      success: true,
      message: '模板消息发送成功',
      data: result
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('发送模板消息失败:', error);
    res.status(500).json({
      success: false,
      message: '发送模板消息失败',
      error: error.message
    });
  }
});

// 获取蓝标认证要求
router.get('/requirements', authMiddleware, async (req, res) => {
  try {
    const businessService = new WhatsAppBusinessService();
    const requirements = businessService.getBlueCheckRequirements();

    res.json({
      success: true,
      data: requirements
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取认证要求失败:', error);
    res.status(500).json({
      success: false,
      message: '获取认证要求失败',
      error: error.message
    });
  }
});

// 获取企业模板
router.get('/business-templates', authMiddleware, async (req, res) => {
  try {
    const templates = {
      ecommerce: {
        name: '电商企业模板',
        category: 'ECOMMERCE',
        industry: 'E-commerce',
        description: '专业的电商企业，提供优质的商品和服务',
        vertical: 'ECOMMERCE',
        requiredFields: ['business_license', 'tax_certificate', 'bank_statement'],
        messageTemplates: [
          {
            name: 'order_confirmation',
            category: 'TRANSACTIONAL',
            components: [
              {
                type: 'HEADER',
                text: '订单确认'
              },
              {
                type: 'BODY',
                text: '您好 {{1}}，您的订单 {{2}} 已确认，预计 {{3}} 发货。'
              }
            ]
          }
        ]
      },
      technology: {
        name: '科技企业模板',
        category: 'BUSINESS_SERVICE',
        industry: 'Technology',
        description: '创新的科技企业，提供先进的技术解决方案',
        vertical: 'UNDEFINED',
        requiredFields: ['business_license', 'tax_certificate'],
        messageTemplates: [
          {
            name: 'service_update',
            category: 'UTILITY',
            components: [
              {
                type: 'HEADER',
                text: '服务更新通知'
              },
              {
                type: 'BODY',
                text: '亲爱的用户，我们的 {{1}} 服务将在 {{2}} 进行更新维护。'
              }
            ]
          }
        ]
      },
      education: {
        name: '教育机构模板',
        category: 'EDUCATION',
        industry: 'Education',
        description: '专业的教育机构，致力于提供优质的教育服务',
        vertical: 'EDUCATION',
        requiredFields: ['business_license', 'education_permit'],
        messageTemplates: [
          {
            name: 'class_reminder',
            category: 'UTILITY',
            components: [
              {
                type: 'HEADER',
                text: '课程提醒'
              },
              {
                type: 'BODY',
                text: '{{1}} 同学，您的 {{2}} 课程将在 {{3}} 开始，请准时参加。'
              }
            ]
          }
        ]
      }
    };

    res.json({
      success: true,
      data: {
        templates,
        note: '选择适合您企业类型的模板，可以提高认证通过率'
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取企业模板失败:', error);
    res.status(500).json({
      success: false,
      message: '获取企业模板失败',
      error: error.message
    });
  }
});

// 认证进度统计
router.get('/statistics', authMiddleware, requirePermission('account_manage'), async (req, res) => {
  try {
    // 这里应该从数据库获取真实统计数据
    const statistics = {
      total: {
        submitted: 25,
        approved: 18,
        rejected: 3,
        pending: 4
      },
      byIndustry: {
        ecommerce: { submitted: 10, approved: 8 },
        technology: { submitted: 8, approved: 6 },
        education: { submitted: 5, approved: 3 },
        other: { submitted: 2, approved: 1 }
      },
      averageReviewTime: '10天',
      approvalRate: '72%',
      commonRejectionReasons: [
        '企业信息不完整',
        '文件质量不符合要求',
        '网站信息不匹配',
        '企业规模不符合要求'
      ],
      tips: [
        '确保企业信息完整准确',
        '提供高质量的认证文件',
        '保持网站内容与申请信息一致',
        '积极配合审核团队的询问'
      ]
    };

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取认证统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取认证统计失败',
      error: error.message
    });
  }
});

// 工具方法
function getStatusExplanation(status) {
  const explanations = {
    'VERIFIED': '已认证 - 您的企业已获得蓝标认证，可以使用所有商业功能',
    'PENDING': '审核中 - 您的认证申请正在审核中，请耐心等待',
    'REJECTED': '已拒绝 - 认证申请被拒绝，请查看拒绝原因并重新申请',
    'NOT_SUBMITTED': '未提交 - 尚未提交认证申请',
    'ADDITIONAL_INFO_REQUIRED': '需要补充信息 - 请提供额外的认证材料'
  };
  
  return explanations[status] || '状态未知';
}

module.exports = router;