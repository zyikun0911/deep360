# Deep360 Deployment Monitor
Write-Host "=== Deep360 Deployment Monitor ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nServer Commands to Monitor Deployment:" -ForegroundColor Yellow

Write-Host "`n1. Check PM2 Status:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray

Write-Host "`n2. Monitor Webhook Logs:" -ForegroundColor Cyan
Write-Host "   tail -f /var/log/deep360-webhook.log" -ForegroundColor Gray

Write-Host "`n3. Check Recent Logs:" -ForegroundColor Cyan
Write-Host "   tail -20 /var/log/deep360-webhook.log" -ForegroundColor Gray

Write-Host "`n4. Check Backend Logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 10" -ForegroundColor Gray

Write-Host "`n5. Health Check:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n6. Check Git Status:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360 && git log --oneline -3" -ForegroundColor Gray

Write-Host "`nExpected Deployment Steps:" -ForegroundColor White
Write-Host "✅ Webhook received" -ForegroundColor Green
Write-Host "⏳ Code pulled" -ForegroundColor Yellow
Write-Host "⏳ Dependencies installed" -ForegroundColor Yellow
Write-Host "⏳ Services restarted" -ForegroundColor Yellow
Write-Host "⏳ Health check passed" -ForegroundColor Yellow

Write-Host "`nQuick Fix Commands:" -ForegroundColor White
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray
Write-Host "   cd /opt/messenger360 && npm install" -ForegroundColor Gray
Write-Host "   pm2 delete deep360-backend && pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n✅ Ready to monitor deployment!" -ForegroundColor Green
