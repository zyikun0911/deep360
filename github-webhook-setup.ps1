# Deep360 GitHub Webhook 自动同步设置
Write-Host "🚀 设置 GitHub Webhook 自动同步..." -ForegroundColor Green

$SERVER_IP = "74.208.61.148"
$GITHUB_REPO = "zyikun0911/deep360"
$WEBHOOK_SECRET = "deep360-webhook-secret-$(Get-Random -Minimum 1000 -Maximum 9999)"

Write-Host "📋 配置信息:" -ForegroundColor Yellow
Write-Host "服务器 IP: $SERVER_IP" -ForegroundColor White
Write-Host "GitHub 仓库: $GITHUB_REPO" -ForegroundColor White
Write-Host "Webhook 密钥: $WEBHOOK_SECRET" -ForegroundColor White

# 1. 创建服务器端 Webhook 接收器
Write-Host ""
Write-Host "📦 创建 Webhook 接收器..." -ForegroundColor Yellow

$WEBHOOK_SCRIPT = @"
#!/bin/bash
set -e

# Deep360 GitHub Webhook 接收器
WEBHOOK_SECRET="$WEBHOOK_SECRET"
SERVER_PATH="/opt/messenger360/"
LOG_FILE="/var/log/deep360-webhook.log"

echo "\$(date): Webhook 触发" >> \$LOG_FILE

# 验证签名
SIGNATURE=\$HTTP_X_HUB_SIGNATURE_256
PAYLOAD=\$(cat)

if [ -z "\$SIGNATURE" ]; then
    echo "\$(date): 缺少签名" >> \$LOG_FILE
    exit 1
fi

# 计算签名
EXPECTED_SIGNATURE="sha256=\$(echo -n "\$PAYLOAD" | openssl dgst -sha256 -hmac "\$WEBHOOK_SECRET" | cut -d' ' -f2)"

if [ "\$SIGNATURE" != "\$EXPECTED_SIGNATURE" ]; then
    echo "\$(date): 签名验证失败" >> \$LOG_FILE
    exit 1
fi

# 解析事件类型
EVENT_TYPE=\$HTTP_X_GITHUB_EVENT

if [ "\$EVENT_TYPE" = "push" ]; then
    echo "\$(date): 检测到代码推送" >> \$LOG_FILE
    
    # 停止服务
    echo "\$(date): 停止现有服务..." >> \$LOG_FILE
    pm2 stop deep360-api || true
    
    # 备份当前代码
    BACKUP_DIR="/root/backup_\$(date +%Y%m%d_%H%M%S)"
    mkdir -p \$BACKUP_DIR
    if [ -d "\$SERVER_PATH" ]; then
        cp -r \$SERVER_PATH \$BACKUP_DIR/
    fi
    
    # 拉取最新代码
    echo "\$(date): 拉取最新代码..." >> \$LOG_FILE
    cd \$SERVER_PATH
    git fetch origin
    git reset --hard origin/main
    
    # 安装依赖
    echo "\$(date): 安装依赖..." >> \$LOG_FILE
    npm install --production
    
    # 构建前端
    echo "\$(date): 构建前端..." >> \$LOG_FILE
    cd frontend
    npm install
    npm run build
    cd ..
    
    # 启动服务
    echo "\$(date): 启动服务..." >> \$LOG_FILE
    pm2 start server.js --name deep360-api
    pm2 save
    
    # 健康检查
    echo "\$(date): 健康检查..." >> \$LOG_FILE
    sleep 5
    if curl -f http://localhost:7788/health; then
        echo "\$(date): 部署成功" >> \$LOG_FILE
        echo "HTTP/1.1 200 OK"
        echo "Content-Type: application/json"
        echo ""
        echo '{"status": "success", "message": "部署完成"}'
    else
        echo "\$(date): 健康检查失败" >> \$LOG_FILE
        echo "HTTP/1.1 500 Internal Server Error"
        echo "Content-Type: application/json"
        echo ""
        echo '{"status": "error", "message": "健康检查失败"}'
    fi
