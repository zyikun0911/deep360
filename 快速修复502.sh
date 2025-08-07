#!/bin/bash

echo "🔧 快速修复 502 错误"
echo "===================="

cd /opt/messenger360

echo ""
echo "🛑 1. 停止所有服务..."
pm2 stop all
pm2 delete all

echo ""
echo "�� 2. 安装缺失的依赖..."
npm install whatsapp-web.js telegraf puppeteer

echo ""
echo "�� 3. 临时禁用有问题的路由..."
# 备份server.js
cp server.js server.js.backup

# 注释掉有问题的路由
sed -i 's|app.use.*autoRegistration.*|// app.use.*autoRegistration.*|g' server.js
sed -i 's|app.use.*massMessaging.*|// app.use.*massMessaging.*|g' server.js

echo ""
echo "🚀 4. 启动服务..."
pm2 start server.js --name deep360-backend

echo ""
echo "⏳ 5. 等待服务启动..."
sleep 10

echo ""
echo "🔍 6. 检查服务状态..."
pm2 status

echo ""
echo "📋 7. 检查服务日志..."
pm2 logs deep360-backend --lines 5

echo ""
echo "🌐 8. 测试API接口..."
curl -s http://localhost:7788/health

echo ""
echo "🖥️ 9. 测试前端访问..."
curl -s -I http://localhost:7788/ | head -5

echo ""
echo "�� 10. 保存PM2配置..."
pm2 save

echo ""
echo "============================"
echo "🔧 修复完成！"
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
