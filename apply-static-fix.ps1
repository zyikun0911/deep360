# 应用静态文件服务修复
Write-Host "=== 应用静态文件服务修复 ===" -ForegroundColor Cyan

Write-Host "`n修复已推送到 GitHub，现在需要在服务器上应用:" -ForegroundColor Green

Write-Host "`n1. 在远程服务器上拉取最新代码:" -ForegroundColor Yellow
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   git pull origin main" -ForegroundColor Gray

Write-Host "`n2. 重启后端服务:" -ForegroundColor Yellow
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray

Write-Host "`n3. 检查服务状态:" -ForegroundColor Yellow
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   pm2 logs deep360-backend --lines 10" -ForegroundColor Gray

Write-Host "`n4. 测试静态资源访问:" -ForegroundColor Yellow
Write-Host "   curl -f http://localhost:7788/assets/index-ef954fcf.js" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:7788/assets/index-6f7ef964.css" -ForegroundColor Gray

Write-Host "`n5. 测试外部访问:" -ForegroundColor Yellow
Write-Host "   curl -f http://74.208.61.148:7788/assets/index-ef954fcf.js" -ForegroundColor Gray

Write-Host "`n6. 浏览器测试:" -ForegroundColor Yellow
Write-Host "   访问 http://74.208.61.148:7788/" -ForegroundColor Gray
Write-Host "   打开开发者工具 (F12)" -ForegroundColor Gray
Write-Host "   检查 Network 标签页中的资源加载状态" -ForegroundColor Gray

Write-Host "`n修复说明:" -ForegroundColor Cyan
Write-Host "   - 之前的配置会拦截所有请求并返回 index.html" -ForegroundColor Gray
Write-Host "   - 现在会正确跳过 /assets/ 和 /static/ 路径的静态资源" -ForegroundColor Gray
Write-Host "   - 静态资源现在应该能正确加载" -ForegroundColor Gray

Write-Host "`n如果修复后仍有问题，请告诉我:" -ForegroundColor Green
Write-Host "   - 静态资源的 curl 响应状态" -ForegroundColor Gray
Write-Host "   - 浏览器控制台的错误信息" -ForegroundColor Gray
Write-Host "   - 服务器日志中的相关信息" -ForegroundColor Gray
