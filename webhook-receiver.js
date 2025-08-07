const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 9000;
const SECRET = 'deep360_webhook_secret_2024';

app.use(express.json());

// 验证签名
function verifySignature(payload, signature) {
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// 处理Webhook
app.post('/webhook', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    console.log('收到GitHub Webhook:', new Date().toISOString());
    
    if (!verifySignature(payload, signature)) {
        console.log('签名验证失败');
        return res.status(401).send('Unauthorized');
    }
    
    console.log('签名验证成功，开始部署...');
    
    // 执行部署脚本
    const deployScript = `
        cd /opt/messenger360
        git pull origin main
        npm install
        cd frontend && npm install && npm run build && cd ..
        pm2 restart deep360-backend
        echo "部署完成: $(date)"
    `;
    
    exec(deployScript, (error, stdout, stderr) => {
        if (error) {
            console.error('部署失败:', error);
            return res.status(500).json({ error: '部署失败' });
        }
        console.log('部署成功:', stdout);
        res.json({ success: true, message: '部署完成' });
    });
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'github-webhook' });
});

app.listen(PORT, () => {
    console.log(`GitHub Webhook 服务器启动在端口 ${PORT}`);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，正在关闭 Webhook 服务器...');
    process.exit(0);
});
