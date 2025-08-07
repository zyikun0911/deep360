# Deep360 Redis Connection Fix
Write-Host "=== Deep360 Redis Connection Fix ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n🔍 问题诊断:" -ForegroundColor Yellow
Write-Host "✅ 数据库连接已修复" -ForegroundColor Green
Write-Host "❌ Redis 连接失败 - connect ECONNREFUSED 127.0.0.1:6379" -ForegroundColor Red

Write-Host "`n🔧 修复方案:" -ForegroundColor White
Write-Host "请在服务器上执行以下命令:" -ForegroundColor Gray

Write-Host "`n1. 检查Redis服务状态:" -ForegroundColor Cyan
Write-Host "   systemctl status redis" -ForegroundColor Gray
Write-Host "   systemctl status redis-server" -ForegroundColor Gray

Write-Host "`n2. 启动Redis服务:" -ForegroundColor Cyan
Write-Host "   systemctl start redis" -ForegroundColor Gray
Write-Host "   systemctl enable redis" -ForegroundColor Gray

Write-Host "`n3. 如果Redis未安装，安装Redis:" -ForegroundColor Cyan
Write-Host "   apt update" -ForegroundColor Gray
Write-Host "   apt install redis-server -y" -ForegroundColor Gray
Write-Host "   systemctl start redis-server" -ForegroundColor Gray
Write-Host "   systemctl enable redis-server" -ForegroundColor Gray

Write-Host "`n4. 检查Redis端口:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep 6379" -ForegroundColor Gray
Write-Host "   netstat -tlnp | grep 6379" -ForegroundColor Gray

Write-Host "`n5. 测试Redis连接:" -ForegroundColor Cyan
Write-Host "   redis-cli ping" -ForegroundColor Gray

Write-Host "`n6. 重启后端服务:" -ForegroundColor Cyan
Write-Host "   pm2 restart deep360-backend" -ForegroundColor Gray

Write-Host "`n7. 检查服务状态:" -ForegroundColor Cyan
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   pm2 logs deep360-backend --lines 5" -ForegroundColor Gray

Write-Host "`n8. 检查端口监听:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray

Write-Host "`n9. 测试健康检查:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray

Write-Host "`n📊 预期结果:" -ForegroundColor White
Write-Host "✅ Redis 服务正常运行" -ForegroundColor Green
Write-Host "✅ 后端服务成功启动" -ForegroundColor Green
Write-Host "✅ 健康检查返回成功" -ForegroundColor Green
Write-Host "✅ 端口7788正常监听" -ForegroundColor Green

Write-Host "`n🎯 请执行修复命令并告诉我结果！" -ForegroundColor Green
