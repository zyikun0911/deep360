const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 7788;

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('frontend/build'));

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Deep360 服务正常运行',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API文档路由
app.get('/api-docs', (req, res) => {
  res.json({
    title: 'Deep360 API 文档',
    version: '1.0.0',
    endpoints: {
      'GET /health': '健康检查',
      'GET /': '前端页面',
      'GET /dashboard': '管理后台'
    }
  });
});

// 前端路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '页面未找到' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`�� Deep360 服务启动成功`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log(`📊 管理后台: http://localhost:${PORT}/dashboard`);
  console.log(`🔧 API文档: http://localhost:${PORT}/api-docs`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在优雅关闭服务器...');
  process.exit(0);
});
