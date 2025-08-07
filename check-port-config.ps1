# Deep360 Port Configuration Check
Write-Host "=== Deep360 Port Configuration Check ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssue Analysis:" -ForegroundColor Yellow
Write-Host "Backend shows 'online' but health check fails" -ForegroundColor Red
Write-Host "Port 7788 connection refused" -ForegroundColor Red
Write-Host "Possible port mismatch or service not listening" -ForegroundColor Yellow

Write-Host "`nServer Commands to Check:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Check what port backend is actually using:" -ForegroundColor Cyan
Write-Host "   netstat -tlnp | grep node" -ForegroundColor Gray

Write-Host "`n2. Check PM2 process details:" -ForegroundColor Cyan
Write-Host "   pm2 show deep360-backend" -ForegroundColor Gray

Write-Host "`n3. Check backend logs for port info:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 5" -ForegroundColor Gray

Write-Host "`n4. Test different ports:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7999/health" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:3000/health" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n5. Check if service is listening:" -ForegroundColor Cyan
Write-Host "   lsof -i :7788" -ForegroundColor Gray
Write-Host "   lsof -i :7999" -ForegroundColor Gray

Write-Host "`n6. Restart with correct port:" -ForegroundColor Cyan
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   PORT=7788 pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`nExpected Solution:" -ForegroundColor White
Write-Host "Backend is running on port 7999 but health check expects 7788" -ForegroundColor Yellow
Write-Host "Need to restart with correct port configuration" -ForegroundColor Cyan

Write-Host "`n✅ Ready to fix port configuration!" -ForegroundColor Green
