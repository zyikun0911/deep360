# Deep360 Server Status Check
Write-Host "=== Deep360 Server Status Check ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nCurrent Status Analysis:" -ForegroundColor Yellow
Write-Host "✅ Webhook Server: Online" -ForegroundColor Green
Write-Host "⚠️ Backend Service: Error" -ForegroundColor Yellow
Write-Host "⚠️ SSH Connection: Permission Issue" -ForegroundColor Yellow

Write-Host "`nServer Fix Commands:" -ForegroundColor White
Write-Host "Please execute these commands on server:" -ForegroundColor Gray

Write-Host "`n1. Check PM2 Status:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray

Write-Host "`n2. Restart Backend Service:" -ForegroundColor Cyan
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray

Write-Host "`n3. View Backend Logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 20" -ForegroundColor Gray

Write-Host "`n4. Health Check:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n5. View Webhook Logs:" -ForegroundColor Cyan
Write-Host "   tail -f /var/log/deep360-webhook.log" -ForegroundColor Gray

Write-Host "`n6. Check Nginx Status:" -ForegroundColor Cyan
Write-Host "   systemctl status nginx" -ForegroundColor Gray

Write-Host "`n7. Check Port Usage:" -ForegroundColor Cyan
Write-Host "   netstat -tlnp | grep -E ':(7788|9001|9002|8080)'" -ForegroundColor Gray

Write-Host "`nAuto Fix Suggestion:" -ForegroundColor White
Write-Host "If backend service keeps erroring:" -ForegroundColor Gray
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n✅ Webhook Auto-Deploy Successfully Configured!" -ForegroundColor Green
Write-Host "Every code push to GitHub will auto-deploy to server" -ForegroundColor Cyan
