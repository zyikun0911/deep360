# Deep360 GitHub Repository Creation Script
Write-Host "🚀 Creating GitHub repository for Deep360..." -ForegroundColor Green

# Set Git path
$env:PATH += ";C:\Program Files\Git\bin"

# Check if repository exists
Write-Host "📋 Checking if repository exists..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/zyikun/deep360" -Method Get
    Write-Host "✅ Repository already exists!" -ForegroundColor Green
} catch {
    Write-Host "❌ Repository not found, creating new one..." -ForegroundColor Yellow
    
    # Create repository using GitHub API
    $headers = @{
        "Authorization" = "token YOUR_GITHUB_TOKEN"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    $body = @{
        name = "deep360"
        description = "Deep360 Social SaaS Platform - WhatsApp/Telegram 多账号群控系统"
        private = $false
        auto_init = $false
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
        Write-Host "✅ Repository created successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create repository via API" -ForegroundColor Red
        Write-Host "Please create the repository manually on GitHub.com" -ForegroundColor Yellow
        Write-Host "Repository URL: https://github.com/zyikun/deep360" -ForegroundColor Cyan
        exit 1
    }
}

# Push code to repository
Write-Host ""
Write-Host "📤 Pushing code to GitHub..." -ForegroundColor Yellow

try {
    git push -u origin master
    Write-Host "✅ Code successfully pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "❌ Push failed. Please try manually:" -ForegroundColor Red
    Write-Host "git push -u origin master" -ForegroundColor Yellow
}

# Verify connection
Write-Host ""
Write-Host "🔍 Verifying connection..." -ForegroundColor Yellow
git remote -v

Write-Host ""
Write-Host "🎉 GitHub repository setup completed!" -ForegroundColor Green
Write-Host "📋 Repository URL: https://github.com/zyikun/deep360" -ForegroundColor Cyan 