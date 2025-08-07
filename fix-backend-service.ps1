# Deep360 Backend Service Fix
Write-Host "=== Deep360 Backend Service Fix ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nCurrent Issue:" -ForegroundColor Yellow
Write-Host "Backend service is in ERROR state" -ForegroundColor Red
Write-Host "Webhook is working but backend needs restart" -ForegroundColor Yellow

Write-Host "`nFix Commands for Server:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Check Backend Logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 20" -ForegroundColor Gray

Write-Host "`n2. Restart Backend Service:" -ForegroundColor Cyan
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray

Write-Host "`n3. If Restart Fails, Reinstall:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n4. Check Health After Fix:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n5. Verify PM2 Status:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray

Write-Host "`n✅ Webhook Deployment is Working!" -ForegroundColor Green
Write-Host "Just need to fix the backend service" -ForegroundColor Cyan
