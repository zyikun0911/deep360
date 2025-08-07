#!/bin/bash

echo "🚀 最小化启动 Deep360"
echo "====================="

cd /opt/messenger360

echo ""
echo "🛑 1. 停止所有服务..."
pm2 stop all
pm2 delete all

echo ""
echo "📦 2. 安装基础依赖..."
npm install express mongoose cors helmet morgan winston

echo ""
echo "🔧 3. 创建最小化server.js..."
cat > server-minimal.js << 'SERVER_EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 7788;

// 中间件
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('frontend/dist'));

// 基础路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Deep360 服务正常运行' });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/frontend/dist/index.html');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/frontend/dist/index.html');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`�� Deep360 服务启动成功`);
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log(`📊 管理后台: http://localhost:${PORT}/dashboard`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在优雅关闭服务器...');
  process.exit(0);
});
SERVER_EOF

echo ""
echo "�� 4. 启动最小化服务..."
pm2 start server-minimal.js --name deep360-backend

echo ""
echo "⏳ 5. 等待服务启动..."
sleep 5

echo ""
echo "🔍 6. 检查服务状态..."
pm2 status

echo ""
echo "📋 7. 检查服务日志..."
pm2 logs deep360-backend --lines 3

echo ""
echo "🌐 8. 测试API接口..."
curl -s http://localhost:7788/health

echo ""
echo "�� 9. 测试前端访问..."
curl -s -I http://localhost:7788/ | head -3

echo ""
echo "✅ 最小化启动完成！"
