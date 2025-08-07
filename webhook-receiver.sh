#!/bin/bash
set -e

# Deep360 GitHub Webhook 接收器
WEBHOOK_SECRET="deep360-secret-1234"
SERVER_PATH="/opt/messenger360/"
LOG_FILE="/var/log/deep360-webhook.log"

echo "$(date): Webhook 触发" >> $LOG_FILE

# 验证签名
SIGNATURE=$HTTP_X_HUB_SIGNATURE_256
PAYLOAD=$(cat)

if [ -z "$SIGNATURE" ]; then
    echo "$(date): 缺少签名" >> $LOG_FILE
    exit 1
fi

# 计算签名
EXPECTED_SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)"

if [ "$SIGNATURE" != "$EXPECTED_SIGNATURE" ]; then
    echo "$(date): 签名验证失败" >> $LOG_FILE
    exit 1
fi

# 解析事件类型
EVENT_TYPE=$HTTP_X_GITHUB_EVENT

if [ "$EVENT_TYPE" = "push" ]; then
    echo "$(date): 检测到代码推送" >> $LOG_FILE
    
    # 停止服务
    echo "$(date): 停止现有服务..." >> $LOG_FILE
    pm2 stop deep360-api || true
    
    # 备份当前代码
    BACKUP_DIR="/root/backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p $BACKUP_DIR
    if [ -d "$SERVER_PATH" ]; then
        cp -r $SERVER_PATH $BACKUP_DIR/
    fi
    
    # 拉取最新代码
    echo "$(date): 拉取最新代码..." >> $LOG_FILE
    cd $SERVER_PATH
    git fetch origin
    git reset --hard origin/main
    
    # 安装依赖
    echo "$(date): 安装依赖..." >> $LOG_FILE
    npm install --production
    
    # 构建前端
    echo "$(date): 构建前端..." >> $LOG_FILE
    cd frontend
    npm install
    npm run build
    cd ..
    
    # 启动服务
    echo "$(date): 启动服务..." >> $LOG_FILE
    pm2 start server.js --name deep360-api
    pm2 save
    
    # 健康检查
    echo "$(date): 健康检查..." >> $LOG_FILE
    sleep 5
    if curl -f http://localhost:7788/health; then
        echo "$(date): 部署成功" >> $LOG_FILE
        echo "HTTP/1.1 200 OK"
        echo "Content-Type: application/json"
        echo ""
        echo '{"status": "success", "message": "部署完成"}'
    else
        echo "$(date): 健康检查失败" >> $LOG_FILE
        echo "HTTP/1.1 500 Internal Server Error"
        echo "Content-Type: application/json"
        echo ""
        echo '{"status": "error", "message": "健康检查失败"}'
    fi
else
    echo "$(date): 忽略事件类型: $EVENT_TYPE" >> $LOG_FILE
    echo "HTTP/1.1 200 OK"
    echo "Content-Type: application/json"
    echo ""
    echo '{"status": "ignored", "message": "事件类型被忽略"}'
fi
