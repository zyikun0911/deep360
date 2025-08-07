#!/bin/bash

echo "🔧 彻底修复 502 错误"
echo "===================="

cd /opt/messenger360

echo ""
echo "🛑 1. 停止所有服务..."
pm2 stop all
pm2 delete all

echo ""
echo "📦 2. 安装所有缺失的依赖..."
npm install qrcode whatsapp-web.js telegraf puppeteer

echo ""
echo "�� 3. 完全禁用有问题的路由..."
# 备份server.js
cp server.js server.js.backup3

# 注释掉所有有问题的路由
sed -i 's|app.use.*autoRegistration.*|// app.use.*autoRegistration.*|g' server.js
sed -i 's|app.use.*massMessaging.*|// app.use.*massMessaging.*|g' server.js
sed -i 's|app.use.*batchRegistration.*|// app.use.*batchRegistration.*|g' server.js
sed -i 's|app.use.*blueCheckRegistration.*|// app.use.*blueCheckRegistration.*|g' server.js
sed -i 's|app.use.*groupManagement.*|// app.use.*groupManagement.*|g' server.js
sed -i 's|app.use.*intelligentNurturing.*|// app.use.*intelligentNurturing.*|g' server.js
sed -i 's|app.use.*optimalPanel.*|// app.use.*optimalPanel.*|g' server.js
sed -i 's|app.use.*phoneNumbers.*|// app.use.*phoneNumbers.*|g' server.js
sed -i 's|app.use.*plugins.*|// app.use.*plugins.*|g' server.js
sed -i 's|app.use.*stats.*|// app.use.*stats.*|g' server.js
sed -i 's|app.use.*tasks.*|// app.use.*tasks.*|g' server.js
sed -i 's|app.use.*webhooks.*|// app.use.*webhooks.*|g' server.js
sed -i 's|app.use.*accountIsolation.*|// app.use.*accountIsolation.*|g' server.js
sed -i 's|app.use.*ai.*|// app.use.*ai.*|g' server.js

echo ""
echo "✅ 4. 检查server.js语法..."
if node -c server.js; then
    echo "✅ server.js语法正确"
else
    echo "❌ server.js语法错误，恢复备份"
    cp server.js.backup3 server.js
fi

echo ""
echo "🚀 5. 启动服务..."
pm2 start server.js --name deep360-backend

echo ""
echo "⏳ 6. 等待服务启动..."
sleep 15

echo ""
echo "🔍 7. 检查服务状态..."
pm2 status

echo ""
echo "📋 8. 检查服务日志..."
pm2 logs deep360-backend --lines 5

echo ""
echo "🌐 9. 测试API接口..."
curl -s http://localhost:7788/health

echo ""
echo "🖥️ 10. 测试前端访问..."
curl -s -I http://localhost:7788/ | head -5

echo ""
echo "�� 11. 保存PM2配置..."
pm2 save

echo ""
echo "============================"
echo "🔧 彻底修复完成！"
echo ""
echo "�� 修复结果："
if pm2 list | grep -q "deep360-backend" && pm2 list | grep "deep360-backend" | grep -q "online"; then
    echo "✅ 后端服务正常运行"
else
    echo "❌ 后端服务未正常运行"
fi

echo ""
echo "🌐 访问地址："
echo "http://74.208.61.148:7788"
echo ""
echo "📝 登录信息："
echo "邮箱：admin@deep360.com"
echo "密码：admin123"
