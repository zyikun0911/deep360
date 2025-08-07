# 上传配置文件到服务器
Write-Host "开始上传配置文件到服务器..." -ForegroundColor Green

$SERVER_IP = "74.208.61.148"

Write-Host "上传 webhook-server.js..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no webhook-server.js root@${SERVER_IP}:/opt/messenger360/

Write-Host "上传 webhook-receiver.sh..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no webhook-receiver.sh root@${SERVER_IP}:/opt/messenger360/

Write-Host "上传 nginx-deep360.conf..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no nginx-deep360.conf root@${SERVER_IP}:/etc/nginx/sites-available/deep360

Write-Host "文件上传完成！" -ForegroundColor Green
Write-Host ""
Write-Host "现在请在服务器上执行以下命令：" -ForegroundColor Cyan
Write-Host "cd /opt/messenger360" -ForegroundColor White
Write-Host "chmod +x webhook-receiver.sh" -ForegroundColor White
Write-Host "mkdir -p /var/log" -ForegroundColor White
Write-Host "touch /var/log/deep360-webhook.log" -ForegroundColor White
Write-Host "chmod 666 /var/log/deep360-webhook.log" -ForegroundColor White
Write-Host "ln -sf /etc/nginx/sites-available/deep360 /etc/nginx/sites-enabled/" -ForegroundColor White
Write-Host "nginx -t && systemctl reload nginx" -ForegroundColor White
Write-Host "pm2 start webhook-server.js --name deep360-webhook" -ForegroundColor White
Write-Host "pm2 save" -ForegroundColor White
