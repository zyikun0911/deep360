#!/bin/bash
echo "🔄 开始自动同步到 GitHub..."
cd /opt/messenger360

# 检查是否有更改
if [[ -n $(git status --porcelain) ]]; then
    echo "📤 发现更改，正在同步..."
    git add .
    git commit -m "Deep360 自动同步 - $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin main
    echo "✅ 同步完成: $(date)"
else
    echo " 没有更改需要同步"
fi
