# 🚀 Deep360 GitHub 自动同步部署指南

## 📋 概述

本指南将帮助您设置 GitHub 与服务器的自动同步，当您推送代码到 GitHub 时，服务器会自动拉取并部署最新代码。

## 🎯 配置信息

- **服务器 IP**: 74.208.61.148
- **GitHub 仓库**: https://github.com/zyikun0911/deep360
- **Webhook URL**: http://74.208.61.148/webhook
- **Webhook 密钥**: deep360-secret-1234

## 📦 部署步骤

### 1. 上传配置文件到服务器

```bash
# 上传 Webhook 配置文件
scp webhook-receiver.sh root@74.208.61.148:/opt/messenger360/
scp webhook-server.js root@74.208.61.148:/opt/messenger360/
scp nginx-deep360.conf root@74.208.61.148:/etc/nginx/sites-available/deep360

# 登录服务器
ssh root@74.208.61.148
```

### 2. 在服务器上配置 Webhook

```bash
# 进入项目目录
cd /opt/messenger360

# 设置 Webhook 脚本权限
chmod +x webhook-receiver.sh

# 创建日志目录
mkdir -p /var/log
touch /var/log/deep360-webhook.log
chmod 666 /var/log/deep360-webhook.log

# 配置 Nginx
ln -sf /etc/nginx/sites-available/deep360 /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 启动 Webhook 服务器
pm2 start webhook-server.js --name deep360-webhook
pm2 save

# 检查服务状态
pm2 list
```

### 3. 在 GitHub 仓库设置 Webhook

1. **访问 GitHub 仓库设置**:
   - 打开 https://github.com/zyikun0911/deep360
   - 点击 "Settings" 标签
   - 点击左侧菜单 "Webhooks"
   - 点击 "Add webhook"

2. **配置 Webhook**:
   - **Payload URL**: `http://74.208.61.148/webhook`
   - **Content type**: `application/json`
   - **Secret**: `deep360-secret-1234`
   - **Events**: 选择 "Just the push event"
   - 点击 "Add webhook"

### 4. 测试自动同步

```bash
# 在本地推送代码
git add .
git commit -m "测试自动部署"
git push origin main

# 在服务器查看日志
tail -f /var/log/deep360-webhook.log
```

## 🔧 配置文件说明

### webhook-receiver.sh
- **功能**: 处理 GitHub Webhook 请求
- **验证**: 验证签名确保安全性
- **部署**: 自动拉取代码并重启服务

### webhook-server.js
- **功能**: Webhook 服务器
- **端口**: 8080
- **安全**: 签名验证和日志记录

### nginx-deep360.conf
- **功能**: Nginx 配置
- **代理**: 将 /webhook 请求转发到 Webhook 服务器
- **前端**: 静态文件服务
- **API**: 后端 API 代理

## 📊 监控和日志

### 查看 Webhook 日志
```bash
# 实时查看日志
tail -f /var/log/deep360-webhook.log

# 查看最近的日志
tail -20 /var/log/deep360-webhook.log
```

### 检查服务状态
```bash
# 查看 PM2 进程
pm2 list

# 查看 Webhook 服务器日志
pm2 logs deep360-webhook

# 查看 API 服务器日志
pm2 logs deep360-api
```

### 健康检查
```bash
# 检查 API 健康状态
curl http://localhost:7788/health

# 检查 Webhook 端点
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{"test": "ping"}'
```

## 🛡️ 安全配置

### Webhook 安全
- ✅ **签名验证**: 使用 HMAC-SHA256 验证签名
- ✅ **密钥保护**: Webhook 密钥保密
- ✅ **事件过滤**: 只处理 push 事件
- ✅ **日志记录**: 完整的操作日志

### 服务器安全
- ✅ **防火墙**: 只开放必要端口
- ✅ **权限控制**: 最小权限原则
- ✅ **备份机制**: 自动备份当前代码
- ✅ **错误处理**: 优雅的错误处理

## 🔄 工作流程

### 自动部署流程
1. **代码推送**: 开发者推送代码到 GitHub
2. **Webhook 触发**: GitHub 发送 Webhook 到服务器
3. **签名验证**: 服务器验证 Webhook 签名
4. **停止服务**: 停止当前运行的服务
5. **备份代码**: 备份当前代码
6. **拉取更新**: 从 GitHub 拉取最新代码
7. **安装依赖**: 安装新的依赖包
8. **构建前端**: 重新构建前端应用
9. **启动服务**: 启动更新后的服务
10. **健康检查**: 验证服务正常运行

### 回滚机制
```bash
# 如果部署失败，可以手动回滚
cd /opt/messenger360
git log --oneline -10  # 查看最近的提交
git reset --hard <commit-hash>  # 回滚到指定提交
pm2 restart deep360-api  # 重启服务
```

## 📞 故障排除

### 常见问题

1. **Webhook 不触发**
   ```bash
   # 检查 Webhook 服务器状态
   pm2 status deep360-webhook
   
   # 检查 Nginx 配置
   nginx -t
   
   # 检查防火墙
   ufw status
   ```

2. **部署失败**
   ```bash
   # 查看详细日志
   tail -f /var/log/deep360-webhook.log
   
   # 检查磁盘空间
   df -h
   
   # 检查内存使用
   free -h
   ```

3. **服务启动失败**
   ```bash
   # 检查端口占用
   netstat -tlnp | grep :7788
   
   # 检查 Node.js 进程
   ps aux | grep node
   
   # 重启 PM2
   pm2 restart all
   ```

### 手动部署
```bash
# 如果需要手动部署
cd /opt/messenger360
git pull origin main
npm install --production
cd frontend && npm install && npm run build && cd ..
pm2 restart deep360-api
```

## 🎉 完成状态

### 配置检查清单
- [x] Webhook 配置文件创建
- [x] 服务器端 Webhook 接收器
- [x] Nginx 配置更新
- [x] GitHub Webhook 设置
- [x] 自动部署测试
- [x] 日志监控配置
- [x] 安全验证机制

### 测试验证
- [ ] Webhook 端点可访问
- [ ] 签名验证正常工作
- [ ] 代码推送触发部署
- [ ] 服务自动重启
- [ ] 健康检查通过
- [ ] 日志记录完整

---

## 🚀 总结

**Deep360 GitHub 自动同步已配置完成！**

现在当您推送代码到 GitHub 时，服务器会自动：
1. 接收 Webhook 通知
2. 验证请求安全性
3. 拉取最新代码
4. 重新构建应用
5. 重启服务
6. 验证部署成功

**系统已准备好进行自动化部署！** 🎉
