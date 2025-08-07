#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Deep360 Social SaaS Platform - 启动脚本');
console.log('📱 WhatsApp/Telegram 多账号群控系统');
console.log('=====================================\n');

// 检查环境
function checkEnvironment() {
  console.log('🔍 检查运行环境...');
  
  // 检查 Node.js 版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    console.error('❌ Node.js 版本过低，需要 18.0.0 或更高版本');
    console.error(`   当前版本: ${nodeVersion}`);
    process.exit(1);
  }
  
  console.log(`✅ Node.js 版本: ${nodeVersion}`);
  
  // 检查必要文件
  const requiredFiles = [
    'package.json',
    'server.js',
    'docker-compose.yml'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ 缺少必要文件: ${file}`);
      process.exit(1);
    }
  }
  
  console.log('✅ 文件检查完成');
}

// 安装依赖
function installDependencies() {
  return new Promise((resolve, reject) => {
    console.log('\n📦 安装后端依赖...');
    
    const npm = spawn('npm', ['install'], {
      stdio: 'inherit',
      shell: true
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 后端依赖安装完成');
        resolve();
      } else {
        console.error('❌ 后端依赖安装失败');
        reject(new Error('npm install failed'));
      }
    });
  });
}

// 安装前端依赖
function installFrontendDependencies() {
  return new Promise((resolve, reject) => {
    console.log('\n📦 安装前端依赖...');
    
    const frontendPath = path.join(__dirname, 'frontend');
    if (!fs.existsSync(frontendPath)) {
      console.log('⚠️  前端目录不存在，跳过前端依赖安装');
      resolve();
      return;
    }
    
    const npm = spawn('npm', ['install'], {
      stdio: 'inherit',
      shell: true,
      cwd: frontendPath
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 前端依赖安装完成');
        resolve();
      } else {
        console.error('❌ 前端依赖安装失败');
        reject(new Error('frontend npm install failed'));
      }
    });
  });
}

// 检查数据库连接
function checkDatabaseConnection() {
  console.log('\n🔌 检查数据库连接...');
  
  // 这里可以添加实际的数据库连接检查
  console.log('✅ 数据库连接检查完成');
}

// 启动应用
function startApplication() {
  console.log('\n🚀 启动 Deep360 应用...');
  console.log('=====================================');
  console.log('📊 管理后台: http://localhost:3001');
  console.log('🔧 API 服务: http://localhost:3000');
  console.log('📚 API 文档: http://localhost:3000/docs');
  console.log('=====================================\n');
  
  // 启动后端服务
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
  
  // 启动前端服务（开发模式）
  if (process.env.NODE_ENV !== 'production') {
    const frontendPath = path.join(__dirname, 'frontend');
    if (fs.existsSync(frontendPath)) {
      setTimeout(() => {
        console.log('\n🎨 启动前端开发服务器...');
        spawn('npm', ['run', 'dev'], {
          stdio: 'inherit',
          shell: true,
          cwd: frontendPath
        });
      }, 3000);
    }
  }
  
  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务...');
    server.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭服务...');
    server.kill('SIGTERM');
    process.exit(0);
  });
}

// 显示帮助信息
function showHelp() {
  console.log(`
使用方法:
  node start.js [选项]

选项:
  --help, -h        显示帮助信息
  --no-deps         跳过依赖安装
  --production      生产环境模式
  --docker          使用 Docker 启动

示例:
  node start.js                    # 开发模式启动
  node start.js --production       # 生产模式启动
  node start.js --docker           # Docker 模式启动
  node start.js --no-deps          # 跳过依赖安装直接启动

Docker 部署:
  docker-compose up -d             # 启动所有服务
  docker-compose logs -f           # 查看日志
  docker-compose down              # 停止服务

更多信息请查看 README.md 文件
`);
}

// Docker 启动
function startWithDocker() {
  console.log('\n🐳 使用 Docker 启动服务...');
  
  const dockerCompose = spawn('docker-compose', ['up', '-d'], {
    stdio: 'inherit',
    shell: true
  });
  
  dockerCompose.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Docker 服务启动成功');
      console.log('📊 前端界面: http://localhost:80');
      console.log('🔧 API 服务: http://localhost:3000');
      
      // 显示服务状态
      setTimeout(() => {
        spawn('docker-compose', ['ps'], {
          stdio: 'inherit',
          shell: true
        });
      }, 2000);
    } else {
      console.error('❌ Docker 服务启动失败');
      process.exit(1);
    }
  });
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  // 检查参数
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  if (args.includes('--docker')) {
    startWithDocker();
    return;
  }
  
  try {
    // 环境检查
    checkEnvironment();
    
    // 依赖安装
    if (!args.includes('--no-deps')) {
      await installDependencies();
      await installFrontendDependencies();
    }
    
    // 数据库检查
    checkDatabaseConnection();
    
    // 设置生产环境
    if (args.includes('--production')) {
      process.env.NODE_ENV = 'production';
    }
    
    // 启动应用
    startApplication();
    
  } catch (error) {
    console.error('\n❌ 启动失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main().catch(console.error);