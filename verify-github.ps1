# Deep360 GitHub Connection Verification Script
Write-Host "🔍 Verifying GitHub connection..." -ForegroundColor Green

# Check Git status
Write-Host "📋 Git Status:" -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "📡 Remote Repository:" -ForegroundColor Yellow
git remote -v

Write-Host ""
Write-Host "🌿 Current Branch:" -ForegroundColor Yellow
git branch

Write-Host ""
Write-Host "📤 Attempting to push to GitHub..." -ForegroundColor Yellow
try {
    git push -u origin main
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
} catch {
    Write-Host "❌ Push failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Repository URL: https://github.com/zyikun0911/deep360" -ForegroundColor Cyan
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Visit the repository URL above" -ForegroundColor White
Write-Host "2. Verify your code is uploaded" -ForegroundColor White
Write-Host "3. Start collaborating with your team" -ForegroundColor White
