# GitHub Webhook Sync Test
Write-Host "=== Deep360 Sync Test ===" -ForegroundColor Green

# Create test file
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$testContent = @"
# Sync Test - $timestamp

This is a test file to verify GitHub Webhook auto-sync functionality.

## Test Details:
- Time: $timestamp
- Purpose: Verify automatic deployment
- Expected: Server should auto-deploy after push

## Status:
- [ ] Code pushed to GitHub
- [ ] Webhook triggered
- [ ] Server deployed
- [ ] Health check passed
"@

$testContent | Out-File -FilePath "sync-test.md" -Encoding UTF8

# Git operations
Write-Host "`n1. Adding test file..." -ForegroundColor Yellow
git add sync-test.md

Write-Host "2. Committing changes..." -ForegroundColor Yellow
git commit -m "Sync test - $timestamp"

Write-Host "3. Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "`n✅ Test completed!" -ForegroundColor Green
Write-Host "Check server logs: tail -f /var/log/deep360-webhook.log" -ForegroundColor Cyan
