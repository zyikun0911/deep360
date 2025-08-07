# Deep360 Backend Port Issue Check
Write-Host "=== Deep360 Backend Port Issue Check ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssue Found:" -ForegroundColor Yellow
Write-Host "Backend service is online but not listening on port 7788" -ForegroundColor Red
Write-Host "Only webhook server (port 8080) is listening" -ForegroundColor Red

Write-Host "`nServer Commands to Diagnose:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Check backend logs for startup info:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 20" -ForegroundColor Gray

Write-Host "`n2. Check if backend is actually running:" -ForegroundColor Cyan
Write-Host "   ps aux | grep node" -ForegroundColor Gray

Write-Host "`n3. Check environment variables:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   cat .env | grep PORT" -ForegroundColor Gray

Write-Host "`n4. Test different ports:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:3000/health" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:7999/health" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n5. Check server.js for port configuration:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   grep -n 'listen\|port' server.js" -ForegroundColor Gray

Write-Host "`n6. Restart with explicit port:" -ForegroundColor Cyan
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   PORT=7788 pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n7. Check if port is now listening:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`nExpected Solution:" -ForegroundColor White
Write-Host "Backend should start and listen on port 7788" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green

Write-Host "`n✅ Ready to diagnose port issue!" -ForegroundColor Green
