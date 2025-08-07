# Deep360 Frontend Deployment
Write-Host "=== Deep360 Frontend Deployment ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n🔍 问题分析:" -ForegroundColor Yellow
Write-Host "❌ 前端界面未部署，只看到API响应" -ForegroundColor Red
Write-Host "✅ 需要构建前端并配置静态文件服务" -ForegroundColor Green

Write-Host "`n🔧 部署步骤:" -ForegroundColor White

Write-Host "`n1. 在服务器上构建前端:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360/frontend" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray

Write-Host "`n2. 检查构建结果:" -ForegroundColor Cyan
Write-Host "   ls -la /opt/messenger360/frontend/dist" -ForegroundColor Gray
Write-Host "   ls -la /opt/messenger360/frontend/build" -ForegroundColor Gray

Write-Host "`n3. 配置后端静态文件服务:" -ForegroundColor Cyan
Write-Host "   # 确保 server.js 中的静态文件配置正确" -ForegroundColor Gray

Write-Host "`n4. 设置生产环境变量:" -ForegroundColor Cyan
Write-Host "   echo 'NODE_ENV=production' >> /opt/messenger360/.env" -ForegroundColor Gray

Write-Host "`n5. 重启后端服务:" -ForegroundColor Cyan
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray

Write-Host "`n6. 测试前端访问:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:7788/dashboard" -ForegroundColor Gray

Write-Host "`n📊 预期结果:" -ForegroundColor White
Write-Host "✅ 前端构建成功" -ForegroundColor Green
Write-Host "✅ 静态文件服务正常" -ForegroundColor Green
Write-Host "✅ 管理界面可以访问" -ForegroundColor Green
Write-Host "✅ 响应式设计正常" -ForegroundColor Green

Write-Host "`n🎯 请执行这些命令来部署前端界面！" -ForegroundColor Green
