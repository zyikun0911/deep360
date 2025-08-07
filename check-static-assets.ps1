# 检查远程服务器上的静态资源访问
Write-Host "=== 检查远程服务器静态资源访问 ===" -ForegroundColor Cyan

Write-Host "`n1. 检查 JavaScript 文件访问:" -ForegroundColor Yellow
Write-Host "   curl -f http://74.208.61.148:7788/assets/index-ef954fcf.js" -ForegroundColor Gray
Write-Host "   curl -f http://74.208.61.148:7788/assets/vendor-cd5a2cc5.js" -ForegroundColor Gray
Write-Host "   curl -f http://74.208.61.148:7788/assets/antd-76a9e069.js" -ForegroundColor Gray

Write-Host "`n2. 检查 CSS 文件访问:" -ForegroundColor Yellow
Write-Host "   curl -f http://74.208.61.148:7788/assets/index-6f7ef964.css" -ForegroundColor Gray

Write-Host "`n3. 检查服务器静态文件配置:" -ForegroundColor Yellow
Write-Host "   cd /opt/messenger360" -ForegroundColor Gray
Write-Host "   grep -n 'express.static' server.js" -ForegroundColor Gray
Write-Host "   grep -n 'app.get.*\*' server.js" -ForegroundColor Gray

Write-Host "`n4. 检查前端构建文件权限:" -ForegroundColor Yellow
Write-Host "   ls -la /opt/messenger360/frontend/build/assets/" -ForegroundColor Gray
Write-Host "   ls -la /opt/messenger360/frontend/build/" -ForegroundColor Gray

Write-Host "`n5. 检查服务器日志中的静态文件请求:" -ForegroundColor Yellow
Write-Host "   pm2 logs deep360-backend --lines 20" -ForegroundColor Gray

Write-Host "`n6. 浏览器调试步骤:" -ForegroundColor Yellow
Write-Host "   1. 打开浏览器开发者工具 (F12)" -ForegroundColor Gray
Write-Host "   2. 切换到 Network 标签页" -ForegroundColor Gray
Write-Host "   3. 刷新页面 http://74.208.61.148:7788/" -ForegroundColor Gray
Write-Host "   4. 查看是否有 404 错误的资源请求" -ForegroundColor Gray
Write-Host "   5. 切换到 Console 标签页查看 JavaScript 错误" -ForegroundColor Gray

Write-Host "`n7. 可能的解决方案:" -ForegroundColor Yellow
Write-Host "   如果静态资源返回 404，可能需要修复 server.js 中的静态文件服务配置" -ForegroundColor Gray
Write-Host "   如果静态资源返回 200 但页面空白，可能是 JavaScript 执行错误" -ForegroundColor Gray
Write-Host "   如果静态资源无法加载，可能是路径或 MIME 类型问题" -ForegroundColor Gray

Write-Host "`n请执行上述命令并告诉我结果，特别是:" -ForegroundColor Green
Write-Host "   - JavaScript 文件的 curl 响应状态" -ForegroundColor Gray
Write-Host "   - 浏览器控制台的错误信息" -ForegroundColor Gray
Write-Host "   - Network 标签页的请求状态" -ForegroundColor Gray
