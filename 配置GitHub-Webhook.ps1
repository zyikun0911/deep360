# Deep360 GitHub Webhook 配置脚本
Write-Host "🔧 配置 GitHub Webhook 有效载荷..." -ForegroundColor Green

$SERVER_IP = "74.208.61.148"
$GITHUB_REPO = "zyikun0911/deep360"
$WEBHOOK_SECRET = "deep360-secret-1234"

Write-Host "📋 Webhook 配置信息:" -ForegroundColor Yellow
Write-Host "服务器 IP: $SERVER_IP" -ForegroundColor White
Write-Host "GitHub 仓库: $GITHUB_REPO" -ForegroundColor White
Write-Host "Webhook 密钥: $WEBHOOK_SECRET" -ForegroundColor White

Write-Host ""
Write-Host "🎯 配置步骤:" -ForegroundColor Cyan

Write-Host ""
Write-Host "1. 访问 GitHub 仓库设置:" -ForegroundColor Yellow
Write-Host "   https://github.com/$GITHUB_REPO/settings/hooks" -ForegroundColor White

Write-Host ""
Write-Host "2. 点击 'Add webhook' 按钮" -ForegroundColor Yellow

Write-Host ""
Write-Host "3. 配置 Webhook 参数:" -ForegroundColor Yellow
Write-Host "   Payload URL: http://$SERVER_IP/webhook" -ForegroundColor White
Write-Host "   Content type: application/json" -ForegroundColor White
Write-Host "   Secret: $WEBHOOK_SECRET" -ForegroundColor White

Write-Host ""
Write-Host "4. 选择事件类型:" -ForegroundColor Yellow
Write-Host "   ✅ Push (代码推送)" -ForegroundColor Green
Write-Host "   ✅ Pull request (拉取请求，可选)" -ForegroundColor Cyan
Write-Host "   ✅ Release (发布，可选)" -ForegroundColor Cyan

Write-Host ""
Write-Host "5. 高级设置:" -ForegroundColor Yellow
Write-Host "   ✅ Active (启用)" -ForegroundColor Green
Write-Host "   ✅ SSL verification (SSL 验证)" -ForegroundColor Green
Write-Host "   ✅ Send me everything (发送所有数据)" -ForegroundColor Green

Write-Host ""
Write-Host "6. 点击 'Add webhook' 保存配置" -ForegroundColor Yellow

Write-Host ""
Write-Host "7. 测试 Webhook:" -ForegroundColor Yellow
Write-Host "   - 点击 'Test delivery' 按钮" -ForegroundColor White
Write-Host "   - 选择 'Push' 事件" -ForegroundColor White
Write-Host "   - 查看响应状态码 (应该是 200)" -ForegroundColor White

Write-Host ""
Write-Host "📊 有效载荷数据结构:" -ForegroundColor Cyan

$PAYLOAD_EXAMPLE = @"
{
  "ref": "refs/heads/main",
  "before": "a1b2c3d4e5f6...",
  "after": "f6e5d4c3b2a1...",
  "repository": {
    "id": 123456789,
    "name": "deep360",
    "full_name": "$GITHUB_REPO",
    "private": false,
    "owner": {
      "login": "zyikun0911",
      "id": 12345678
    }
  },
  "pusher": {
    "name": "zyikun0911",
    "email": "ellokun0911@gmail.com"
  },
  "commits": [
    {
      "id": "f6e5d4c3b2a1...",
      "message": "测试自动部署",
      "timestamp": "2025-08-07T15:30:00Z",
      "author": {
        "name": "Deep360 Team",
        "email": "ellokun0911@gmail.com"
      }
    }
  ]
}
"@

Write-Host $PAYLOAD_EXAMPLE -ForegroundColor Gray

Write-Host ""
Write-Host "🔧 服务器端处理:" -ForegroundColor Cyan

$SERVER_HANDLING = @"
1. 接收 Webhook 请求
2. 验证签名 (X-Hub-Signature-256)
3. 解析事件类型 (X-GitHub-Event)
4. 处理 Push 事件
5. 执行自动部署
6. 返回响应状态
"@

Write-Host $SERVER_HANDLING -ForegroundColor Gray

Write-Host ""
Write-Host "🛡️ 安全验证:" -ForegroundColor Cyan
Write-Host "✅ 签名验证: HMAC-SHA256" -ForegroundColor Green
Write-Host "✅ 事件过滤: 只处理 Push 事件" -ForegroundColor Green
Write-Host "✅ 密钥保护: $WEBHOOK_SECRET" -ForegroundColor Green

Write-Host ""
Write-Host "📊 监控命令:" -ForegroundColor Cyan
Write-Host "# 查看 Webhook 日志" -ForegroundColor White
Write-Host "tail -f /var/log/deep360-webhook.log" -ForegroundColor Gray
Write-Host ""
Write-Host "# 检查服务状态" -ForegroundColor White
Write-Host "pm2 status deep360-webhook" -ForegroundColor Gray
Write-Host ""
Write-Host "# 测试 Webhook 端点" -ForegroundColor White
Write-Host "curl -X POST http://$SERVER_IP/webhook -H 'Content-Type: application/json' -d '{\"test\": \"ping\"}'" -ForegroundColor Gray

Write-Host ""
Write-Host "🎯 测试步骤:" -ForegroundColor Cyan
Write-Host "1. 推送测试代码到 GitHub" -ForegroundColor White
Write-Host "2. 查看服务器日志" -ForegroundColor White
Write-Host "3. 验证自动部署" -ForegroundColor White
Write-Host "4. 检查服务状态" -ForegroundColor White

Write-Host ""
Write-Host "✅ GitHub Webhook 配置指南完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步:" -ForegroundColor Yellow
Write-Host "1. 按照上述步骤在 GitHub 配置 Webhook" -ForegroundColor White
Write-Host "2. 测试自动部署功能" -ForegroundColor White
Write-Host "3. 查看详细配置指南: GitHub-Webhook配置指南.md" -ForegroundColor White
