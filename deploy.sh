#!/bin/bash
# Deep360 GitHub Webhook 一键部署脚本

SERVER_IP="74.208.61.148"

echo "🚀 开始部署 Deep360 GitHub Webhook..."

# 1. 上传配置文件
echo "📤 上传配置文件..."
scp -o StrictHostKeyChecking=no webhook-server.js root@$SERVER_IP:/opt/messenger360/
scp -o StrictHostKeyChecking=no webhook-receiver.sh root@$SERVER_IP:/opt/messenger360/
scp -o StrictHostKeyChecking=no nginx-deep360.conf root@$SERVER_IP:/etc/nginx/sites-available/deep360

# 2. 配置服务器
echo "🔧 配置服务器..."
ssh -o StrictHostKeyChecking=no root@$SERVER_IP << 'EOF'
cd /opt/messenger360
chmod +x webhook-receiver.sh
mkdir -p /var/log
touch /var/log/deep360-webhook.log
chmod 666 /var/log/deep360-webhook.log
ln -sf /etc/nginx/sites-available/deep360 /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
pm2 start webhook-server.js --name deep360-webhook
pm2 save
echo "✅ 服务器配置完成"
EOF

echo "✅ 部署完成！"
echo ""
echo "📋 下一步："
echo "1. 访问 https://github.com/zyikun0911/deep360/settings/hooks"
echo "2. 配置 Webhook: http://74.208.61.148/webhook"
echo "3. 测试推送: git push origin main"
