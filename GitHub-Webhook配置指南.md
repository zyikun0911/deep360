# 🔧 GitHub Webhook 有效载荷配置指南

## 📋 Webhook 配置信息

### 基本配置
- **Payload URL**: `http://74.208.61.148/webhook`
- **Content type**: `application/json`
- **Secret**: `deep360-secret-1234`
- **SSL verification**: 启用（推荐）

## 🎯 有效载荷设置步骤

### 1. 访问 GitHub 仓库设置

1. **打开仓库设置页面**:
   - 访问: https://github.com/zyikun0911/deep360
   - 点击 "Settings" 标签
   - 在左侧菜单中点击 "Webhooks"

2. **添加新的 Webhook**:
   - 点击 "Add webhook" 按钮

### 2. 配置 Webhook 参数

#### 基本设置
```
Payload URL: http://74.208.61.148/webhook
Content type: application/json
Secret: deep360-secret-1234
```

#### 事件选择
- **选择事件**: "Let me select individual events"
- **勾选事件**:
  - ✅ **Push**: 代码推送时触发
  - ✅ **Pull request**: 拉取请求时触发（可选）
  - ✅ **Release**: 发布时触发（可选）

#### 高级设置
- ✅ **Active**: 启用 Webhook
- ✅ **SSL verification**: 启用 SSL 验证
- ✅ **Send me everything**: 发送所有数据

### 3. 测试 Webhook

#### 手动测试
1. **点击 "Test delivery"** 按钮
2. **选择测试事件**: "Push"
3. **查看响应**: 应该返回 200 状态码

#### 验证配置
```bash
# 在服务器上查看 Webhook 日志
tail -f /var/log/deep360-webhook.log

# 检查 Webhook 服务器状态
pm2 status deep360-webhook
```

## 📊 有效载荷数据结构

### Push 事件载荷示例
```json
{
  "ref": "refs/heads/main",
  "before": "a1b2c3d4e5f6...",
  "after": "f6e5d4c3b2a1...",
  "repository": {
    "id": 123456789,
    "name": "deep360",
    "full_name": "zyikun0911/deep360",
    "private": false,
    "owner": {
      "login": "zyikun0911",
      "id": 12345678
    }
  },
  "pusher": {
    "name": "zyikun0911",
    "email": "ellokun0911@gmail.com"
  },
  "commits": [
    {
      "id": "f6e5d4c3b2a1...",
      "message": "测试自动部署",
      "timestamp": "2025-08-07T15:30:00Z",
      "author": {
        "name": "Deep360 Team",
        "email": "ellokun0911@gmail.com"
      }
    }
  ]
}
```

### 请求头信息
```
X-GitHub-Event: push
X-Hub-Signature-256: sha256=abc123...
X-GitHub-Delivery: 12345678-1234-1234-1234-123456789abc
Content-Type: application/json
User-Agent: GitHub-Hookshot/1234567
```

## 🔧 服务器端处理

### Webhook 接收器处理逻辑
```bash
#!/bin/bash
# webhook-receiver.sh

# 1. 验证签名
SIGNATURE=$HTTP_X_HUB_SIGNATURE_256
PAYLOAD=$(cat)

# 2. 计算期望签名
EXPECTED_SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)"

# 3. 验证签名
if [ "$SIGNATURE" != "$EXPECTED_SIGNATURE" ]; then
    echo "签名验证失败"
    exit 1
fi

# 4. 解析事件类型
EVENT_TYPE=$HTTP_X_GITHUB_EVENT

# 5. 处理 Push 事件
if [ "$EVENT_TYPE" = "push" ]; then
    echo "检测到代码推送，开始部署..."
    # 执行部署逻辑
fi
```

### Node.js 服务器处理
```javascript
// webhook-server.js

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            // 1. 获取请求头
            const signature = req.headers['x-hub-signature-256'];
            const eventType = req.headers['x-github-event'];
            const deliveryId = req.headers['x-github-delivery'];
            
            // 2. 验证签名
            if (!signature || !verifySignature(body, signature)) {
                log('签名验证失败');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: '签名验证失败' }));
                return;
            }
            
            // 3. 处理事件
            if (eventType === 'push') {
                log(`收到 Push 事件，Delivery ID: ${deliveryId}`);
                // 执行部署逻辑
            }
        });
    }
});
```

## 🛡️ 安全配置

### 签名验证
```javascript
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
```

### 事件过滤
```javascript
// 只处理特定事件
const ALLOWED_EVENTS = ['push', 'pull_request', 'release'];

if (!ALLOWED_EVENTS.includes(eventType)) {
    log(`忽略事件类型: ${eventType}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ignored' }));
    return;
}
```

## 📊 监控和调试

### 查看 Webhook 日志
```bash
# 实时查看日志
tail -f /var/log/deep360-webhook.log

# 查看最近的日志
tail -20 /var/log/deep360-webhook.log

# 查看 PM2 日志
pm2 logs deep360-webhook
```

### 测试 Webhook 端点
```bash
# 测试 Webhook 服务器
curl -X POST http://localhost:8080/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{"test": "ping"}'

# 测试 Nginx 代理
curl -X POST http://74.208.61.148/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -d '{"test": "ping"}'
```

## 🔄 故障排除

### 常见问题

1. **Webhook 不触发**
   ```bash
   # 检查 Webhook 服务器状态
   pm2 status deep360-webhook
   
   # 检查端口是否监听
   netstat -tlnp | grep :8080
   
   # 检查 Nginx 配置
   nginx -t
   ```

2. **签名验证失败**
   ```bash
   # 检查密钥配置
   grep WEBHOOK_SECRET webhook-server.js
   
   # 检查 GitHub 密钥设置
   # 确保 GitHub 和服务器使用相同的密钥
   ```

3. **部署失败**
   ```bash
   # 查看详细错误日志
   tail -f /var/log/deep360-webhook.log
   
   # 检查文件权限
   ls -la /opt/messenger360/webhook-receiver.sh
   
   # 手动测试部署脚本
   bash /opt/messenger360/webhook-receiver.sh
   ```

## 🎯 最佳实践

### 配置建议
1. **使用强密钥**: 生成复杂的 Webhook 密钥
2. **启用 SSL**: 在生产环境中使用 HTTPS
3. **限制事件**: 只处理必要的事件类型
4. **日志记录**: 记录所有 Webhook 活动
5. **错误处理**: 优雅处理错误情况

### 安全建议
1. **验证签名**: 始终验证 Webhook 签名
2. **检查来源**: 验证请求来源
3. **限制访问**: 使用防火墙限制访问
4. **定期更新**: 定期更新密钥和配置

---

## 🎉 配置完成

按照以上步骤配置 GitHub Webhook 后，您的系统将能够：

1. **自动接收**: 接收 GitHub 推送事件
2. **安全验证**: 验证 Webhook 签名
3. **自动部署**: 触发服务器自动部署
4. **日志记录**: 记录所有部署活动
5. **错误处理**: 优雅处理部署错误

**现在您的 GitHub 自动同步系统已完全配置就绪！** 🚀
