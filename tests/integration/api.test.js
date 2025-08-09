/**
 * API 集成测试
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../models/User');
const Account = require('../../models/Account');
const Task = require('../../models/Task');

const maybeDescribe = (global.__SKIP_INTEGRATION__) ? describe.skip : describe;

maybeDescribe('API Integration Tests', () => {
  let authToken;
  let testUser;
  let testAccount;

  beforeAll(async () => {
    // 创建测试用户
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
    await testUser.save();

    // 获取认证令牌
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('认证接口', () => {
    test('POST /api/auth/register - 用户注册', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
          confirmPassword: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('username', 'newuser');
    });

    test('POST /api/auth/login - 用户登录', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', 'test@example.com');
    });

    test('POST /api/auth/login - 错误密码', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('GET /api/auth/profile - 获取用户资料', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('username', 'testuser');
    });
  });

  describe('账号管理接口', () => {
    test('POST /api/accounts - 创建账号', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'whatsapp',
          phoneNumber: '+1234567890',
          name: 'Test Account'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('phoneNumber', '+1234567890');
      
      testAccount = response.body.data;
    });

    test('GET /api/accounts - 获取账号列表', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('GET /api/accounts/:id - 获取单个账号', async () => {
      const response = await request(app)
        .get(`/api/accounts/${testAccount._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testAccount._id);
    });

    test('PUT /api/accounts/:id - 更新账号', async () => {
      const response = await request(app)
        .put(`/api/accounts/${testAccount._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test Account'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Test Account');
    });
  });

  describe('任务管理接口', () => {
    let testTask;

    test('POST /api/tasks - 创建任务', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'message',
          platform: 'whatsapp',
          accountId: testAccount._id,
          targets: ['+1234567890'],
          content: 'Test message'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('type', 'message');
      
      testTask = response.body.data;
    });

    test('GET /api/tasks - 获取任务列表', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/tasks/:id - 获取单个任务', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTask._id);
    });

    test('POST /api/tasks/:id/execute - 执行任务', async () => {
      const response = await request(app)
        .post(`/api/tasks/${testTask._id}/execute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('插件管理接口', () => {
    test('GET /api/plugins - 获取插件列表', async () => {
      const response = await request(app)
        .get('/api/plugins')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('plugins');
      expect(Array.isArray(response.body.data.plugins)).toBe(true);
    });

    test('GET /api/plugins/marketplace/featured - 获取推荐插件', async () => {
      const response = await request(app)
        .get('/api/plugins/marketplace/featured')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/plugins/stats/overview - 获取插件统计', async () => {
      const response = await request(app)
        .get('/api/plugins/stats/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('AI 接口', () => {
    test('POST /api/ai/generate - AI 内容生成', async () => {
      const response = await request(app)
        .post('/api/ai/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Write a greeting message',
          type: 'text',
          language: 'en'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('content');
    });

    test('POST /api/ai/translate - AI 翻译', async () => {
      const response = await request(app)
        .post('/api/ai/translate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'zh'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('translatedText');
    });
  });

  describe('统计接口', () => {
    test('GET /api/stats/overview - 获取概览统计', async () => {
      const response = await request(app)
        .get('/api/stats/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accounts');
      expect(response.body.data).toHaveProperty('tasks');
      expect(response.body.data).toHaveProperty('messages');
    });

    test('GET /api/stats/accounts - 获取账号统计', async () => {
      const response = await request(app)
        .get('/api/stats/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('byPlatform');
      expect(response.body.data).toHaveProperty('byStatus');
    });
  });

  describe('蓝标认证接口', () => {
    test('GET /api/blue-check/requirements - 获取认证要求', async () => {
      const response = await request(app)
        .get('/api/blue-check/requirements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eligibility');
      expect(response.body.data).toHaveProperty('requiredDocuments');
    });

    test('POST /api/blue-check/single-create - 创建单个蓝标账号', async () => {
      const response = await request(app)
        .post('/api/blue-check/single-create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          businessInfo: {
            name: 'Test Business',
            email: 'business@test.com',
            website: 'https://test.com',
            description: 'Test business description'
          },
          requestBlueCheck: false // 测试时不实际申请
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('businessAccount');
    });
  });

  describe('错误处理', () => {
    test('未授权访问', async () => {
      const response = await request(app)
        .get('/api/accounts');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('无效的 JWT 令牌', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('不存在的资源', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/accounts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    });

    test('无效的请求数据', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'invalid-platform',
          phoneNumber: 'invalid-phone'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('性能测试', () => {
    test('大量数据分页查询', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/accounts?page=1&limit=100')
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
    });

    test('并发请求处理', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/stats/overview')
            .set('Authorization', `Bearer ${authToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});