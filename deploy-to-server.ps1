# Deep360 服务器部署脚本
Write-Host "🚀 开始部署 Deep360 到服务器..." -ForegroundColor Green

# 设置变量
$SERVER_IP = "74.208.61.148"
$SERVER_PATH = "/opt/messenger360/"
$LOCAL_PATH = Get-Location

Write-Host "📋 部署信息:" -ForegroundColor Yellow
Write-Host "服务器 IP: $SERVER_IP" -ForegroundColor White
Write-Host "服务器路径: $SERVER_PATH" -ForegroundColor White
Write-Host "本地路径: $LOCAL_PATH" -ForegroundColor White

# 1. 创建部署包
Write-Host ""
Write-Host "📦 创建部署包..." -ForegroundColor Yellow

# 创建临时部署目录
$DEPLOY_DIR = "deploy-package"
if (Test-Path $DEPLOY_DIR) {
    Remove-Item $DEPLOY_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $DEPLOY_DIR

# 复制必要文件
Write-Host "复制项目文件..." -ForegroundColor Cyan
Copy-Item -Path "package.json" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "server.js" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "start.js" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "healthcheck.js" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "Dockerfile" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "docker-compose.yml" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "Dockerfile.prod" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "docker-compose.prod.yml" -Destination "$DEPLOY_DIR/"
Copy-Item -Path ".eslintrc.js" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "env.example" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "env.production.example" -Destination "$DEPLOY_DIR/"

# 复制目录
Copy-Item -Path "routes" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "services" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "models" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "middleware" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "utils" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "plugins" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "docs" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "tests" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "scripts" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "config" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "frontend" -Destination "$DEPLOY_DIR/" -Recurse

# 创建部署脚本
$DEPLOY_SCRIPT = @"
#!/bin/bash
set -e

echo "🚀 开始部署 Deep360..."

# 设置变量
SERVER_PATH="$SERVER_PATH"
BACKUP_DIR="/root/backup_\$(date +%Y%m%d_%H%M%S)"

# 创建备份
echo "📦 创建备份..."
mkdir -p \$BACKUP_DIR
if [ -d "\$SERVER_PATH" ]; then
    cp -r \$SERVER_PATH \$BACKUP_DIR/
fi

# 停止现有服务
echo "🛑 停止现有服务..."
pm2 stop all || true
systemctl stop nginx || true

# 清理旧文件
echo "🧹 清理旧文件..."
rm -rf \$SERVER_PATH/*

# 解压部署包
echo "📦 解压部署包..."
tar -xzf deep360-deploy.tar.gz -C \$SERVER_PATH/

# 安装依赖
echo "📦 安装依赖..."
cd \$SERVER_PATH
npm install --production

# 构建前端
echo "🌐 构建前端..."
cd frontend
npm install
npm run build
cd ..

# 配置环境变量
echo "⚙️ 配置环境变量..."
if [ ! -f ".env" ]; then
    cp env.example .env
fi

# 启动服务
echo "🚀 启动服务..."
pm2 start ecosystem.config.js || pm2 start server.js --name deep360-api
pm2 save

# 启动 Nginx
echo "🌐 启动 Nginx..."
systemctl start nginx

# 健康检查
echo "🔍 健康检查..."
sleep 5
curl -f http://localhost:7788/health || echo "⚠️ 健康检查失败"

echo "✅ 部署完成！"
echo "🌐 访问地址: http://$SERVER_IP"
echo "📋 备份位置: \$BACKUP_DIR"
"@

$DEPLOY_SCRIPT | Out-File -FilePath "$DEPLOY_DIR/deploy.sh" -Encoding UTF8

# 2. 创建压缩包
Write-Host ""
Write-Host "📦 创建压缩包..." -ForegroundColor Yellow
Compress-Archive -Path "$DEPLOY_DIR/*" -DestinationPath "deep360-deploy.zip" -Force

# 3. 上传到服务器
Write-Host ""
Write-Host "📤 上传到服务器..." -ForegroundColor Yellow

# 使用 SCP 上传（需要 SSH 密钥配置）
try {
    scp "deep360-deploy.zip" "root@${SERVER_IP}:/tmp/"
    Write-Host "✅ 文件上传成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 上传失败，请手动上传:" -ForegroundColor Red
    Write-Host "scp deep360-deploy.zip root@${SERVER_IP}:/tmp/" -ForegroundColor Yellow
}

# 4. 执行部署
Write-Host ""
Write-Host "🚀 执行部署..." -ForegroundColor Yellow

$REMOTE_COMMANDS = @"
cd /tmp
unzip -o deep360-deploy.zip -d /tmp/deep360-deploy/
cd /tmp/deep360-deploy
chmod +x deploy.sh
./deploy.sh
"@

try {
    ssh "root@${SERVER_IP}" $REMOTE_COMMANDS
    Write-Host "✅ 部署成功！" -ForegroundColor Green
} catch {
    Write-Host "❌ 远程部署失败，请手动执行:" -ForegroundColor Red
    Write-Host "ssh root@${SERVER_IP}" -ForegroundColor Yellow
    Write-Host "然后执行部署脚本" -ForegroundColor Yellow
}

# 5. 清理本地文件
Write-Host ""
Write-Host "🧹 清理本地文件..." -ForegroundColor Yellow
Remove-Item $DEPLOY_DIR -Recurse -Force
Remove-Item "deep360-deploy.zip" -Force

Write-Host ""
Write-Host "🎉 部署完成！" -ForegroundColor Green
Write-Host "🌐 访问地址: http://${SERVER_IP}" -ForegroundColor Cyan
Write-Host "📋 服务器路径: ${SERVER_PATH}" -ForegroundColor Cyan
