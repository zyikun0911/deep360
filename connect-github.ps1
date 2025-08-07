# Deep360 GitHub Connection Script
Write-Host "🚀 Starting Deep360 GitHub connection..." -ForegroundColor Green

# Set Git path
$env:PATH += ";C:\Program Files\Git\bin"

# Check Git status
Write-Host "📋 Checking current Git status..." -ForegroundColor Yellow
git status

# Get user input
Write-Host ""
Write-Host "📝 Please enter your GitHub username:" -ForegroundColor Cyan
$githubUsername = Read-Host

if ([string]::IsNullOrEmpty($githubUsername)) {
    Write-Host "❌ Username cannot be empty!" -ForegroundColor Red
    exit 1
}

# Build remote repository URL
$remoteUrl = "https://github.com/$githubUsername/deep360.git"

Write-Host ""
Write-Host "🔗 Will connect to remote repository: $remoteUrl" -ForegroundColor Yellow
Write-Host "Please confirm you have created a repository named 'deep360' on GitHub" -ForegroundColor Yellow
Write-Host "Press any key to continue, or Ctrl+C to cancel..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Add remote repository
Write-Host ""
Write-Host "📡 Adding remote repository..." -ForegroundColor Yellow
try {
    git remote add origin $remoteUrl
    Write-Host "✅ Remote repository added successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to add remote repository: $_" -ForegroundColor Red
    exit 1
}

# Push to GitHub
Write-Host ""
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
try {
    git push -u origin master
    Write-Host "✅ Code successfully pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "❌ Push failed, possible reasons:" -ForegroundColor Red
    Write-Host "1. Repository doesn't exist or insufficient permissions" -ForegroundColor Yellow
    Write-Host "2. Network connection issues" -ForegroundColor Yellow
    Write-Host "3. Authentication required" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Cyan
    Write-Host "- Repository URL is correct: $remoteUrl" -ForegroundColor White
    Write-Host "- Repository has been created on GitHub" -ForegroundColor White
    Write-Host "- Network connection is normal" -ForegroundColor White
    exit 1
}

# Verify connection
Write-Host ""
Write-Host "🔍 Verifying connection..." -ForegroundColor Yellow
git remote -v

Write-Host ""
Write-Host "🎉 GitHub connection setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit https://github.com/$githubUsername/deep360" -ForegroundColor White
Write-Host "2. Verify code has been uploaded" -ForegroundColor White
Write-Host "3. Start team collaboration development" -ForegroundColor White
Write-Host ""
Write-Host "💡 Common commands:" -ForegroundColor Cyan
Write-Host "git push origin master    # Push changes" -ForegroundColor White
Write-Host "git pull origin master    # Pull updates" -ForegroundColor White
Write-Host "git status               # Check status" -ForegroundColor White 