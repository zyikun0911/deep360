const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
const PORT = 9000;
const SECRET = 'deep360_webhook_secret_2024';

app.use(express.json());

app.post('/webhook', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    console.log('收到GitHub Webhook:', new Date().toISOString());
    
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', SECRET)
        .update(payload)
        .digest('hex');
    
    if (signature !== expectedSignature) {
        console.log('签名验证失败');
        return res.status(401).send('Unauthorized');
    }
    
    console.log('签名验证成功，开始部署...');
    
    exec('cd /opt/messenger360 && git pull origin main && pm2 restart deep360-backend', (error, stdout, stderr) => {
        if (error) {
            console.error('部署失败:', error);
            return res.status(500).json({ error: '部署失败' });
        }
        console.log('部署成功:', stdout);
        res.json({ success: true, message: '部署完成' });
    });
});

app.listen(PORT, () => {
    console.log(`GitHub Webhook 服务器启动在端口 ${PORT}`);
});
