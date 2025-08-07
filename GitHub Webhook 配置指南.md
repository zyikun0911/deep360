# GitHub Webhook 配置指南

## 当前状态
- ✅ 服务器端Webhook接收器已配置
- ✅ Webhook服务器已启动 (PM2: deep360-webhook)
- ✅ Nginx配置已更新
- ⏳ 需要在GitHub UI中配置Webhook

## 在GitHub上配置Webhook

### 1. 访问GitHub仓库
1. 打开浏览器，访问：https://github.com/zyikun/deep360
2. 点击仓库页面顶部的 "Settings" 标签

### 2. 配置Webhook
1. 在左侧菜单中点击 "Webhooks"
2. 点击 "Add webhook" 按钮

### 3. 填写Webhook配置
```
Payload URL: http://74.208.61.148/webhook
Content type: application/json
Secret: deep360-secret-1234
```

### 4. 选择事件
- 勾选 "Just the push event"
- 或者选择 "Send me everything" 然后只监听 push 事件

### 5. 保存配置
- 点击 "Add webhook" 按钮保存

## 测试自动部署

### 1. 推送测试代码
```bash
# 在本地机器上执行
echo "# 测试自动部署 $(date)" >> README.md
git add README.md
git commit -m "测试GitHub Webhook自动部署"
git push origin main
```

### 2. 检查部署状态
在服务器上执行：
```bash
# 查看Webhook日志
tail -f /var/log/deep360-webhook.log

# 检查服务状态
pm2 status

# 健康检查
curl -f http://localhost:7788/health
```

## 预期结果
- 推送代码后，GitHub会向服务器发送Webhook
- 服务器自动拉取最新代码并重启服务
- 日志显示部署成功信息

## 故障排除
如果自动部署失败：
1. 检查GitHub Webhook配置是否正确
2. 查看服务器日志：`tail -f /var/log/deep360-webhook.log`
3. 检查PM2进程状态：`pm2 status`
4. 手动测试Webhook：`curl -X POST http://localhost:8080/webhook`

## 完成状态
- ✅ 本地代码已推送到GitHub
- ✅ 服务器端Webhook系统已配置
- ⏳ 等待GitHub Webhook配置完成
- ⏳ 等待测试自动部署
