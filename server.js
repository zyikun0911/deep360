const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');
const redis = require('redis');
const winston = require('winston');

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

// 导入服务
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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3001",
    methods: ["GET", "POST"]
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
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3001",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deep360', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => logger.info('MongoDB 连接成功'))
.catch(err => logger.error('MongoDB 连接失败:', err));

// Redis 连接
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis 连接错误:', err));
redisClient.on('connect', () => logger.info('Redis 连接成功'));

// 初始化服务
const socketService = new SocketService(io);
const accountManager = new AccountManager(redisClient, logger);
const taskScheduler = new TaskScheduler(redisClient, logger);
const whatsappService = new WhatsAppService(accountManager, socketService, logger);
const telegramService = new TelegramService(accountManager, socketService, logger);
const pluginManager = new PluginManager(logger);
const marketplaceService = new MarketplaceService(logger);
const accountIsolationService = new AccountIsolationService();
const proxyManager = new ProxyManager();
const containerManager = new ContainerManager();
const batchRegistrationService = new BatchRegistrationService();
const multiLoginService = new MultiLoginService();
const groupManagementService = new GroupManagementService();
const massMessagingService = new MassMessagingService();

// 将服务添加到 app 实例，供路由使用
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
  groupManagementService,
  massMessagingService,
  logger,
  redisClient
};

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

// 静态文件服务（生产环境）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  logger.info(`客户端连接: ${socket.id}`);
  
  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`用户 ${userId} 加入房间`);
  });

  socket.on('disconnect', () => {
    logger.info(`客户端断开连接: ${socket.id}`);
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    logger.info('🚀 正在启动 Deep360 系统...');
    
    // 连接数据库
    logger.info('📦 连接数据库...');
    await connectDB();
    
    // 连接Redis
    logger.info('🔴 连接Redis...');
    await redisClient.connect();
    
    // 初始化服务
    logger.info('⚙️ 初始化服务...');
    try {
      await socketService.initialize?.();
      await accountManager.initialize?.();
      await taskScheduler.initialize?.();
      await whatsappService.initialize?.();
      await telegramService.initialize?.();
      await pluginManager.initialize?.();
      await marketplaceService.initialize?.();
      await accountIsolationService.initialize?.();
      await batchRegistrationService.initialize?.();
      await multiLoginService.initialize?.();
      await groupManagementService.initialize?.();
      await massMessagingService.initialize?.();
      
      logger.info('✅ 所有服务初始化完成');
    } catch (serviceError) {
      logger.warn('⚠️ 部分服务初始化失败，但系统可以继续运行:', serviceError.message);
    }
    
    // 启动任务调度器
    logger.info('⏰ 启动任务调度器...');
    await taskScheduler.start();
    
    server.listen(PORT, () => {
      logger.info(`🚀 Deep360 SaaS 平台启动成功`);
      logger.info(`📱 WhatsApp/Telegram 群控系统运行在端口 ${PORT}`);
      logger.info(`🌐 访问地址: http://localhost:${PORT}`);
      logger.info(`📊 管理后台: http://localhost:${PORT}/dashboard`);
      logger.info(`🔧 API文档: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到 SIGTERM 信号，正在优雅关闭服务器...');
  
  server.close(() => {
    logger.info('HTTP 服务器已关闭');
  });
  
  await redisClient.quit();
  await mongoose.connection.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到 SIGINT 信号，正在优雅关闭服务器...');
  
  server.close(() => {
    logger.info('HTTP 服务器已关闭');
  });
  
  await redisClient.quit();
  await mongoose.connection.close();
  
  process.exit(0);
});

startServer();