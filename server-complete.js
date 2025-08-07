const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 7788;

// 中间件
app.use(helmet({
    contentSecurityPolicy: false,  // 允许加载CDN资源
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend/build')));

// 模拟服务
let whatsappClient = { isConnected: false, isReady: false };
let telegramBot = { isConnected: false };

// 初始化服务
async function initServices() {
    console.log('初始化服务...');
    whatsappClient.isConnected = true;
    whatsappClient.isReady = true;
    telegramBot.isConnected = true;
    console.log('服务初始化完成');
}

// API路由
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Deep360 服务正常运行',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            whatsapp: whatsappClient.isConnected ? 'connected' : 'disconnected',
            telegram: telegramBot.isConnected ? 'connected' : 'disconnected'
        }
    });
});

// WhatsApp API
app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        connected: whatsappClient.isConnected,
        ready: whatsappClient.isReady
    });
});

// Telegram API
app.get('/api/telegram/status', (req, res) => {
    res.json({
        connected: telegramBot.isConnected
    });
});

// 群组API
app.get('/api/groups', (req, res) => {
    res.json({
        groups: [
            { id: 1, name: '测试群组1', platform: 'whatsapp', members: 50 },
            { id: 2, name: '测试群组2', platform: 'telegram', members: 30 },
            { id: 3, name: '客户群组', platform: 'whatsapp', members: 120 },
            { id: 4, name: '技术支持群', platform: 'telegram', members: 45 }
        ]
    });
});

// 统计API
app.get('/api/stats', (req, res) => {
    res.json({
        totalGroups: 4,
        totalMessages: 150,
        activeUsers: 120,
        platforms: {
            whatsapp: { groups: 2, messages: 90 },
            telegram: { groups: 2, messages: 60 }
        },
        recentActivity: {
            messagesSent: 25,
            newGroups: 1,
            activeUsers: 45
        }
    });
});

// 所有其他路由返回前端
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

// 启动服务器
app.listen(PORT, async () => {
    console.log(`🚀 Deep360 服务启动成功 - 端口 ${PORT}`);
    await initServices();
});
