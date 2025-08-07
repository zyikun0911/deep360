# Deep360 GitHub Webhook Deployment Script
Write-Host "Starting Deep360 GitHub Webhook deployment..." -ForegroundColor Green

$SERVER_IP = "74.208.61.148"
$GITHUB_REPO = "zyikun0911/deep360"
$WEBHOOK_SECRET = "deep360-secret-1234"

Write-Host "Deployment Configuration:" -ForegroundColor Yellow
Write-Host "Server IP: $SERVER_IP" -ForegroundColor White
Write-Host "GitHub Repo: $GITHUB_REPO" -ForegroundColor White
Write-Host "Webhook Secret: $WEBHOOK_SECRET" -ForegroundColor White

Write-Host ""
Write-Host "Step 1: Checking configuration files..." -ForegroundColor Cyan

# Check if config files exist
$files = @("webhook-server.js", "webhook-receiver.sh", "nginx-deep360.conf")
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "OK: $file exists" -ForegroundColor Green
    } else {
        Write-Host "ERROR: $file missing" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 2: Uploading files to server..." -ForegroundColor Cyan

# Upload configuration files
Write-Host "Uploading webhook-server.js..." -ForegroundColor White
scp webhook-server.js root@${SERVER_IP}:/opt/messenger360/

Write-Host "Uploading webhook-receiver.sh..." -ForegroundColor White
scp webhook-receiver.sh root@${SERVER_IP}:/opt/messenger360/

Write-Host "Uploading nginx-deep360.conf..." -ForegroundColor White
scp nginx-deep360.conf root@${SERVER_IP}:/etc/nginx/sites-available/deep360

Write-Host ""
Write-Host "Step 3: Configuring server..." -ForegroundColor Cyan

# Server configuration commands
$serverCommands = @"
cd /opt/messenger360
chmod +x webhook-receiver.sh
mkdir -p /var/log
touch /var/log/deep360-webhook.log
chmod 666 /var/log/deep360-webhook.log
ln -sf /etc/nginx/sites-available/deep360 /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
pm2 start webhook-server.js --name deep360-webhook
pm2 save
pm2 list
"@

Write-Host "Executing server configuration..." -ForegroundColor White
Write-Host $serverCommands -ForegroundColor Gray

Write-Host ""
Write-Host "Step 4: GitHub Webhook Configuration..." -ForegroundColor Cyan

Write-Host "Please visit this link to configure GitHub Webhook:" -ForegroundColor Yellow
Write-Host "https://github.com/$GITHUB_REPO/settings/hooks" -ForegroundColor White

Write-Host ""
Write-Host "Configuration parameters:" -ForegroundColor Yellow
Write-Host "Payload URL: http://$SERVER_IP/webhook" -ForegroundColor White
Write-Host "Content type: application/json" -ForegroundColor White
Write-Host "Secret: $WEBHOOK_SECRET" -ForegroundColor White
Write-Host "Events: Push" -ForegroundColor White

Write-Host ""
Write-Host "Step 5: Testing deployment..." -ForegroundColor Cyan

Write-Host "Push test code to GitHub:" -ForegroundColor White
Write-Host "git add ." -ForegroundColor Gray
Write-Host "git commit -m 'Test auto deployment'" -ForegroundColor Gray
Write-Host "git push origin main" -ForegroundColor Gray

Write-Host ""
Write-Host "Step 6: Monitoring deployment..." -ForegroundColor Cyan

Write-Host "View Webhook logs:" -ForegroundColor White
Write-Host "ssh root@$SERVER_IP 'tail -f /var/log/deep360-webhook.log'" -ForegroundColor Gray

Write-Host "Check service status:" -ForegroundColor White
Write-Host "ssh root@$SERVER_IP 'pm2 status'" -ForegroundColor Gray

Write-Host "Health check:" -ForegroundColor White
Write-Host "ssh root@$SERVER_IP 'curl -f http://localhost:7788/health'" -ForegroundColor Gray

Write-Host ""
Write-Host "Automated deployment commands:" -ForegroundColor Cyan

$automationCommands = @"
# 1. Upload config files
scp webhook-server.js root@$SERVER_IP:/opt/messenger360/
scp webhook-receiver.sh root@$SERVER_IP:/opt/messenger360/
scp nginx-deep360.conf root@$SERVER_IP:/etc/nginx/sites-available/deep360

# 2. Configure server
ssh root@$SERVER_IP 'cd /opt/messenger360 && chmod +x webhook-receiver.sh && mkdir -p /var/log && touch /var/log/deep360-webhook.log && chmod 666 /var/log/deep360-webhook.log && ln -sf /etc/nginx/sites-available/deep360 /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx && pm2 start webhook-server.js --name deep360-webhook && pm2 save'

# 3. Test Webhook
ssh root@$SERVER_IP 'curl -X POST http://localhost:8080/webhook -H "Content-Type: application/json" -H "X-GitHub-Event: ping" -d "{\"test\": \"ping\"}"'
"@

Write-Host $automationCommands -ForegroundColor Gray

Write-Host ""
Write-Host "Deployment script ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run automated deployment commands" -ForegroundColor White
Write-Host "2. Configure GitHub Webhook" -ForegroundColor White
Write-Host "3. Test auto deployment" -ForegroundColor White
Write-Host "4. Monitor deployment status" -ForegroundColor White

Write-Host ""
Write-Host "Execute automated deployment now? (Y/N)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "Starting automated deployment..." -ForegroundColor Green
    
    # Execute deployment commands
    Write-Host "Uploading config files..." -ForegroundColor White
    scp webhook-server.js root@${SERVER_IP}:/opt/messenger360/
    scp webhook-receiver.sh root@${SERVER_IP}:/opt/messenger360/
    scp nginx-deep360.conf root@${SERVER_IP}:/etc/nginx/sites-available/deep360
    
    Write-Host "Configuring server..." -ForegroundColor White
    ssh root@${SERVER_IP} "cd /opt/messenger360 && chmod +x webhook-receiver.sh && mkdir -p /var/log && touch /var/log/deep360-webhook.log && chmod 666 /var/log/deep360-webhook.log && ln -sf /etc/nginx/sites-available/deep360 /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx && pm2 start webhook-server.js --name deep360-webhook && pm2 save"
    
    Write-Host "Testing Webhook endpoint..." -ForegroundColor White
    ssh root@${SERVER_IP} "curl -X POST http://localhost:8080/webhook -H 'Content-Type: application/json' -H 'X-GitHub-Event: ping' -d '{\"test\": \"ping\"}'"
    
    Write-Host ""
    Write-Host "Automated deployment completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Please complete these steps:" -ForegroundColor Yellow
    Write-Host "1. Visit https://github.com/$GITHUB_REPO/settings/hooks" -ForegroundColor White
    Write-Host "2. Click 'Add webhook'" -ForegroundColor White
    Write-Host "3. Configure: Payload URL = http://$SERVER_IP/webhook" -ForegroundColor White
    Write-Host "4. Configure: Secret = $WEBHOOK_SECRET" -ForegroundColor White
    Write-Host "5. Select: Push events" -ForegroundColor White
    Write-Host "6. Click 'Add webhook'" -ForegroundColor White
    Write-Host "7. Test: git push origin main" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Manual execution steps:" -ForegroundColor Yellow
    Write-Host "1. Copy the automated deployment commands above" -ForegroundColor White
    Write-Host "2. Execute in terminal" -ForegroundColor White
    Write-Host "3. Follow GitHub Webhook configuration prompts" -ForegroundColor White
}

Write-Host ""
Write-Host "Deep360 GitHub Webhook deployment guide completed!" -ForegroundColor Green
