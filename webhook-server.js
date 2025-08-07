const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');

const WEBHOOK_SECRET = 'deep360-secret-1234';
const LOG_FILE = '/var/log/deep360-webhook.log';

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
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
                
                log(`收到 Webhook 请求: ${eventType}`);
                
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
                            log(`部署失败: ${error.message}`);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: '部署失败', details: error.message }));
                        } else {
                            log('部署成功');
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'success', message: '部署完成' }));
                        }
                    });
                } else {
                    log(`忽略事件类型: ${eventType}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ignored', message: '事件类型被忽略' }));
                }
            } catch (error) {
                log(`处理 Webhook 时出错: ${error.message}`);
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
    log(`Webhook 服务器启动在端口 ${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    log('收到 SIGTERM，关闭服务器');
    server.close(() => {
        log('服务器已关闭');
        process.exit(0);
    });
});
