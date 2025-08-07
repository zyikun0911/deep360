# Deep360 Comprehensive System Check
Write-Host "=== Deep360 Comprehensive System Check ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n🔍 全面系统诊断开始..." -ForegroundColor Yellow

Write-Host "`n📋 检查项目清单:" -ForegroundColor White
Write-Host "1. 依赖包完整性检查" -ForegroundColor Gray
Write-Host "2. 环境变量配置检查" -ForegroundColor Gray
Write-Host "3. 端口监听状态检查" -ForegroundColor Gray
Write-Host "4. 服务运行状态检查" -ForegroundColor Gray
Write-Host "5. 数据库连接检查" -ForegroundColor Gray
Write-Host "6. 日志错误分析" -ForegroundColor Gray
Write-Host "7. 文件权限检查" -ForegroundColor Gray
Write-Host "8. 网络连接检查" -ForegroundColor Gray

Write-Host "`n🚀 服务器执行命令:" -ForegroundColor White
Write-Host "请在服务器上执行以下命令进行完整诊断:" -ForegroundColor Gray

Write-Host "`n1. 进入项目目录:" -ForegroundColor Cyan
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray

Write-Host "`n2. 检查所有依赖包:" -ForegroundColor Cyan
Write-Host "   npm list --depth=0" -ForegroundColor Gray

Write-Host "`n3. 检查缺失的依赖:" -ForegroundColor Cyan
Write-Host "   npm audit" -ForegroundColor Gray

Write-Host "`n4. 检查环境变量文件:" -ForegroundColor Cyan
Write-Host "   ls -la .env*" -ForegroundColor Gray
Write-Host "   cat .env" -ForegroundColor Gray

Write-Host "`n5. 检查PM2进程状态:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   pm2 list" -ForegroundColor Gray

Write-Host "`n6. 检查端口监听状态:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray
Write-Host "   netstat -tlnp | grep -E ':(7788|8080|3000)'" -ForegroundColor Gray

Write-Host "`n7. 检查服务日志:" -ForegroundColor Cyan
Write-Host "   pm2 logs deep360-backend --lines 20" -ForegroundColor Gray
Write-Host "   pm2 logs deep360-webhook --lines 10" -ForegroundColor Gray

Write-Host "`n8. 检查文件权限:" -ForegroundColor Cyan
Write-Host "   ls -la server.js" -ForegroundColor Gray
Write-Host "   ls -la package.json" -ForegroundColor Gray

Write-Host "`n9. 检查数据库连接:" -ForegroundColor Cyan
Write-Host "   systemctl status mongodb" -ForegroundColor Gray
Write-Host "   systemctl status redis" -ForegroundColor Gray

Write-Host "`n10. 检查网络连接:" -ForegroundColor Cyan
Write-Host "    curl -f http://localhost:7788/health" -ForegroundColor Gray
Write-Host "    curl -f http://localhost:8080/health" -ForegroundColor Gray

Write-Host "`n11. 检查Git状态:" -ForegroundColor Cyan
Write-Host "    git status" -ForegroundColor Gray
Write-Host "    git log --oneline -5" -ForegroundColor Gray

Write-Host "`n12. 检查磁盘空间:" -ForegroundColor Cyan
Write-Host "    df -h" -ForegroundColor Gray
Write-Host "    du -sh /opt/messenger360" -ForegroundColor Gray

Write-Host "`n13. 检查内存使用:" -ForegroundColor Cyan
Write-Host "    free -h" -ForegroundColor Gray
Write-Host "    top -p \$(pgrep node) -n 1" -ForegroundColor Gray

Write-Host "`n14. 检查系统负载:" -ForegroundColor Cyan
Write-Host "    uptime" -ForegroundColor Gray
Write-Host "    ps aux | grep node" -ForegroundColor Gray

Write-Host "`n15. 检查Nginx配置:" -ForegroundColor Cyan
Write-Host "    systemctl status nginx" -ForegroundColor Gray
Write-Host "    nginx -t" -ForegroundColor Gray

Write-Host "`n🔧 自动修复建议:" -ForegroundColor White
Write-Host "如果发现问题，请执行以下修复命令:" -ForegroundColor Gray

Write-Host "`n修复1 - 重新安装所有依赖:" -ForegroundColor Cyan
Write-Host "   rm -rf node_modules package-lock.json" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray

Write-Host "`n修复2 - 重新配置环境变量:" -ForegroundColor Cyan
Write-Host "   echo 'PORT=7788' > .env" -ForegroundColor Gray
Write-Host "   echo 'NODE_ENV=production' >> .env" -ForegroundColor Gray

Write-Host "`n修复3 - 重启所有服务:" -ForegroundColor Cyan
Write-Host "   pm2 delete all" -ForegroundColor Gray
Write-Host "   pm2 start server.js --name deep360-backend" -ForegroundColor Gray
Write-Host "   pm2 start webhook-server.js --name deep360-webhook" -ForegroundColor Gray

Write-Host "`n修复4 - 检查并修复权限:" -ForegroundColor Cyan
Write-Host "   chown -R root:root /opt/messenger360" -ForegroundColor Gray
Write-Host "   chmod -R 755 /opt/messenger360" -ForegroundColor Gray

Write-Host "`n修复5 - 重启系统服务:" -ForegroundColor Cyan
Write-Host "   systemctl restart mongodb" -ForegroundColor Gray
Write-Host "   systemctl restart redis" -ForegroundColor Gray
Write-Host "   systemctl restart nginx" -ForegroundColor Gray

Write-Host "`n📊 预期结果:" -ForegroundColor White
Write-Host "✅ 所有依赖包已安装" -ForegroundColor Green
Write-Host "✅ 环境变量正确配置" -ForegroundColor Green
Write-Host "✅ 后端服务在端口7788运行" -ForegroundColor Green
Write-Host "✅ 健康检查返回成功" -ForegroundColor Green
Write-Host "✅ 数据库连接正常" -ForegroundColor Green
Write-Host "✅ 日志无错误信息" -ForegroundColor Green

Write-Host "`n🎯 请执行上述检查命令，然后告诉我结果！" -ForegroundColor Green
Write-Host "我将根据检查结果提供具体的修复方案。" -ForegroundColor Cyan
