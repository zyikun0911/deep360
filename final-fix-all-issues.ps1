# Deep360 Final Fix All Issues
Write-Host "=== Deep360 Final Fix All Issues ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n🔍 问题诊断结果:" -ForegroundColor Yellow
Write-Host "✅ 依赖包完整" -ForegroundColor Green
Write-Host "✅ 环境变量正确" -ForegroundColor Green
Write-Host "❌ 端口问题 - 后端仍在8080运行" -ForegroundColor Red
Write-Host "❌ 缺失依赖 - node-cron" -ForegroundColor Red
Write-Host "❌ 重启次数过多 - 285次" -ForegroundColor Red

Write-Host "`n🔧 最终修复方案:" -ForegroundColor White
Write-Host "请在服务器上执行以下命令:" -ForegroundColor Gray

Write-Host "`n1. 安装缺失的依赖:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   npm install node-cron" -ForegroundColor Gray

Write-Host "`n2. 拉取最新代码:" -ForegroundColor Cyan
Write-Host "   git pull origin main" -ForegroundColor Gray

Write-Host "`n3. 完全停止所有服务:" -ForegroundColor Cyan
Write-Host "   pm2 delete all" -ForegroundColor Gray
Write-Host "   pm2 kill" -ForegroundColor Gray

Write-Host "`n4. 重新启动PM2:" -ForegroundColor Cyan
Write-Host "   pm2 start server.js --name deep360-backend" -ForegroundColor Gray
Write-Host "   pm2 start webhook-server.js --name deep360-webhook" -ForegroundColor Gray

Write-Host "`n5. 检查端口状态:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`n6. 测试健康检查:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n7. 检查服务状态:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   pm2 logs deep360-backend --lines 5" -ForegroundColor Gray

Write-Host "`n8. 如果还有问题，强制重启:" -ForegroundColor Cyan
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray

Write-Host "`n📊 预期结果:" -ForegroundColor White
Write-Host "✅ 后端在端口7788运行" -ForegroundColor Green
Write-Host "✅ 健康检查成功" -ForegroundColor Green
Write-Host "✅ 无错误日志" -ForegroundColor Green
Write-Host "✅ 服务稳定运行" -ForegroundColor Green

Write-Host "`n🎯 执行修复命令并告诉我结果！" -ForegroundColor Green
