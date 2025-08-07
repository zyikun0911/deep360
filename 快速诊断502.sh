#!/bin/bash

echo "🔍 快速诊断 502 错误"
echo "===================="

cd /opt/messenger360

echo ""
echo "📊 1. 检查服务状态..."
pm2 status

echo ""
echo "�� 2. 检查端口占用..."
ss -tlnp | grep :7788

echo ""
echo "📋 3. 检查服务日志..."
pm2 logs deep360-backend --lines 10

echo ""
echo "🌐 4. 测试API接口..."
curl -s http://localhost:7788/health || echo "API测试失败"

echo ""
echo "🖥️ 5. 测试前端访问..."
curl -s -I http://localhost:7788/ | head -5 || echo "前端访问失败"

echo ""
echo "��️ 6. 检查数据库连接..."
if command -v mongosh &> /dev/null; then
    mongosh --eval "db.runCommand('ping')" --quiet || echo "数据库连接失败"
else
    echo "mongosh 命令不存在"
fi

echo ""
echo "🔴 7. 检查Redis连接..."
if command -v redis-cli &> /dev/null; then
    redis-cli ping || echo "Redis连接失败"
else
    echo "redis-cli 命令不存在"
fi

echo ""
echo "�� 8. 检查前端构建文件..."
if [ -d "frontend/build" ]; then
    echo "✅ 前端构建文件存在"
    ls -la frontend/build/ | head -5
else
    echo "❌ 前端构建文件不存在"
fi

echo ""
echo "🔧 9. 重启服务..."
pm2 restart deep360-backend

echo ""
echo "⏳ 10. 等待服务启动..."
sleep 5

echo ""
echo "🔍 11. 最终检查..."
pm2 status

echo ""
echo "🌐 12. 最终API测试..."
curl -s http://localhost:7788/health

echo ""
echo "============================"
echo "🔍 诊断完成！"
echo ""
echo "如果仍有502错误，请检查："
echo "1. 防火墙设置"
echo "2. Nginx配置"
echo "3. 服务器资源使用情况"
