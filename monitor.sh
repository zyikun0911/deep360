#!/bin/bash

echo "🔍 Deep360 系统监控"
echo "=================="

# 检查服务状态
echo "📊 服务状态："
pm2 status

# 检查内存使用
echo ""
echo "💾 内存使用："
free -h

# 检查磁盘空间
echo ""
echo "💿 磁盘空间："
df -h /opt/messenger360

# 检查日志
echo ""
echo "📝 最新日志："
pm2 logs --lines 10

