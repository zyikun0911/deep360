# Deep360 部署包生成脚本
Write-Host "🚀 开始创建 Deep360 部署包..." -ForegroundColor Green

$SERVER_IP = "74.208.61.148"
$SERVER_PATH = "/opt/messenger360/"

Write-Host "📋 部署信息:" -ForegroundColor Yellow
Write-Host "服务器 IP: $SERVER_IP" -ForegroundColor White
Write-Host "服务器路径: $SERVER_PATH" -ForegroundColor White

# 1. 创建部署包
Write-Host ""
Write-Host "📦 创建部署包..." -ForegroundColor Yellow

$DEPLOY_DIR = "deploy-package"
if (Test-Path $DEPLOY_DIR) {
    Remove-Item $DEPLOY_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $DEPLOY_DIR

# 复制文件
Write-Host "复制项目文件..." -ForegroundColor Cyan
Copy-Item -Path "package.json" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "server.js" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "start.js" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "healthcheck.js" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "Dockerfile" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "docker-compose.yml" -Destination "$DEPLOY_DIR/"
Copy-Item -Path "env.example" -Destination "$DEPLOY_DIR/"

# 复制目录
Copy-Item -Path "routes" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "services" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "models" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "middleware" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "utils" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "plugins" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "frontend" -Destination "$DEPLOY_DIR/" -Recurse
Copy-Item -Path "scripts" -Destination "$DEPLOY_DIR/" -Recurse

# 2. 创建压缩包
Write-Host ""
Write-Host "📦 创建压缩包..." -ForegroundColor Yellow
Compress-Archive -Path "$DEPLOY_DIR/*" -DestinationPath "deep360-deploy.zip" -Force

Write-Host ""
Write-Host "✅ 部署包创建完成！" -ForegroundColor Green
Write-Host "📦 文件: deep360-deploy.zip" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 下一步操作:" -ForegroundColor Yellow
Write-Host "1. 上传文件到服务器: scp deep360-deploy.zip root@$SERVER_IP:/tmp/" -ForegroundColor White
Write-Host "2. 登录服务器: ssh root@$SERVER_IP" -ForegroundColor White
Write-Host "3. 执行部署: 参考 服务器部署指南.md" -ForegroundColor White
Write-Host ""
Write-Host "🌐 部署完成后访问: http://$SERVER_IP" -ForegroundColor Cyan
