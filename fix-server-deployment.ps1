# Deep360 Server Deployment Fix
Write-Host "=== Deep360 Server Deployment Fix ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssue Found:" -ForegroundColor Yellow
Write-Host "Server.js not found in /opt/messenger360/" -ForegroundColor Red
Write-Host "Deployment package not properly extracted" -ForegroundColor Red

Write-Host "`nServer Commands to Fix:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Check current directory contents:" -ForegroundColor Cyan
Write-Host "   ls -la /opt/messenger360/" -ForegroundColor Gray

Write-Host "`n2. Check if deployment package exists:" -ForegroundColor Cyan
Write-Host "   ls -la /root/" -ForegroundColor Gray
Write-Host "   ls -la /root/deep360-deploy.zip" -ForegroundColor Gray

Write-Host "`n3. Extract deployment package:" -ForegroundColor Cyan
Write-Host "   cd /opt" -ForegroundColor Gray
Write-Host "   rm -rf messenger360" -ForegroundColor Gray
Write-Host "   unzip /root/deep360-deploy.zip" -ForegroundColor Gray
Write-Host "   mv deep360 messenger360" -ForegroundColor Gray

Write-Host "`n4. Or recreate from Git:" -ForegroundColor Cyan
Write-Host "   cd /opt" -ForegroundColor Gray
Write-Host "   rm -rf messenger360" -ForegroundColor Gray
Write-Host "   git clone https://github.com/zyikun0911/deep360.git messenger360" -ForegroundColor Gray
Write-Host "   cd messenger360" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray

Write-Host "`n5. Start backend service:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   PORT=7788 pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n6. Verify deployment:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`nExpected Result:" -ForegroundColor White
Write-Host "Backend service should start on port 7788" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green

Write-Host "`n✅ Ready to fix server deployment!" -ForegroundColor Green
