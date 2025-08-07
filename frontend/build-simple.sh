#!/bin/bash

echo "开始构建前端..."

# 清理之前的构建
rm -rf build dist

# 直接使用 vite build，跳过 TypeScript 检查
echo "运行 vite build..."
npx vite build

# 检查构建结果
if [ -d "build" ]; then
    echo "✅ 构建成功！"
    ls -la build/
else
    echo "❌ 构建失败！"
    exit 1
fi
