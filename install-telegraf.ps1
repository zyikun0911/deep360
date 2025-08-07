# Deep360 Telegraf Dependency Fix
Write-Host "=== Deep360 Telegraf Dependency Fix ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssue Found:" -ForegroundColor Yellow
Write-Host "Missing telegraf dependency" -ForegroundColor Red
Write-Host "Backend still running on port 7999 instead of 7788" -ForegroundColor Red

Write-Host "`nServer Commands to Fix:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Install telegraf dependency:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   npm install telegraf" -ForegroundColor Gray

Write-Host "`n2. Check if backend is using correct port:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 3" -ForegroundColor Gray

Write-Host "`n3. Force restart with correct port:" -ForegroundColor Cyan
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   PORT=7788 pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n4. Check if port is now listening:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`n5. Test health check:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n6. Check backend startup logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 5" -ForegroundColor Gray

Write-Host "`nExpected Result:" -ForegroundColor White
Write-Host "Backend should start on port 7788 without errors" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green
Write-Host "Port 7788 should be listening" -ForegroundColor Green

Write-Host "`n✅ Ready to install telegraf dependency!" -ForegroundColor Green
