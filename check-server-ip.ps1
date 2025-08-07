# Deep360 Server IP Check
Write-Host "=== Deep360 Server IP Check ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n🔍 请在服务器上执行以下命令来获取正确的IP地址:" -ForegroundColor Yellow

Write-Host "`n1. 检查公网IP:" -ForegroundColor Cyan
Write-Host "   curl -s ifconfig.me" -ForegroundColor Gray
Write-Host "   curl -s ipinfo.io/ip" -ForegroundColor Gray
Write-Host "   wget -qO- ifconfig.co" -ForegroundColor Gray

Write-Host "`n2. 检查所有网络接口:" -ForegroundColor Cyan
Write-Host "   ip addr show" -ForegroundColor Gray
Write-Host "   ifconfig" -ForegroundColor Gray

Write-Host "`n3. 检查监听端口:" -ForegroundColor Cyan
Write-Host "   ss -tlnp | grep node" -ForegroundColor Gray
Write-Host "   netstat -tlnp | grep -E ':(7788|8080)'" -ForegroundColor Gray

Write-Host "`n4. 检查防火墙状态:" -ForegroundColor Cyan
Write-Host "   ufw status" -ForegroundColor Gray
Write-Host "   iptables -L" -ForegroundColor Gray

Write-Host "`n5. 测试本地访问:" -ForegroundColor Cyan
Write-Host "   curl -f http://localhost:7788/health" -ForegroundColor Gray
Write-Host "   curl -f http://127.0.0.1:7788/health" -ForegroundColor Gray

Write-Host "`n📊 获取到正确IP后，访问地址格式:" -ForegroundColor White
Write-Host "   http://[正确IP]:7788" -ForegroundColor Green
Write-Host "   http://[正确IP]:7788/dashboard" -ForegroundColor Green
Write-Host "   http://[正确IP]:7788/health" -ForegroundColor Green

Write-Host "`n🎯 请执行这些命令并告诉我正确的IP地址！" -ForegroundColor Green
