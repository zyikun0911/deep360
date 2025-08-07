# Monitor GitHub Webhook Sync Status
Write-Host "=== Deep360 GitHub Webhook Sync Monitor ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n📊 Sync Status Check:" -ForegroundColor Yellow
Write-Host "1. Check GitHub repository status..." -ForegroundColor White
Write-Host "   Repository: https://github.com/zyikun0911/deep360" -ForegroundColor Gray
Write-Host "   Latest commit: $(git log --oneline -1)" -ForegroundColor Gray

Write-Host "`n2. Server-side check commands:" -ForegroundColor White
Write-Host "   # View Webhook logs" -ForegroundColor Gray
Write-Host "   tail -f /var/log/deep360-webhook.log" -ForegroundColor Gray
Write-Host "   " -ForegroundColor Gray
Write-Host "   # Check PM2 process status" -ForegroundColor Gray
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   " -ForegroundColor Gray
Write-Host "   # Health check" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n3. Expected sync process:" -ForegroundColor White
Write-Host "   ✅ Code pushed to GitHub" -ForegroundColor Green
Write-Host "   ⏳ GitHub sends Webhook to server" -ForegroundColor Yellow
Write-Host "   ⏳ Server verifies signature" -ForegroundColor Yellow
Write-Host "   ⏳ Pull latest code" -ForegroundColor Yellow
Write-Host "   ⏳ Install dependencies" -ForegroundColor Yellow
Write-Host "   ⏳ Build frontend" -ForegroundColor Yellow
Write-Host "   ⏳ Restart service" -ForegroundColor Yellow
Write-Host "   ⏳ Health check" -ForegroundColor Yellow

Write-Host "`n4. Troubleshooting:" -ForegroundColor White
Write-Host "   If sync fails, check:" -ForegroundColor Gray
Write-Host "   - GitHub Webhook configuration" -ForegroundColor Gray
Write-Host "   - Server network connection" -ForegroundColor Gray
Write-Host "   - PM2 process status" -ForegroundColor Gray
Write-Host "   - Log file permissions" -ForegroundColor Gray

Write-Host "`n🎉 If you see deployment success logs, auto-sync is configured successfully!" -ForegroundColor Green
