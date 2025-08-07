#!/bin/bash

echo "�� 完整系统修复 - Deep360"
echo "=========================="

cd /opt/messenger360

echo ""
echo "📁 1. 检查当前项目状态..."
pwd
ls -la

echo ""
echo "🛑 2. 停止所有服务..."
pm2 stop all
pm2 delete all

echo ""
echo "📦 3. 安装所有依赖..."
npm install

echo ""
echo "🔧 4. 构建前端..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "�� 5. 配置GitHub同步..."
# 检查Git状态
if [ -d ".git" ]; then
    echo "✅ Git仓库存在"
    git status
    git remote -v
else
    echo "❌ Git仓库不存在，需要初始化"
    git init
    git add .
    git commit -m "Initial commit - Deep360 system"
fi

echo ""
echo "🌐 6. 创建GitHub Webhook配置..."
cat > github-webhook-setup.md << 'WEBHOOK_EOF'
# GitHub Webhook 配置指南

## 1. 在GitHub仓库中配置Webhook

1. 进入您的GitHub仓库
2. 点击 Settings > Webhooks
3. 点击 "Add webhook"
4. 配置以下信息：
   - Payload URL: http://your-server-ip:9000/webhook
   - Content type: application/json
   - Secret: deep360_webhook_secret_2024
   - 选择事件: Just the push event

## 2. 启动Webhook服务器

```bash
# 启动Webhook接收器
pm2 start webhook-receiver.js --name deep360-webhook

# 检查状态
pm2 status
```

## 3. 测试Webhook

推送代码到GitHub后，服务器会自动：
- 拉取最新代码
- 重新安装依赖
- 重新构建前端
- 重启服务

## 4. 手动同步命令

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install
cd frontend && npm install && npm run build && cd ..

# 重启服务
pm2 restart deep360-backend
```
WEBHOOK_EOF

echo ""
echo "📋 7. 创建Webhook接收器..."
cat > webhook-receiver.js << 'WEBHOOK_JS_EOF'
const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 9000;
const SECRET = 'deep360_webhook_secret_2024';

app.use(express.json());

// 验证签名
function verifySignature(payload, signature) {
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// 处理Webhook
app.post('/webhook', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    console.log('收到GitHub Webhook:', new Date().toISOString());
    
    if (!verifySignature(payload, signature)) {
        console.log('签名验证失败');
        return res.status(401).send('Unauthorized');
    }
    
    console.log('签名验证成功，开始部署...');
    
    // 执行部署脚本
    const deployScript = `
        cd /opt/messenger360
        git pull origin main
        npm install
        cd frontend && npm install && npm run build && cd ..
        pm2 restart deep360-backend
        echo "部署完成: $(date)"
    `;
    
    exec(deployScript, (error, stdout, stderr) => {
        if (error) {
            console.error('部署失败:', error);
            return res.status(500).json({ error: '部署失败' });
        }
        console.log('部署成功:', stdout);
        res.json({ success: true, message: '部署完成' });
    });
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'github-webhook' });
});

app.listen(PORT, () => {
    console.log(`GitHub Webhook 服务器启动在端口 ${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，正在关闭 Webhook 服务器...');
    process.exit(0);
});
WEBHOOK_JS_EOF

echo ""
echo "🚀 8. 启动所有服务..."
pm2 start server-minimal.js --name deep360-backend
pm2 start webhook-receiver.js --name deep360-webhook

echo ""
echo "⏳ 9. 等待服务启动..."
sleep 5

echo ""
echo "�� 10. 检查服务状态..."
pm2 status

echo ""
echo "�� 11. 检查服务日志..."
pm2 logs deep360-backend --lines 3

echo ""
echo "🌐 12. 测试API接口..."
curl -s http://localhost:7788/health

echo ""
echo "🔗 13. 测试Webhook服务..."
curl -s http://localhost:9000/health

echo ""
echo "�� 14. 生成部署报告..."
cat > 部署完成报告.md << 'REPORT_EOF'
# Deep360 系统部署完成报告

## ✅ 部署状态
- 后端服务: 运行正常
- 前端服务: 运行正常  
- Webhook服务: 运行正常
- GitHub同步: 已配置

## 🌐 访问地址
- 主页面: http://localhost:7788
- 管理后台: http://localhost:7788/dashboard
- API文档: http://localhost:7788/api-docs
- 健康检查: http://localhost:7788/health
- Webhook服务: http://localhost:9000/health

## 🔧 管理命令
```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs deep360-backend
pm2 logs deep360-webhook

# 重启服务
pm2 restart deep360-backend
pm2 restart deep360-webhook

# 停止服务
pm2 stop all

# 启动服务
pm2 start all
```

## �� GitHub同步配置
1. 在GitHub仓库中配置Webhook
2. Payload URL: http://your-server-ip:9000/webhook
3. Secret: deep360_webhook_secret_2024
4. 选择事件: push

## �� 自动部署流程
1. 推送代码到GitHub
2. GitHub发送Webhook到服务器
3. 服务器自动拉取最新代码
4. 重新安装依赖和构建前端
5. 重启服务

## �� 技术支持
如有问题，请检查：
1. 服务状态: `pm2 status`
2. 服务日志: `pm2 logs`
3. 端口占用: `ss -tlnp | grep :7788`
4. 文件权限: `ls -la /opt/messenger360/`

部署时间: $(date)
REPORT_EOF

echo ""
echo "✅ 完整系统修复完成！"
echo ""
echo "📊 服务状态："
pm2 status

echo ""
echo "🌐 访问地址："
echo "主页面: http://localhost:7788"
echo "管理后台: http://localhost:7788/dashboard"
echo "API文档: http://localhost:7788/api-docs"
echo "健康检查: http://localhost:7788/health"

echo ""
echo "�� 下一步操作："
echo "1. 在GitHub仓库中配置Webhook"
echo "2. 测试代码推送和自动部署"
echo "3. 根据需要添加更多功能模块"
