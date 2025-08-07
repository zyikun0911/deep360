# 🔧 GitHub Webhook 配置步骤

## 📋 配置信息
- **GitHub 仓库**: https://github.com/zyikun0911/deep360
- **Webhook URL**: http://74.208.61.148/webhook
- **Secret**: deep360-secret-1234

## 🎯 配置步骤

### 步骤 1: 访问 GitHub 仓库设置

1. **打开浏览器**，访问: https://github.com/zyikun0911/deep360
2. **点击 "Settings"** 标签（在仓库页面顶部）
3. **点击左侧菜单中的 "Webhooks"**

### 步骤 2: 添加新的 Webhook

1. **点击 "Add webhook"** 按钮
2. **配置以下参数**:

#### 基本设置
- **Payload URL**: `http://74.208.61.148/webhook`
- **Content type**: `application/json`
- **Secret**: `deep360-secret-1234`

#### 事件选择
- **选择**: "Let me select individual events"
- **勾选**: ✅ **Push** (代码推送时触发)

#### 高级设置
- ✅ **Active** (启用)
- ✅ **SSL verification** (SSL 验证)

### 步骤 3: 保存配置

1. **点击 "Add webhook"** 按钮保存配置
2. **等待配置生效** (通常几秒钟)

### 步骤 4: 测试 Webhook

1. **在 Webhook 列表中找到刚创建的 webhook**
2. **点击 "Test delivery"** 按钮
3. **选择 "Push"** 事件
4. **查看响应状态** (应该是 200 OK)

## 🔧 服务器端验证

在服务器上执行以下命令验证配置：

```bash
# 检查 Webhook 服务器状态
pm2 status deep360-webhook

# 查看 Webhook 日志
tail -f /var/log/deep360-webhook.log

# 测试 Webhook 端点
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{"test": "ping"}'
```

## 🚀 测试自动部署

配置完成后，在您的本地机器上推送测试代码：

```bash
# 添加所有文件
git add .

# 提交更改
git commit -m "测试自动部署"

# 推送到 GitHub
git push origin main
```

## 📊 监控部署过程

```bash
# 实时查看部署日志
ssh root@74.208.61.148 "tail -f /var/log/deep360-webhook.log"

# 检查服务状态
ssh root@74.208.61.148 "pm2 status"

# 健康检查
ssh root@74.208.61.148 "curl -f http://localhost:7788/health"
```

## 🎉 配置完成后的工作流程

1. **开发代码** → 在本地开发新功能
2. **推送代码** → `git push origin main`
3. **GitHub 发送 Webhook** → 到服务器 74.208.61.148
4. **服务器验证签名** → 确保请求安全
5. **自动拉取代码** → 从 GitHub 获取最新代码
6. **重新构建应用** → 安装依赖并构建前端
7. **重启服务** → 使用 PM2 重启应用
8. **健康检查** → 验证部署成功

## 📞 故障排除

### 常见问题

1. **Webhook 不触发**
   - 检查服务器防火墙设置
   - 确认 Webhook URL 可访问
   - 查看 GitHub Webhook 日志

2. **签名验证失败**
   - 确认 Secret 配置正确
   - 检查服务器时间是否同步

3. **部署失败**
   - 查看 `/var/log/deep360-webhook.log` 日志
   - 检查磁盘空间和权限
   - 确认 Git 仓库配置正确

### 调试命令

```bash
# 查看详细日志
tail -f /var/log/deep360-webhook.log

# 检查端口监听
netstat -tlnp | grep :8080

# 测试 Nginx 配置
nginx -t

# 重启 Webhook 服务
pm2 restart deep360-webhook
```

---

## ✅ 配置检查清单

- [ ] GitHub Webhook 已创建
- [ ] Payload URL 配置正确
- [ ] Secret 配置正确
- [ ] Push 事件已启用
- [ ] Webhook 服务器运行正常
- [ ] 测试推送成功
- [ ] 自动部署工作正常

**现在您的 GitHub 自动同步系统已完全配置就绪！** 🚀