else
    echo "\$(date): 忽略事件类型: \$EVENT_TYPE" >> \$LOG_FILE
    echo "HTTP/1.1 200 OK"
    echo "Content-Type: application/json"
    echo ""
    echo '{"status": "ignored", "message": "事件类型被忽略"}'
fi
"@

$WEBHOOK_SCRIPT | Out-File -FilePath "webhook-receiver.sh" -Encoding UTF8

# 2. 创建 Nginx 配置
Write-Host ""
Write-Host "🌐 创建 Nginx 配置..." -ForegroundColor Yellow

$NGINX_CONFIG = @"
# Deep360 Webhook 配置
server {
    listen 80;
    server_name $SERVER_IP;
    
    # 前端静态文件
    location / {
        root /opt/messenger360/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:7788/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # WebSocket 代理
    location /socket.io/ {
        proxy_pass http://localhost:7788;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
    
    # GitHub Webhook 接收器
    location /webhook {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
"@

$NGINX_CONFIG | Out-File -FilePath "nginx-deep360.conf" -Encoding UTF8

# 3. 创建 Webhook 服务器
Write-Host ""
Write-Host "🔧 创建 Webhook 服务器..." -ForegroundColor Yellow

$WEBHOOK_SERVER = @"
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');

const WEBHOOK_SECRET = '$WEBHOOK_SECRET';
const LOG_FILE = '/var/log/deep360-webhook.log';

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = \`\${timestamp}: \${message}\n\`;
    fs.appendFileSync(LOG_FILE, logMessage);
    console.log(logMessage.trim());
}

function verifySignature(payload, signature) {
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const signature = req.headers['x-hub-signature-256'];
                const eventType = req.headers['x-github-event'];
                
                log(\`收到 Webhook 请求: \${eventType}\`);
                
                if (!signature || !verifySignature(body, signature)) {
                    log('签名验证失败');
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: '签名验证失败' }));
                    return;
                }
                
                if (eventType === 'push') {
                    log('检测到代码推送，开始部署...');
                    
                    // 执行部署脚本
                    exec('bash /opt/messenger360/webhook-receiver.sh', (error, stdout, stderr) => {
                        if (error) {
                            log(\`部署失败: \${error.message}\`);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '部署失败', details: error.message }));
                        } else {
                            log('部署成功');
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'success', message: '部署完成' }));
                        }
                    });
                } else {
                    log(\`忽略事件类型: \${eventType}\`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ignored', message: '事件类型被忽略' }));
                }
            } catch (error) {
                log(\`处理 Webhook 时出错: \${error.message}\`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '处理失败', details: error.message }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

const PORT = 8080;
server.listen(PORT, () => {
    log(\`Webhook 服务器启动在端口 \${PORT}\`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    log('收到 SIGTERM，关闭服务器');
    server.close(() => {
        log('服务器已关闭');
        process.exit(0);
    });
});
"@

$WEBHOOK_SERVER | Out-File -FilePath "webhook-server.js" -Encoding UTF8

# 4. 创建 PM2 配置
Write-Host ""
Write-Host "📦 创建 PM2 配置..." -ForegroundColor Yellow

$PM2_CONFIG = @"
module.exports = {
  apps: [
    {
      name: 'deep360-api',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 7788
      }
    },
    {
      name: 'deep360-webhook',
      script: 'webhook-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    }
  ]
};
"@

$PM2_CONFIG | Out-File -FilePath "ecosystem.config.js" -Encoding UTF8

Write-Host ""
Write-Host "✅ Webhook 配置创建完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步操作:" -ForegroundColor Yellow
Write-Host "1. 上传配置文件到服务器" -ForegroundColor White
Write-Host "2. 在 GitHub 仓库设置 Webhook" -ForegroundColor White
Write-Host "3. 测试自动同步功能" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Webhook URL: http://$SERVER_IP/webhook" -ForegroundColor Cyan
Write-Host "🔑 Webhook 密钥: $WEBHOOK_SECRET" -ForegroundColor Cyan
