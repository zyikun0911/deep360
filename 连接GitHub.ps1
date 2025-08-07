# Deep360 GitHub 连接脚本
Write-Host "🚀 开始连接 Deep360 到 GitHub..." -ForegroundColor Green

# 设置 Git 路径
$env:PATH += ";C:\Program Files\Git\bin"

# 检查 Git 状态
Write-Host "📋 检查当前 Git 状态..." -ForegroundColor Yellow
git status

# 获取用户输入
Write-Host ""
Write-Host "📝 请输入您的 GitHub 用户名:" -ForegroundColor Cyan
$githubUsername = Read-Host

if ([string]::IsNullOrEmpty($githubUsername)) {
    Write-Host "❌ 用户名不能为空！" -ForegroundColor Red
    exit 1
}

# 构建远程仓库 URL
$remoteUrl = "https://github.com/$githubUsername/deep360.git"

Write-Host ""
Write-Host "🔗 将连接到远程仓库: $remoteUrl" -ForegroundColor Yellow
Write-Host "请确认您已经在 GitHub 上创建了名为 'deep360' 的仓库" -ForegroundColor Yellow
Write-Host "按任意键继续，或按 Ctrl+C 取消..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# 添加远程仓库
Write-Host ""
Write-Host "📡 添加远程仓库..." -ForegroundColor Yellow
try {
    git remote add origin $remoteUrl
    Write-Host "✅ 远程仓库添加成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 添加远程仓库失败: $_" -ForegroundColor Red
    exit 1
}

# 推送到 GitHub
Write-Host ""
Write-Host "📤 推送到 GitHub..." -ForegroundColor Yellow
try {
    git push -u origin master
    Write-Host "✅ 代码已成功推送到 GitHub！" -ForegroundColor Green
} catch {
    Write-Host "❌ 推送失败，可能的原因:" -ForegroundColor Red
    Write-Host "1. 仓库不存在或权限不足" -ForegroundColor Yellow
    Write-Host "2. 网络连接问题" -ForegroundColor Yellow
    Write-Host "3. 需要身份验证" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Cyan
    Write-Host "- 仓库 URL 是否正确: $remoteUrl" -ForegroundColor White
    Write-Host "- 是否已在 GitHub 上创建仓库" -ForegroundColor White
    Write-Host "- 网络连接是否正常" -ForegroundColor White
    exit 1
}

# 验证连接
Write-Host ""
Write-Host "🔍 验证连接..." -ForegroundColor Yellow
git remote -v

Write-Host ""
Write-Host "🎉 GitHub 连接设置完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步操作:" -ForegroundColor Cyan
Write-Host "1. 访问 https://github.com/$githubUsername/deep360" -ForegroundColor White
Write-Host "2. 验证代码是否已上传" -ForegroundColor White
Write-Host "3. 开始团队协作开发" -ForegroundColor White
Write-Host ""
Write-Host "💡 常用命令:" -ForegroundColor Cyan
Write-Host "git push origin master    # 推送更改" -ForegroundColor White
Write-Host "git pull origin master    # 拉取更新" -ForegroundColor White
Write-Host "git status               # 查看状态" -ForegroundColor White 