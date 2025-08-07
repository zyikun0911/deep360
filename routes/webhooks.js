const express = require('express');
const { apiKeyAuth } = require('../middleware/auth');

const router = express.Router();

// WhatsApp Webhook
router.post('/whatsapp/:accountId', async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;
    const webhookData = req.body;

    services.logger.info(`WhatsApp Webhook 接收: ${accountId}`, webhookData);

    // 处理 WhatsApp webhook 事件
    await handleWhatsAppWebhook(accountId, webhookData, services);

    res.status(200).json({
      success: true,
      message: 'Webhook 处理成功'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('WhatsApp Webhook 处理失败:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook 处理失败',
      error: error.message
    });
  }
});

// Telegram Webhook
router.post('/telegram/:accountId', async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { accountId } = req.params;
    const webhookData = req.body;

    services.logger.info(`Telegram Webhook 接收: ${accountId}`, webhookData);

    // 处理 Telegram webhook 事件
    await handleTelegramWebhook(accountId, webhookData, services);

    res.status(200).json({
      success: true,
      message: 'Webhook 处理成功'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('Telegram Webhook 处理失败:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook 处理失败',
      error: error.message
    });
  }
});

// 系统状态 Webhook（健康检查）
router.get('/health', async (req, res) => {
  try {
    const healthCheck = require('../healthcheck');
    const status = await healthCheck();
    
    res.status(status.status === 'healthy' ? 200 : 503).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 第三方服务状态回调
router.post('/status/:service', apiKeyAuth, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { service } = req.params;
    const statusData = req.body;

    services.logger.info(`服务状态回调: ${service}`, statusData);

    // 根据不同服务处理状态更新
    switch (service) {
      case 'payment':
        await handlePaymentStatus(statusData, services);
        break;
      case 'email':
        await handleEmailStatus(statusData, services);
        break;
      case 'sms':
        await handleSMSStatus(statusData, services);
        break;
      default:
        services.logger.warn(`未知的服务状态回调: ${service}`);
    }

    res.json({
      success: true,
      message: '状态回调处理成功'
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('状态回调处理失败:', error);
    res.status(500).json({
      success: false,
      message: '状态回调处理失败',
      error: error.message
    });
  }
});

// 处理函数

async function handleWhatsAppWebhook(accountId, data, services) {
  const { socketService, accountManager } = services;
  
  switch (data.type) {
    case 'message':
      // 消息接收
      socketService.emitToAccount(accountId, 'message_received', {
        messageId: data.messageId,
        from: data.from,
        content: data.content,
        timestamp: data.timestamp
      });
      
      // 更新账号统计
      await accountManager.updateAccountStats(accountId, 'messagesReceived');
      break;
      
    case 'status':
      // 状态更新
      socketService.emitToAccount(accountId, 'status_update', {
        status: data.status,
        message: data.message
      });
      break;
      
    case 'qr':
      // QR码更新
      socketService.emitToAccount(accountId, 'qr_code', {
        qrCode: data.qrCode
      });
      break;
      
    default:
      services.logger.warn(`未处理的 WhatsApp webhook 类型: ${data.type}`);
  }
}

async function handleTelegramWebhook(accountId, data, services) {
  const { socketService, accountManager } = services;
  
  if (data.message) {
    // 消息接收
    socketService.emitToAccount(accountId, 'message_received', {
      messageId: data.message.message_id,
      chatId: data.message.chat.id,
      from: data.message.from,
      text: data.message.text,
      timestamp: data.message.date
    });
    
    // 更新账号统计
    await accountManager.updateAccountStats(accountId, 'messagesReceived');
  }
  
  if (data.callback_query) {
    // 回调查询
    socketService.emitToAccount(accountId, 'callback_query', {
      id: data.callback_query.id,
      data: data.callback_query.data,
      from: data.callback_query.from
    });
  }
}

async function handlePaymentStatus(data, services) {
  const { socketService } = services;
  
  // 处理支付状态更新
  socketService.emitToUser(data.userId, 'payment_status', {
    orderId: data.orderId,
    status: data.status,
    amount: data.amount,
    timestamp: data.timestamp
  });
}

async function handleEmailStatus(data, services) {
  const { socketService } = services;
  
  // 处理邮件发送状态
  socketService.emitToUser(data.userId, 'email_status', {
    emailId: data.emailId,
    status: data.status,
    timestamp: data.timestamp
  });
}

async function handleSMSStatus(data, services) {
  const { socketService } = services;
  
  // 处理短信发送状态
  socketService.emitToUser(data.userId, 'sms_status', {
    smsId: data.smsId,
    status: data.status,
    timestamp: data.timestamp
  });
}

module.exports = router;