# Deep360 Correct Access URLs
Write-Host "=== Deep360 Correct Access URLs ===" -ForegroundColor Green
Write-Host "Time: $(Get-Date)" -ForegroundColor Cyan

Write-Host "`n🔍 问题分析:" -ForegroundColor Yellow
Write-Host "❌ 您访问的API接口返回 '接口不存在'" -ForegroundColor Red
Write-Host "✅ 这说明服务正在运行，但访问路径不正确" -ForegroundColor Green

Write-Host "`n🌐 正确的访问地址和路径:" -ForegroundColor White

Write-Host "`n1. 主页面 (根路径):" -ForegroundColor Cyan
Write-Host "   http://[服务器IP]:7788/" -ForegroundColor Gray
Write-Host "   http://[服务器IP]:7788" -ForegroundColor Gray

Write-Host "`n2. 健康检查:" -ForegroundColor Cyan
Write-Host "   http://[服务器IP]:7788/health" -ForegroundColor Gray

Write-Host "`n3. 管理后台:" -ForegroundColor Cyan
Write-Host "   http://[服务器IP]:7788/dashboard" -ForegroundColor Gray

Write-Host "`n4. API文档:" -ForegroundColor Cyan
Write-Host "   http://[服务器IP]:7788/api-docs" -ForegroundColor Gray

Write-Host "`n5. 前端应用:" -ForegroundColor Cyan
Write-Host "   http://[服务器IP]:7788/frontend" -ForegroundColor Gray

Write-Host "`n6. 静态文件:" -ForegroundColor Cyan
Write-Host "   http://[服务器IP]:7788/uploads" -ForegroundColor Gray

Write-Host "`n🔧 测试命令 (请在服务器上执行):" -ForegroundColor White
Write-Host "   curl -v http://localhost:7788/" -ForegroundColor Gray
Write-Host "   curl -v http://localhost:7788/health" -ForegroundColor Gray
Write-Host "   curl -v http://localhost:7788/dashboard" -ForegroundColor Gray

Write-Host "`n📊 常见错误路径:" -ForegroundColor Yellow
Write-Host "   ❌ http://[IP]:7788/api/health" -ForegroundColor Red
Write-Host "   ❌ http://[IP]:7788/api/dashboard" -ForegroundColor Red
Write-Host "   ❌ http://[IP]:7788/api/" -ForegroundColor Red

Write-Host "`n✅ 正确路径:" -ForegroundColor Green
Write-Host "   ✅ http://[IP]:7788/health" -ForegroundColor Green
Write-Host "   ✅ http://[IP]:7788/dashboard" -ForegroundColor Green
Write-Host "   ✅ http://[IP]:7788/" -ForegroundColor Green

Write-Host "`n🎯 请尝试访问根路径: http://[服务器IP]:7788/" -ForegroundColor Green
