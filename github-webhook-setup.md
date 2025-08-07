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
