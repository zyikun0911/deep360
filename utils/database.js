/**
 * 数据库工具和优化
 */

const mongoose = require('mongoose');
const { createModuleLogger } = require('./logger');

const logger = createModuleLogger('Database');

/**
 * 数据库连接配置
 */
const connectDB = async (uri, options = {}) => {
  try {
    const defaultOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // 连接池最大连接数
      serverSelectionTimeoutMS: 5000, // 服务器选择超时
      socketTimeoutMS: 45000, // Socket 超时
      family: 4, // 使用 IPv4
      bufferCommands: false // 禁用 Mongoose 缓冲
    };

    const connection = await mongoose.connect(uri, { ...defaultOptions, ...options });
    
    logger.info('数据库连接成功', {
      host: connection.connection.host,
      port: connection.connection.port,
      database: connection.connection.name
    });

    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      logger.error('数据库连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('数据库连接已断开');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('数据库重新连接成功');
    });

    return connection;
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
};

/**
 * 创建复合索引
 */
const createIndexes = async () => {
  try {
    logger.info('开始创建数据库索引...');

    // User 模型索引
    await mongoose.model('User').collection.createIndexes([
      { key: { email: 1 }, unique: true, background: true },
      { key: { username: 1 }, unique: true, background: true },
      { key: { role: 1 }, background: true },
      { key: { status: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { lastLogin: -1 }, background: true }
    ]);

    // Account 模型索引
    await mongoose.model('Account').collection.createIndexes([
      { key: { userId: 1, platform: 1 }, background: true },
      { key: { phoneNumber: 1 }, unique: true, background: true },
      { key: { status: 1 }, background: true },
      { key: { platform: 1, status: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { lastActivity: -1 }, background: true }
    ]);

    // Task 模型索引
    await mongoose.model('Task').collection.createIndexes([
      { key: { userId: 1, status: 1 }, background: true },
      { key: { type: 1, platform: 1 }, background: true },
      { key: { scheduledAt: 1 }, background: true },
      { key: { status: 1, createdAt: -1 }, background: true },
      { key: { priority: -1, createdAt: 1 }, background: true }
    ]);

    // Plugin 模型索引
    await mongoose.model('Plugin').collection.createIndexes([
      { key: { id: 1 }, unique: true, background: true },
      { key: { category: 1, type: 1 }, background: true },
      { key: { 'status.state': 1 }, background: true },
      { key: { 'marketplace.featured': 1 }, background: true },
      { key: { 'marketplace.rating.average': -1 }, background: true },
      { key: { 'marketplace.downloads': -1 }, background: true },
      { key: { 'installation.installDate': -1 }, background: true }
    ]);

    logger.info('数据库索引创建完成');
  } catch (error) {
    logger.error('创建数据库索引失败:', error);
    throw error;
  }
};

/**
 * 数据库性能监控
 */
const setupPerformanceMonitoring = () => {
  // 监控慢查询
  mongoose.set('debug', (collectionName, method, query, doc) => {
    const startTime = Date.now();
    
    // 记录执行时间超过 100ms 的查询
    process.nextTick(() => {
      const duration = Date.now() - startTime;
      if (duration > 100) {
        logger.warn('慢查询检测', {
          collection: collectionName,
          method,
          query: JSON.stringify(query),
          duration: `${duration}ms`
        });
      }
    });
  });

  // 连接池监控
  setInterval(() => {
    const db = mongoose.connection.db;
    if (db) {
      const stats = {
        readyState: mongoose.connection.readyState,
        poolSize: mongoose.connection.db.serverConfig?.poolSize || 0,
        connections: mongoose.connection.db.serverConfig?.connections?.length || 0
      };
      
      logger.debug('数据库连接池状态', stats);
    }
  }, 60000); // 每分钟检查一次
};

/**
 * 数据库备份工具
 */
const createBackup = async (backupPath) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backup = {};

    for (const collection of collections) {
      const collectionName = collection.name;
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      backup[collectionName] = data;
    }

    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(path.dirname(backupPath))) {
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    }

    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    logger.info('数据库备份完成', { path: backupPath });
    return backup;
  } catch (error) {
    logger.error('数据库备份失败:', error);
    throw error;
  }
};

/**
 * 数据库恢复工具
 */
const restoreBackup = async (backupPath) => {
  try {
    const fs = require('fs');
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    for (const [collectionName, data] of Object.entries(backup)) {
      if (data.length > 0) {
        await mongoose.connection.db.collection(collectionName).deleteMany({});
        await mongoose.connection.db.collection(collectionName).insertMany(data);
        logger.info(`恢复集合: ${collectionName}, 文档数: ${data.length}`);
      }
    }

    logger.info('数据库恢复完成', { path: backupPath });
  } catch (error) {
    logger.error('数据库恢复失败:', error);
    throw error;
  }
};

