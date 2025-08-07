# Deep360 Social SaaS Platform

## 🚀 项目介绍

Deep360 是一个功能强大的 WhatsApp/Telegram 多账号群控 SaaS 平台，专为营销团队和企业打造。

### 🎯 核心功能

- **多账号隔离环境** - 基于 Docker 的完全隔离账号管理
- **智能扫码登录** - 支持 WhatsApp 六段码和 Telegram Bot 接入
- **自动化任务调度** - 群发、建群、拉群、踢人等自动化操作
- **实时状态监控** - WebSocket 实时推送账号和任务状态
- **数据统计分析** - 详细的图表统计和任务监控
- **AI 内容中台** - 智能翻译、内容生成和自动回复
- **企业级安全** - JWT 认证、权限控制和数据加密

## 🏗️ 技术架构

### 后端技术栈
- **Node.js + Express** - 高性能 API 服务
- **MongoDB** - 文档数据库存储
- **Redis** - 缓存和任务队列
- **Docker** - 容器化部署
- **Socket.io** - 实时通信
- **Bull** - 任务队列管理
- **Winston** - 日志系统

### 前端技术栈
- **React 18** - 现代化前端框架
- **TypeScript** - 类型安全开发
- **Ant Design** - 企业级UI组件库
- **Vite** - 快速构建工具
- **React Query** - 数据获取和缓存
- **ECharts** - 数据可视化

### 第三方集成
- **WhatsApp Web.js** - WhatsApp API 集成
- **Telegraf** - Telegram Bot 框架
- **OpenAI** - AI 内容生成
- **Google Translate** - 多语言翻译

## 🚀 快速开始

### 环境要求
- Node.js 18+
- MongoDB 6.0+
- Redis 7+
- Docker & Docker Compose

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-repo/deep360.git
cd deep360
```

2. **安装依赖**
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend
npm install
cd ..
```

3. **环境配置**
```bash
# 复制环境配置文件
cp .env.example .env

# 编辑配置文件
nano .env
```

4. **启动服务**
```bash
# 使用 Docker Compose 启动所有服务
docker-compose up -d

# 或者单独启动开发环境
npm run dev
```

5. **访问应用**
- 前端界面: http://localhost:3001
- 后端API: http://localhost:3000
- API文档: http://localhost:3000/docs

## 📋 环境变量配置

```env
# 应用配置
NODE_ENV=development
PORT=3000

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/deep360
REDIS_URL=redis://localhost:6379

# JWT 配置
JWT_SECRET=your-super-secret-key

# OpenAI 配置
OPENAI_API_KEY=your-openai-api-key

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
```

## 🐳 Docker 部署

### 生产环境部署
```bash
# 构建生产镜像
docker-compose -f docker-compose.prod.yml build

# 启动生产环境
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose ps
```

### 扩容 WhatsApp 实例
```bash
# 动态创建 WhatsApp 实例
docker-compose up -d --scale whatsapp-instance=5
```

## 📱 功能使用指南

### 1. 账号管理
- 添加 WhatsApp 账号（手机号）
- 添加 Telegram Bot（Token）
- 扫码登录和状态监控
- 账号配置和自动化设置

### 2. 任务创建
- 群发消息任务
- 自动建群任务
- 批量邀请任务
- 定时任务调度

### 3. 数据分析
- 实时消息统计
- 账号健康监控
- 任务执行报告
- 系统性能监控

### 4. AI 功能
- 智能内容生成
- 多语言翻译
- 自动回复设置
- 情感分析

## 🔧 API 文档

### 认证接口
```javascript
// 用户登录
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

// 用户注册
POST /api/auth/register
{
  "username": "用户名",
  "email": "user@example.com", 
  "password": "password"
}
```

### 账号管理
```javascript
// 获取账号列表
GET /api/accounts

// 创建账号
POST /api/accounts
{
  "name": "测试账号",
  "type": "whatsapp",
  "phoneNumber": "+86138****8888"
}

// 启动账号
POST /api/accounts/:accountId/start
```

### 任务管理
```javascript
// 创建群发任务
POST /api/tasks
{
  "name": "群发任务",
  "type": "bulk_message",
  "config": {
    "accounts": ["account_id"],
    "targets": ["target1", "target2"],
    "content": {
      "text": "消息内容"
    }
  }
}
```

## 🔒 安全特性

- **JWT 认证** - 安全的用户身份验证
- **权限控制** - 基于角色的访问控制
- **数据加密** - 敏感数据加密存储
- **API 限流** - 防止恶意请求
- **审计日志** - 完整的操作记录
- **容器隔离** - Docker 安全隔离

## 📊 监控告警

### 系统监控
- CPU/内存使用率
- 网络连接状态
- 数据库性能
- 队列处理状态

### 业务监控
- 账号连接状态
- 消息发送成功率
- 任务执行状态
- 用户活跃度

## 🛠️ 开发指南

### 项目结构
```
deep360/
├── server.js          # 主服务入口
├── models/           # 数据模型
├── routes/           # API路由
├── services/         # 业务服务
├── middleware/       # 中间件
├── utils/            # 工具函数
├── config/           # 配置文件
├── frontend/         # 前端应用
└── docker-compose.yml # Docker配置
```

### 开发规范
- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 编写单元测试
- Git 提交规范

### 调试指南
```bash
# 查看服务日志
docker-compose logs -f app

# 进入容器调试
docker-compose exec app bash

# 查看 Redis 队列状态
docker-compose exec redis redis-cli monitor
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 💬 技术支持

- 📧 邮箱: support@deep360.com
- 💬 微信群: 扫码加入技术交流群
- 📚 文档: https://docs.deep360.com
- 🐛 问题反馈: https://github.com/deep360/issues

## 🚀 路线图

### v1.1 (计划中)
- [ ] 更多社交平台支持 (微信、钉钉)
- [ ] 增强 AI 对话能力
- [ ] 可视化流程编辑器
- [ ] 更丰富的数据分析

### v1.2 (规划中)
- [ ] 多租户 SaaS 架构
- [ ] 移动端 APP
- [ ] 第三方集成 API
- [ ] 高级自动化工作流

---

## 🌟 致谢

感谢所有为这个项目做出贡献的开发者们！

**让营销更智能，让沟通更高效！** 🚀