# Deep360 Backend Issue Diagnosis
Write-Host "=== Deep360 Backend Issue Diagnosis ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nCurrent Status:" -ForegroundColor Yellow
Write-Host "✅ Code cloned from Git successfully" -ForegroundColor Green
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host "✅ Backend service started" -ForegroundColor Green
Write-Host "⚠️ Health check still failing" -ForegroundColor Yellow
Write-Host "⚠️ Multiple backend processes running" -ForegroundColor Yellow

Write-Host "`nServer Commands to Diagnose:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Check backend logs for errors:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 20" -ForegroundColor Gray

Write-Host "`n2. Check which ports are actually listening:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`n3. Test different ports:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:3000/health" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:7999/health" -ForegroundColor Gray

Write-Host "`n4. Check environment variables:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   cat .env | grep PORT" -ForegroundColor Gray

Write-Host "`n5. Clean up duplicate processes:" -ForegroundColor Cyan
Write-Host "   pm2 delete all" -ForegroundColor Gray
Write-Host "   pm2 start webhook-server.js --name deep360-webhook" -ForegroundColor Gray
Write-Host "   PORT=7788 pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n6. Check if .env file exists:" -ForegroundColor Cyan
Write-Host "   ls -la /opt/messenger360/.env" -ForegroundColor Gray
Write-Host "   ls -la /opt/messenger360/env.example" -ForegroundColor Gray

Write-Host "`n7. Create .env file if missing:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   cp env.example .env" -ForegroundColor Gray

Write-Host "`nExpected Solution:" -ForegroundColor White
Write-Host "Backend should start on port 7788 with proper .env configuration" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green

Write-Host "`n✅ Ready to diagnose backend issue!" -ForegroundColor Green
