# Deep360 Deployment Progress Check
Write-Host "=== Deep360 Deployment Progress Check ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n📊 Checking deployment progress on server..." -ForegroundColor Yellow

Write-Host "`n🔍 Server Commands to Check:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Check PM2 Process Status:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray

Write-Host "`n2. View Real-time Webhook Logs:" -ForegroundColor Cyan
Write-Host "   tail -f /var/log/deep360-webhook.log" -ForegroundColor Gray

Write-Host "`n3. Check Recent Deployment Logs:" -ForegroundColor Cyan
Write-Host "   tail -20 /var/log/deep360-webhook.log" -ForegroundColor Gray

Write-Host "`n4. Check Backend Service Logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 10" -ForegroundColor Gray

Write-Host "`n5. Check Health Status:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n6. Check Port Usage:" -ForegroundColor Cyan
Write-Host "   netstat -tlnp | grep -E ':(7788|9001|9002|8080)'" -ForegroundColor Gray

Write-Host "`n7. Check Directory Status:" -ForegroundColor Cyan
Write-Host "   ls -la /opt/messenger360/" -ForegroundColor Gray

Write-Host "`n8. Check Git Status on Server:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360 && git log --oneline -3" -ForegroundColor Gray

Write-Host "`n📈 Expected Deployment Steps:" -ForegroundColor White
Write-Host "✅ 1. Webhook received push event" -ForegroundColor Green
Write-Host "⏳ 2. Signature verification" -ForegroundColor Yellow
Write-Host "⏳ 3. Pull latest code" -ForegroundColor Yellow
Write-Host "⏳ 4. Install dependencies" -ForegroundColor Yellow
Write-Host "⏳ 5. Build frontend" -ForegroundColor Yellow
Write-Host "⏳ 6. Restart services" -ForegroundColor Yellow
Write-Host "⏳ 7. Health check" -ForegroundColor Yellow

Write-Host "`n🚨 If Deployment Fails:" -ForegroundColor White
Write-Host "   # Restart backend service" -ForegroundColor Gray
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray
Write-Host "   " -ForegroundColor Gray
Write-Host "   # Check for errors" -ForegroundColor Gray
Write-Host "   pm2 logs deep360-backend --lines 20" -ForegroundColor Gray
Write-Host "   " -ForegroundColor Gray
Write-Host "   # Manual restart if needed" -ForegroundColor Gray
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n✅ Deployment monitoring ready!" -ForegroundColor Green
Write-Host "Run these commands on your server to check progress" -ForegroundColor Cyan
