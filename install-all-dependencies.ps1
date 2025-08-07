# Deep360 Complete Dependencies Installation
Write-Host "=== Deep360 Complete Dependencies Installation ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`nIssue Found:" -ForegroundColor Yellow
Write-Host "Multiple missing dependencies causing backend failures" -ForegroundColor Red
Write-Host "Need to install all required packages at once" -ForegroundColor Red

Write-Host "`nServer Commands to Install All Dependencies:" -ForegroundColor White
Write-Host "Please execute these commands on your server:" -ForegroundColor Gray

Write-Host "`n1. Install all missing dependencies:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   npm install telegraf qrcode puppeteer fluent-ffmpeg" -ForegroundColor Gray

Write-Host "`n2. Install additional dependencies that might be missing:" -ForegroundColor Cyan
Write-Host "   npm install node-telegram-bot-api" -ForegroundColor Gray
Write-Host "   npm install @google-cloud/translate" -ForegroundColor Gray
Write-Host "   npm install openai" -ForegroundColor Gray
Write-Host "   npm install nodemailer" -ForegroundColor Gray

Write-Host "`n3. Install development dependencies:" -ForegroundColor Cyan
Write-Host "   npm install --save-dev @types/node" -ForegroundColor Gray
Write-Host "   npm install --save-dev @types/express" -ForegroundColor Gray

Write-Host "`n4. Check if all dependencies are installed:" -ForegroundColor Cyan
Write-Host "   npm list --depth=0" -ForegroundColor Gray

Write-Host "`n5. Restart backend service:" -ForegroundColor Cyan
Write-Host "   pm2 delete deep360-backend" -ForegroundColor Gray
Write-Host "   PORT=7788 pm2 start server.js --name deep360-backend" -ForegroundColor Gray

Write-Host "`n6. Check backend logs:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 10" -ForegroundColor Gray

Write-Host "`n7. Test health check:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n8. Check listening ports:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`nExpected Result:" -ForegroundColor White
Write-Host "All dependencies should be installed" -ForegroundColor Green
Write-Host "Backend should start on port 7788 without errors" -ForegroundColor Green
Write-Host "Health check should return success" -ForegroundColor Green

Write-Host "`n✅ Ready to install all dependencies!" -ForegroundColor Green
