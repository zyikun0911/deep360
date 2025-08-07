# Deep360 System Check
Write-Host "=== Deep360 System Check ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n🔍 全面系统诊断命令:" -ForegroundColor Yellow

Write-Host "`n请在服务器上执行以下命令:" -ForegroundColor White

Write-Host "`n1. 基础检查:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   pwd" -ForegroundColor Gray
Write-Host "   ls -la" -ForegroundColor Gray

Write-Host "`n2. 依赖检查:" -ForegroundColor Cyan
Write-Host "   npm list --depth=0" -ForegroundColor Gray
Write-Host "   npm audit" -ForegroundColor Gray

Write-Host "`n3. 环境变量检查:" -ForegroundColor Cyan
Write-Host "   ls -la .env*" -ForegroundColor Gray
Write-Host "   cat .env" -ForegroundColor Gray

Write-Host "`n4. 服务状态检查:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   pm2 list" -ForegroundColor Gray

Write-Host "`n5. 端口检查:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray
Write-Host "   netstat -tlnp | grep -E ':(7788|8080|3000)'" -ForegroundColor Gray

Write-Host "`n6. 日志检查:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 10" -ForegroundColor Gray
Write-Host "   pm2 logs deep360-webhook --lines 5" -ForegroundColor Gray

Write-Host "`n7. 健康检查:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray
Write-Host "   curl -f http://localhost:8080/health" -ForegroundColor Gray

Write-Host "`n8. 系统资源检查:" -ForegroundColor Cyan
Write-Host "   df -h" -ForegroundColor Gray
Write-Host "   free -h" -ForegroundColor Gray
Write-Host "   uptime" -ForegroundColor Gray

Write-Host "`n9. 数据库检查:" -ForegroundColor Cyan
Write-Host "   systemctl status mongodb" -ForegroundColor Gray
Write-Host "   systemctl status redis" -ForegroundColor Gray

Write-Host "`n10. Git状态检查:" -ForegroundColor Cyan
Write-Host "    git status" -ForegroundColor Gray
Write-Host "    git log --oneline -3" -ForegroundColor Gray

Write-Host "`n🔧 快速修复命令:" -ForegroundColor White

Write-Host "`n修复1 - 重新安装依赖:" -ForegroundColor Cyan
Write-Host "   rm -rf node_modules package-lock.json" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray

Write-Host "`n修复2 - 配置环境变量:" -ForegroundColor Cyan
Write-Host "   echo 'PORT=7788' > .env" -ForegroundColor Gray
Write-Host "   echo 'NODE_ENV=production' >> .env" -ForegroundColor Gray

Write-Host "`n修复3 - 重启服务:" -ForegroundColor Cyan
Write-Host "   pm2 delete all" -ForegroundColor Gray
Write-Host "   pm2 start server.js --name deep360-backend" -ForegroundColor Gray
Write-Host "   pm2 start webhook-server.js --name deep360-webhook" -ForegroundColor Gray

Write-Host "`n修复4 - 修复权限:" -ForegroundColor Cyan
Write-Host "   chown -R root:root /opt/messenger360" -ForegroundColor Gray
Write-Host "   chmod -R 755 /opt/messenger360" -ForegroundColor Gray

Write-Host "`n修复5 - 重启系统服务:" -ForegroundColor Cyan
Write-Host "   systemctl restart mongodb" -ForegroundColor Gray
Write-Host "   systemctl restart redis" -ForegroundColor Gray
Write-Host "   systemctl restart nginx" -ForegroundColor Gray

Write-Host "`n📊 预期结果:" -ForegroundColor White
Write-Host "✅ 所有依赖已安装" -ForegroundColor Green
Write-Host "✅ 环境变量正确" -ForegroundColor Green
Write-Host "✅ 后端在端口7788运行" -ForegroundColor Green
Write-Host "✅ 健康检查成功" -ForegroundColor Green
Write-Host "✅ 数据库连接正常" -ForegroundColor Green

Write-Host "`n🎯 请执行检查命令并告诉我结果！" -ForegroundColor Green
