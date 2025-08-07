# Test GitHub Webhook Auto Deployment
Write-Host "=== Deep360 GitHub Webhook Test ===" -ForegroundColor Green

# 1. Check Git status
Write-Host "`n1. Checking Git status..." -ForegroundColor Yellow
git status

# 2. Create test file
Write-Host "`n2. Creating test file..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$testContent = "# Test GitHub Webhook Auto Deployment`n`nTime: $timestamp`n`nThis is a test commit to verify GitHub Webhook auto deployment functionality."
$testContent | Out-File -FilePath "test-webhook.md" -Encoding UTF8

# 3. Commit and push
Write-Host "`n3. Committing and pushing to GitHub..." -ForegroundColor Yellow
git add test-webhook.md
git commit -m "Test GitHub Webhook Auto Deployment - $timestamp"
git push origin main

# 4. Show test results
Write-Host "`n4. Test completed!" -ForegroundColor Green
Write-Host "Please follow these steps to check deployment status:" -ForegroundColor Cyan
Write-Host "1. Visit https://github.com/zyikun/deep360 to view latest commit" -ForegroundColor White
Write-Host "2. On server run: tail -f /var/log/deep360-webhook.log" -ForegroundColor White
Write-Host "3. Check service status: pm2 status" -ForegroundColor White
Write-Host "4. Health check: curl -f http://localhost:7788/health" -ForegroundColor White

Write-Host "`nIf you see deployment success logs, GitHub Webhook is configured successfully!" -ForegroundColor Green
