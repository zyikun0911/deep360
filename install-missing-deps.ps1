# Deep360 Missing Dependencies Fix
Write-Host "=== Deep360 Missing Dependencies Fix ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssue Found:" -ForegroundColor Yellow
Write-Host "Missing whatsapp-web.js dependency" -ForegroundColor Red
Write-Host "Backend service cannot start properly" -ForegroundColor Red

Write-Host "`nServer Commands to Fix:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Install missing dependencies:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   npm install whatsapp-web.js" -ForegroundColor Gray

Write-Host "`n2. Install other potential missing deps:" -ForegroundColor Cyan
Write-Host "   npm install @tensorflow/tfjs-node" -ForegroundColor Gray
Write-Host "   npm install sharp" -ForegroundColor Gray
Write-Host "   npm install geoip-lite" -ForegroundColor Gray

Write-Host "`n3. Check if all dependencies are installed:" -ForegroundColor Cyan
Write-Host "   npm list --depth=0" -ForegroundColor Gray

Write-Host "`n4. Restart backend service:" -ForegroundColor Cyan
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray

Write-Host "`n5. Check backend logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 10" -ForegroundColor Gray

Write-Host "`n6. Test health check:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n7. Check which port is actually listening:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`nExpected Result:" -ForegroundColor White
Write-Host "Backend should start without errors" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green

Write-Host "`n✅ Ready to install missing dependencies!" -ForegroundColor Green
