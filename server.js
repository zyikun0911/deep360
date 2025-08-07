const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = 7788;

// 中间件配置
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static('frontend/build'));

// 服务状态管理
const services = {
    whatsapp: {
        isConnected: true,
        isReady: true,
        groups: [
            { id: 1, name: '销售群组A', members: 100, type: 'business' },
            { id: 2, name: '销售群组B', members: 80, type: 'business' },
            { id: 3, name: '客服群组', members: 50, type: 'support' },
            { id: 4, name: '技术支持', members: 30, type: 'tech' }
        ],
        messages: [],
        stats: {
            dailyMessages: 150,
            activeUsers: 200,
            successRate: 98
        }
    },
    telegram: {
        isConnected: true,
        groups: [
            { id: 5, name: '公告频道', members: 500, type: 'announcement' },
            { id: 6, name: '用户交流A', members: 300, type: 'community' },
            { id: 7, name: '用户交流B', members: 200, type: 'community' }
        ],
        messages: [],
        stats: {
            dailyMessages: 300,
            activeUsers: 800,
            successRate: 99
        }
    }
};

// API路由
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Deep360 服务正常运行',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        services: {
            whatsapp: services.whatsapp.isConnected ? 'connected' : 'disconnected',
            telegram: services.telegram.isConnected ? 'connected' : 'disconnected'
        }
    });
});

app.get('/api/whatsapp/status', (req, res) => {
    res.json({
        connected: services.whatsapp.isConnected,
        ready: services.whatsapp.isReady,
        groups: services.whatsapp.groups.length,
        messages: services.whatsapp.messages.length,
        stats: services.whatsapp.stats
    });
});

app.post('/api/whatsapp/send', (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    services.whatsapp.messages.push({
        id: Date.now(),
        to,
        message,
        timestamp: new Date().toISOString(),
        status: 'sent'
    });
    res.json({ success: true, messageId: Date.now() });
});

app.get('/api/telegram/status', (req, res) => {
    res.json({
        connected: services.telegram.isConnected,
        groups: services.telegram.groups.length,
        messages: services.telegram.messages.length,
        stats: services.telegram.stats
    });
});

app.post('/api/telegram/send', (req, res) => {
    const { to, message } = req.body;
    if (!to || !message) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    services.telegram.messages.push({
        id: Date.now(),
        to,
        message,
        timestamp: new Date().toISOString(),
        status: 'sent'
    });
    res.json({ success: true, messageId: Date.now() });
});

app.get('/api/groups', (req, res) => {
    const allGroups = [
        ...services.whatsapp.groups.map(g => ({ ...g, platform: 'whatsapp' })),
        ...services.telegram.groups.map(g => ({ ...g, platform: 'telegram' }))
    ];
    res.json({ groups: allGroups });
});

app.post('/api/groups', (req, res) => {
    const { name, platform, type } = req.body;
    if (!name || !platform) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    const newGroup = {
        id: Date.now(),
        name,
        members: 0,
        type: type || 'general',
        createdAt: new Date().toISOString()
    };
    if (platform === 'whatsapp') {
        services.whatsapp.groups.push(newGroup);
    } else if (platform === 'telegram') {
        services.telegram.groups.push(newGroup);
    } else {
        return res.status(400).json({ error: '无效的平台类型' });
    }
    res.json({ success: true, group: newGroup });
});

app.get('/api/stats', (req, res) => {
    const stats = {
        overview: {
            totalGroups: services.whatsapp.groups.length + services.telegram.groups.length,
            totalMessages: services.whatsapp.messages.length + services.telegram.messages.length,
            totalMembers: 
                services.whatsapp.groups.reduce((sum, g) => sum + g.members, 0) +
                services.telegram.groups.reduce((sum, g) => sum + g.members, 0)
        },
        platforms: {
            whatsapp: {
                groups: services.whatsapp.groups.length,
                messages: services.whatsapp.messages.length,
                members: services.whatsapp.groups.reduce((sum, g) => sum + g.members, 0),
                ...services.whatsapp.stats
            },
            telegram: {
                groups: services.telegram.groups.length,
                messages: services.telegram.messages.length,
                members: services.telegram.groups.reduce((sum, g) => sum + g.members, 0),
                ...services.telegram.stats
            }
        }
    };
    res.json(stats);
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build/index.html'));
});

app.listen(PORT, () => {
    console.log(`
🚀 Deep360 管理系统启动成功
=======================
📡 端口: ${PORT}
🌐 地址: http://localhost:${PORT}
📊 状态: http://localhost:${PORT}/api/health
⚡ 模式: 生产环境
    `);
});

process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，准备关闭服务...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到 SIGINT 信号，准备关闭服务...');
    process.exit(0);
});
