# Deep360 GitHub Webhook 完整部署脚本
Write-Host "🚀 开始 Deep360 GitHub Webhook 完整部署..." -ForegroundColor Green

$SERVER_IP = "74.208.61.148"
$GITHUB_REPO = "zyikun0911/deep360"
$WEBHOOK_SECRET = "deep360-secret-1234"

Write-Host "📋 部署配置信息:" -ForegroundColor Yellow
Write-Host "服务器 IP: $SERVER_IP" -ForegroundColor White
Write-Host "GitHub 仓库: $GITHUB_REPO" -ForegroundColor White
Write-Host "Webhook 密钥: $WEBHOOK_SECRET" -ForegroundColor White

Write-Host ""
Write-Host "🔧 步骤 1: 检查配置文件..." -ForegroundColor Cyan

# 检查配置文件是否存在
$files = @("webhook-server.js", "webhook-receiver.sh", "nginx-deep360.conf")
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file 存在" -ForegroundColor Green
    } else {
        Write-Host "❌ $file 不存在" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🔧 步骤 2: 上传配置文件到服务器..." -ForegroundColor Cyan

# 上传配置文件
Write-Host "上传 webhook-server.js..." -ForegroundColor White
scp webhook-server.js root@${SERVER_IP}:/opt/messenger360/

Write-Host "上传 webhook-receiver.sh..." -ForegroundColor White
scp webhook-receiver.sh root@${SERVER_IP}:/opt/messenger360/

Write-Host "上传 nginx-deep360.conf..." -ForegroundColor White
scp nginx-deep360.conf root@${SERVER_IP}:/etc/nginx/sites-available/deep360

Write-Host ""
Write-Host "🔧 步骤 3: 在服务器上配置 Webhook..." -ForegroundColor Cyan

# 服务器端配置命令
$serverCommands = @"
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
"@

Write-Host "执行服务器配置命令..." -ForegroundColor White
Write-Host $serverCommands -ForegroundColor Gray

Write-Host ""
Write-Host "🔧 步骤 4: 配置 GitHub Webhook..." -ForegroundColor Cyan

Write-Host "请在浏览器中访问以下链接配置 GitHub Webhook:" -ForegroundColor Yellow
Write-Host "https://github.com/$GITHUB_REPO/settings/hooks" -ForegroundColor White

Write-Host ""
Write-Host "配置参数:" -ForegroundColor Yellow
Write-Host "Payload URL: http://$SERVER_IP/webhook" -ForegroundColor White
Write-Host "Content type: application/json" -ForegroundColor White
Write-Host "Secret: $WEBHOOK_SECRET" -ForegroundColor White
Write-Host "Events: Push" -ForegroundColor White

Write-Host ""
Write-Host "🔧 步骤 5: 测试自动部署..." -ForegroundColor Cyan

Write-Host "推送测试代码到 GitHub:" -ForegroundColor White
Write-Host "git add ." -ForegroundColor Gray
Write-Host "git commit -m '测试自动部署'" -ForegroundColor Gray
Write-Host "git push origin main" -ForegroundColor Gray

Write-Host ""
Write-Host "🔧 步骤 6: 监控部署状态..." -ForegroundColor Cyan

Write-Host "查看 Webhook 日志:" -ForegroundColor White
Write-Host "ssh root@$SERVER_IP 'tail -f /var/log/deep360-webhook.log'" -ForegroundColor Gray

Write-Host "检查服务状态:" -ForegroundColor White
Write-Host "ssh root@$SERVER_IP 'pm2 status'" -ForegroundColor Gray

Write-Host "健康检查:" -ForegroundColor White
Write-Host "ssh root@$SERVER_IP 'curl -f http://localhost:7788/health'" -ForegroundColor Gray

Write-Host ""
Write-Host "🎯 自动化部署命令:" -ForegroundColor Cyan

$automationCommands = @"
# 1. 上传配置文件
scp webhook-server.js root@$SERVER_IP:/opt/messenger360/
scp webhook-receiver.sh root@$SERVER_IP:/opt/messenger360/
scp nginx-deep360.conf root@$SERVER_IP:/etc/nginx/sites-available/deep360

# 2. 登录服务器并配置
ssh root@$SERVER_IP << 'EOF'
cd /opt/messenger360
chmod +x webhook-receiver.sh
mkdir -p /var/log
touch /var/log/deep360-webhook.log
chmod 666 /var/log/deep360-webhook.log
ln -sf /etc/nginx/sites-available/deep360 /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
pm2 start webhook-server.js --name deep360-webhook
pm2 save
pm2 list
EOF

# 3. 测试 Webhook
curl -X POST http://$SERVER_IP/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{"test": "ping"}'
"@

Write-Host $automationCommands -ForegroundColor Gray

Write-Host ""
Write-Host "✅ 部署脚本准备完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步操作:" -ForegroundColor Yellow
Write-Host "1. 运行自动化部署命令" -ForegroundColor White
Write-Host "2. 在 GitHub 配置 Webhook" -ForegroundColor White
Write-Host "3. 测试自动部署功能" -ForegroundColor White
Write-Host "4. 监控部署状态" -ForegroundColor White

Write-Host ""
Write-Host "🚀 是否现在执行自动化部署？(Y/N)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "🔧 开始执行自动化部署..." -ForegroundColor Green
    
    # 执行部署命令
    Write-Host "上传配置文件..." -ForegroundColor White
    scp webhook-server.js root@${SERVER_IP}:/opt/messenger360/
    scp webhook-receiver.sh root@${SERVER_IP}:/opt/messenger360/
    scp nginx-deep360.conf root@${SERVER_IP}:/etc/nginx/sites-available/deep360
    
    Write-Host "配置服务器..." -ForegroundColor White
    ssh root@${SERVER_IP} "cd /opt/messenger360 && chmod +x webhook-receiver.sh && mkdir -p /var/log && touch /var/log/deep360-webhook.log && chmod 666 /var/log/deep360-webhook.log && ln -sf /etc/nginx/sites-available/deep360 /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx && pm2 start webhook-server.js --name deep360-webhook && pm2 save"
    
    Write-Host "测试 Webhook 端点..." -ForegroundColor White
    ssh root@${SERVER_IP} "curl -X POST http://localhost:8080/webhook -H 'Content-Type: application/json' -H 'X-GitHub-Event: ping' -d '{\"test\": \"ping\"}'"
    
    Write-Host ""
    Write-Host "✅ 自动化部署完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 请完成以下步骤:" -ForegroundColor Yellow
    Write-Host "1. 访问 https://github.com/$GITHUB_REPO/settings/hooks" -ForegroundColor White
    Write-Host "2. 点击 'Add webhook'" -ForegroundColor White
    Write-Host "3. 配置: Payload URL = http://$SERVER_IP/webhook" -ForegroundColor White
    Write-Host "4. 配置: Secret = $WEBHOOK_SECRET" -ForegroundColor White
    Write-Host "5. 选择: Push 事件" -ForegroundColor White
    Write-Host "6. 点击 'Add webhook'" -ForegroundColor White
    Write-Host "7. 测试推送代码: git push origin main" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "📋 手动执行步骤:" -ForegroundColor Yellow
    Write-Host "1. 复制上述自动化部署命令" -ForegroundColor White
    Write-Host "2. 在终端中执行" -ForegroundColor White
    Write-Host "3. 按照提示完成 GitHub Webhook 配置" -ForegroundColor White
}

Write-Host ""
Write-Host "🎉 Deep360 GitHub Webhook 部署指南完成！" -ForegroundColor Green
