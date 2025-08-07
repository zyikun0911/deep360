# Deep360 Final Issues Fix
Write-Host "=== Deep360 Final Issues Fix ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssues Found:" -ForegroundColor Yellow
Write-Host "1. Missing qrcode dependency" -ForegroundColor Red
Write-Host "2. Backend not listening on port 7788" -ForegroundColor Red
Write-Host "3. Environment variable PORT=3000 conflicts" -ForegroundColor Red

Write-Host "`nServer Commands to Fix:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Install missing qrcode dependency:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   npm install qrcode" -ForegroundColor Gray

Write-Host "`n2. Update environment variable:" -ForegroundColor Cyan
Write-Host "   sed -i 's/PORT=3000/PORT=7788/' .env" -ForegroundColor Gray

Write-Host "`n3. Verify environment variable:" -ForegroundColor Cyan
Write-Host "   cat .env | grep PORT" -ForegroundColor Gray

Write-Host "`n4. Restart backend with correct port:" -ForegroundColor Cyan
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   PORT=7788 pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n5. Check if port is now listening:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`n6. Test health check:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n7. Check backend logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 5" -ForegroundColor Gray

Write-Host "`nExpected Result:" -ForegroundColor White
Write-Host "Backend should start on port 7788 without errors" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green
Write-Host "Port 7788 should be listening" -ForegroundColor Green

Write-Host "`n✅ Ready to fix final issues!" -ForegroundColor Green
