# Deep360 Port Issue Fix
Write-Host "=== Deep360 Port Issue Fix ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssue Found:" -ForegroundColor Yellow
Write-Host "Backend running on port 8080 instead of 7788" -ForegroundColor Red
Write-Host "PORT environment variable not being read correctly" -ForegroundColor Red

Write-Host "`nServer Commands to Fix:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Create .env file with correct port:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   echo 'PORT=7788' > .env" -ForegroundColor Gray

Write-Host "`n2. Check if .env file was created:" -ForegroundColor Cyan
Write-Host "   cat .env" -ForegroundColor Gray

Write-Host "`n3. Restart backend with environment file:" -ForegroundColor Cyan
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n4. Check if port is now listening:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`n5. Test health check:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n6. Check backend startup logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 5" -ForegroundColor Gray

Write-Host "`nExpected Result:" -ForegroundColor White
Write-Host "Backend should start on port 7788" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green
Write-Host "Port 7788 should be listening" -ForegroundColor Green

Write-Host "`n✅ Ready to fix port issue!" -ForegroundColor Green
