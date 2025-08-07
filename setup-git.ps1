# Deep360 Git 仓库设置脚本
Write-Host "🚀 开始设置 Deep360 Git 仓库..." -ForegroundColor Green

# 检查 Git 是否安装
try {
    $gitVersion = git --version
    Write-Host "✅ Git 已安装: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git 未安装，请先安装 Git" -ForegroundColor Red
    Write-Host "请访问: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# 初始化 Git 仓库
Write-Host "📁 初始化 Git 仓库..." -ForegroundColor Yellow
git init

# 创建 .gitignore 文件
Write-Host "📝 创建 .gitignore 文件..." -ForegroundColor Yellow
@"
# 依赖包
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 环境配置
.env
.env.local
.env.production

# 日志文件
logs/
*.log

# 上传文件
uploads/
temp/

# 构建文件
dist/
build/

# 系统文件
.DS_Store
Thumbs.db

# IDE 文件
.vscode/
.idea/

# 大文件
*.iso
*.rar
*.zip
*.msi
*.tar.gz

# 记录文件
记录.txt
*.txt
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8

# 添加文件到 Git
Write-Host "📦 添加文件到 Git..." -ForegroundColor Yellow
git add .

# 初始提交
Write-Host "💾 创建初始提交..." -ForegroundColor Yellow
git commit -m "Initial commit: Deep360 Social SaaS Platform"

Write-Host "✅ Git 仓库设置完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步操作：" -ForegroundColor Cyan
Write-Host "1. 在 GitHub 上创建新仓库" -ForegroundColor White
Write-Host "2. 运行: git remote add origin https://github.com/your-username/deep360.git" -ForegroundColor White
Write-Host "3. 运行: git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "🔗 数据存储说明：" -ForegroundColor Cyan
Write-Host "- 代码文件：存储在 Git 仓库中" -ForegroundColor White
Write-Host "- 数据库：MongoDB 存储在服务器上" -ForegroundColor White
Write-Host "- 配置文件：.env 文件（已忽略，需要手动配置）" -ForegroundColor White
Write-Host "- 日志文件：logs/ 目录（已忽略）" -ForegroundColor White 