/**
 * Jest 测试环境设置
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const redis = require('redis');

// 全局测试变量
global.testDb = null;
global.testRedis = null;

// 设置测试超时
jest.setTimeout(30000);

/**
 * 全局测试环境初始化
 */
beforeAll(async () => {
  try {
    // 启动内存 MongoDB
    global.testDb = await MongoMemoryServer.create();
    const mongoUri = global.testDb.getUri();
    
    // 连接测试数据库
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // 启动测试 Redis（模拟）
    global.testRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      flushall: jest.fn()
    };

    console.log('测试环境初始化完成');
  } catch (error) {
    console.error('测试环境初始化失败:', error);
    process.exit(1);
  }
});

/**
 * 全局测试环境清理
 */
afterAll(async () => {
  try {
    // 关闭数据库连接
    await mongoose.disconnect();
    
    // 停止内存数据库
    if (global.testDb) {
      await global.testDb.stop();
    }

    console.log('测试环境清理完成');
  } catch (error) {
    console.error('测试环境清理失败:', error);
  }
});

/**
 * 每个测试前的清理
 */
beforeEach(async () => {
  // 清理数据库
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }

  // 清理 Redis 模拟
  if (global.testRedis) {
    global.testRedis.get.mockClear();
    global.testRedis.set.mockClear();
    global.testRedis.del.mockClear();
    global.testRedis.exists.mockClear();
    global.testRedis.expire.mockClear();
    global.testRedis.flushall.mockClear();
  }
});

/**
 * 测试工具函数
 */
global.testUtils = {
  // 创建测试用户
  createTestUser: (overrides = {}) => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'user',
    ...overrides
  }),

  // 创建测试账号
  createTestAccount: (overrides = {}) => ({
    platform: 'whatsapp',
    phoneNumber: '+1234567890',
    name: 'Test Account',
    status: 'active',
    ...overrides
  }),

  // 创建测试任务
  createTestTask: (overrides = {}) => ({
    type: 'message',
    platform: 'whatsapp',
    targets: ['+1234567890'],
    content: 'Test message',
    status: 'pending',
    ...overrides
  }),

  // 等待异步操作
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // 模拟Express请求对象
  mockRequest: (data = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { userId: 'test-user-id', role: 'user' },
    ...data
  }),

  // 模拟Express响应对象
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  },

  // 模拟Express next函数
  mockNext: () => jest.fn()
};

/**
 * 自定义匹配器
 */
expect.extend({
  // 检查对象是否包含特定属性
  toHaveProperty(received, property) {
    const pass = received && Object.prototype.hasOwnProperty.call(received, property);
    return {
      message: () => `expected ${received} to have property ${property}`,
      pass
    };
  },

  // 检查是否为有效的MongoDB ObjectId
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    return {
      message: () => `expected ${received} to be a valid MongoDB ObjectId`,
      pass
    };
  },

  // 检查是否为有效的日期
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received);
    return {
      message: () => `expected ${received} to be a valid Date`,
      pass
    };
  }
});

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/deep360-test';
process.env.REDIS_URL = 'redis://localhost:6379';

// 抑制不必要的控制台输出
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // 保留错误日志用于调试
};