/**
 * 数据库清理工具
 */
const cleanupDatabase = async (options = {}) => {
  try {
    const {
      removeOldLogs = true,
      logRetentionDays = 30,
      removeInactiveAccounts = false,
      inactiveAccountDays = 90
    } = options;

    let cleanedItems = 0;

    // 清理旧日志
    if (removeOldLogs) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - logRetentionDays);

      // 这里应该根据实际的日志模型来清理
      // const result = await LogModel.deleteMany({ createdAt: { $lt: cutoffDate } });
      // cleanedItems += result.deletedCount;
    }

    // 清理不活跃账号
    if (removeInactiveAccounts) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveAccountDays);

      const result = await mongoose.model('Account').deleteMany({
        lastActivity: { $lt: cutoffDate },
        status: 'inactive'
      });
      cleanedItems += result.deletedCount;
    }

    logger.info('数据库清理完成', { cleanedItems });
    return cleanedItems;
  } catch (error) {
    logger.error('数据库清理失败:', error);
    throw error;
  }
};

/**
 * 查询优化器
 */
const QueryOptimizer = {
  // 分页查询优化
  paginateQuery: (model, query = {}, options = {}) => {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      populate = [],
      select = ''
    } = options;

    const skip = (page - 1) * limit;

    let queryBuilder = model.find(query);

    if (select) {
      queryBuilder = queryBuilder.select(select);
    }

    if (populate.length > 0) {
      populate.forEach(pop => {
        queryBuilder = queryBuilder.populate(pop);
      });
    }

    return queryBuilder
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // 使用 lean() 提高性能
  },

  // 聚合查询优化
  aggregateQuery: (model, pipeline, options = {}) => {
    const { allowDiskUse = true, maxTimeMS = 30000 } = options;

    return model.aggregate(pipeline, {
      allowDiskUse,
      maxTimeMS
    });
  },

  // 批量操作优化
  bulkWrite: async (model, operations, options = {}) => {
    const { ordered = false, batchSize = 1000 } = options;

    const batches = [];
    for (let i = 0; i < operations.length; i += batchSize) {
      batches.push(operations.slice(i, i + batchSize));
    }

    const results = [];
    for (const batch of batches) {
      const result = await model.bulkWrite(batch, { ordered });
      results.push(result);
    }

    return results;
  }
};

/**
 * 缓存层
 */
const CacheLayer = {
  // Redis 缓存包装器
  cached: (redisClient, ttl = 3600) => {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = async function(...args) {
        const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
        
        try {
          // 尝试从缓存获取
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            logger.debug('缓存命中', { key: cacheKey });
            return JSON.parse(cached);
          }
        } catch (error) {
          logger.warn('缓存读取失败', { key: cacheKey, error: error.message });
        }

        // 执行原方法
        const result = await originalMethod.apply(this, args);

        try {
          // 存储到缓存
          await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
          logger.debug('数据已缓存', { key: cacheKey, ttl });
        } catch (error) {
          logger.warn('缓存写入失败', { key: cacheKey, error: error.message });
        }

        return result;
      };

      return descriptor;
    };
  },

  // 清除相关缓存
  clearCache: async (redisClient, pattern) => {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info('缓存已清除', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('清除缓存失败', { pattern, error: error.message });
    }
  }
};

/**
 * 数据库健康检查
 */
const healthCheck = async () => {
  try {
    const startTime = Date.now();
    
    // 检查连接状态
    if (mongoose.connection.readyState !== 1) {
      throw new Error('数据库未连接');
    }

    // 执行简单查询测试
    await mongoose.connection.db.admin().ping();
    
    const responseTime = Date.now() - startTime;
    
    // 获取数据库统计信息
    const stats = await mongoose.connection.db.stats();
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      connections: mongoose.connection.readyState,
      database: {
        collections: stats.collections,
        dataSize: Math.round(stats.dataSize / 1024 / 1024) + 'MB',
        indexSize: Math.round(stats.indexSize / 1024 / 1024) + 'MB'
      }
    };
  } catch (error) {
    logger.error('数据库健康检查失败:', error);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  connectDB,
  createIndexes,
  setupPerformanceMonitoring,
  createBackup,
  restoreBackup,
  cleanupDatabase,
  QueryOptimizer,
  CacheLayer,
  healthCheck
};