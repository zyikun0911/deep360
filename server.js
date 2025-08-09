require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const redis = require('redis');
const winston = require('winston');

// 导入数据库连接函数
const { connectDB } = require('./utils/database');

// 导入路由和中间件
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const taskRoutes = require('./routes/tasks');
const statsRoutes = require('./routes/stats');
const aiRoutes = require('./routes/ai');
const webhookRoutes = require('./routes/webhooks');
const phoneNumberRoutes = require('./routes/phoneNumbers');
const autoRegistrationRoutes = require('./routes/autoRegistration');
const blueCheckRoutes = require('./routes/blueCheckRegistration');
const pluginRoutes = require('./routes/plugins');
const accountIsolationRoutes = require('./routes/accountIsolation');
const batchRegistrationRoutes = require('./routes/batchRegistration');
const groupManagementRoutes = require('./routes/groupManagement');
const massMessagingRoutes = require('./routes/massMessaging');
const optimalPanelRoutes = require('./routes/optimalPanel');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'deep360-saas' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 中间件设置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'ws:', 'wss:']
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3001',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// 移除启动前的自动数据库连接，统一在 startServer 中处理

// Redis 连接（设置较小的连接超时，避免阻塞启动）
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: { connectTimeout: 1000 }
});

redisClient.on('error', (err) => logger.error('Redis 连接错误:', err));
redisClient.on('connect', () => logger.info('Redis 连接成功'));

// 初始化服务占位，实际在 startServer 中按可用性创建
const SocketService = require('./services/socketService');
const AccountManager = require('./services/accountManager');
const TaskScheduler = require('./services/taskScheduler');
const WhatsAppService = require('./services/whatsappService');
const TelegramService = require('./services/telegramService');
const PluginManager = require('./services/pluginManager');
const MarketplaceService = require('./services/marketplaceService');
const AccountIsolationService = require('./services/accountIsolationService');
const ProxyManager = require('./services/proxyManager');
const ContainerManager = require('./services/containerManager');
const BatchRegistrationService = require('./services/batchRegistrationService');
const MultiLoginService = require('./services/multiLoginService');
const GroupManagementService = require('./services/groupManagementService');
const MassMessagingService = require('./services/massMessagingService');

app.locals.services = { logger, redisClient };

// 健康检查路由
app.get('/health', async (req, res) => {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      services: {
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        redis: (redisClient && redisClient.isOpen) ? 'connected' : 'disconnected',
        server: 'running'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 兼容的 /api/health
app.get('/api/health', (req, res) => {
  res.redirect(307, '/health');
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/phone-numbers', phoneNumberRoutes);
app.use('/api/auto-registration', autoRegistrationRoutes);
app.use('/api/blue-check', blueCheckRoutes);
app.use('/api/plugins', pluginRoutes);
app.use('/api/isolation', accountIsolationRoutes);
app.use('/api/registration', batchRegistrationRoutes);
app.use('/api/groups', groupManagementRoutes);
app.use('/api/mass-messaging', massMessagingRoutes);
app.use('/api/optimal-panel', optimalPanelRoutes);

// 静态文件服务（支持 frontend/build 或 frontend/dist）
const frontendBuildPath = path.join(__dirname, 'frontend/build');
const frontendDistPath = path.join(__dirname, 'frontend/dist');

if (require('fs').existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/') || req.path.startsWith('/static/')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else if (require('fs').existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/assets/') || req.path.startsWith('/static/')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // 未构建前端时的根路径响应
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Deep360 API 服务运行正常',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: { health: '/health', api: '/api/*', dashboard: '/dashboard' }
    });
  });
}

// 错误处理与 404
app.use((err, req, res, next) => {
  logger.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    logger.info('🚀 正在启动 Deep360 系统...');
    logger.info('📦 连接数据库...');
    try {
      await connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/deep360');
    } catch (dbErr) {
      logger.warn('连接外部 MongoDB 失败，尝试使用内存数据库运行');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mem = await MongoMemoryServer.create();
        const memUri = mem.getUri();
        await connectDB(memUri);
        logger.info('已切换到内存 MongoDB 运行');
      } catch (memErr) {
        logger.error('无法启动内存 MongoDB:', memErr);
        throw dbErr;
      }
    }

    logger.info('🔴 连接Redis...');
    let redisAvailable = true;
    try {
      // 等待 Redis 连接，若超时/失败则降级
      await redisClient.connect();
    } catch (rErr) {
      redisAvailable = false;
      logger.warn('Redis 不可用，系统将以降级模式启动（部分功能不可用）');
    }

    logger.info('⚙️ 初始化服务...');
    try {
      const socketService = new SocketService(io);
      const pluginManager = new PluginManager(logger);
      const marketplaceService = new MarketplaceService(logger);
      const accountIsolationService = new AccountIsolationService();
      const proxyManager = new ProxyManager();
      const containerManager = new ContainerManager();
      const batchRegistrationService = new BatchRegistrationService();
      const multiLoginService = new MultiLoginService();
      let accountManager = null;
      let taskScheduler = null;
      let whatsappService = null;
      let telegramService = null;

      if (redisAvailable) {
        accountManager = new AccountManager(redisClient, logger);
        taskScheduler = new TaskScheduler(redisClient, logger);
        whatsappService = new WhatsAppService(accountManager, socketService, logger);
        telegramService = new TelegramService(accountManager, socketService, logger);
      }

      app.locals.services = {
        socketService,
        accountManager,
        taskScheduler,
        whatsappService,
        telegramService,
        pluginManager,
        marketplaceService,
        accountIsolationService,
        proxyManager,
        containerManager,
        batchRegistrationService,
        multiLoginService,
        groupManagementService: redisAvailable ? new GroupManagementService() : null,
        massMessagingService: redisAvailable ? new MassMessagingService() : null,
        logger,
        redisClient: redisAvailable ? redisClient : null
      };

      await socketService.initialize?.();
      await accountManager?.initialize?.();
      await taskScheduler?.initialize?.();
      await whatsappService?.initialize?.();
      await telegramService?.initialize?.();
      await pluginManager.initialize?.();
      await marketplaceService.initialize?.();
      await accountIsolationService.initialize?.();
      await batchRegistrationService.initialize?.();
      await multiLoginService.initialize?.();
      await app.locals.services.groupManagementService?.initialize?.();
      await app.locals.services.massMessagingService?.initialize?.();
      logger.info('✅ 所有服务初始化完成');
    } catch (serviceError) {
      logger.warn('⚠️ 部分服务初始化失败，但系统可以继续运行:', serviceError.message);
    }

    logger.info('⏰ 启动任务调度器...');
    await app.locals.services.taskScheduler?.start?.();

    server.listen(PORT, () => {
      logger.info(`🚀 Deep360 SaaS 平台启动成功`);
      logger.info(`📱 群控系统运行在端口 ${PORT}`);
      logger.info(`🌐 访问地址: http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，正在优雅关闭服务器...');
  server.close(() => logger.info('HTTP 服务器已关闭'));
  try { await redisClient.quit(); } catch {}
  try { await mongoose.connection.close(); } catch {}
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，正在优雅关闭服务器...');
  server.close(() => logger.info('HTTP 服务器已关闭'));
  try { await redisClient.quit(); } catch {}
  try { await mongoose.connection.close(); } catch {}
  process.exit(0);
});

// 仅在直接运行时启动服务器（测试时仅导出 app）
if (require.main === module && process.env.SKIP_SERVER_START !== '1') {
  startServer();
}

module.exports = app;