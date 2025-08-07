# Deep360 Dotenv Fix Push
Write-Host "=== Deep360 Dotenv Fix Push ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssue Found:" -ForegroundColor Yellow
Write-Host "server.js missing dotenv configuration" -ForegroundColor Red
Write-Host "PORT environment variable not being loaded from .env file" -ForegroundColor Red

Write-Host "`nFix Applied:" -ForegroundColor White
Write-Host "Added require('dotenv').config(); to server.js" -ForegroundColor Green

Write-Host "`nServer Commands to Apply Fix:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Pull latest changes from GitHub:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   git pull origin main" -ForegroundColor Gray

Write-Host "`n2. Restart backend service:" -ForegroundColor Cyan
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n3. Check if port is now listening:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`n4. Test health check:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n5. Check backend startup logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 5" -ForegroundColor Gray

Write-Host "`nExpected Result:" -ForegroundColor White
Write-Host "Backend should start on port 7788" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green
Write-Host "Port 7788 should be listening" -ForegroundColor Green

Write-Host "`n✅ Ready to push dotenv fix!" -ForegroundColor Green
