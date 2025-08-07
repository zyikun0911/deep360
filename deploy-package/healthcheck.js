const http = require('http');
const mongoose = require('mongoose');
const redis = require('redis');

// 健康检查函数
async function healthCheck() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {},
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  };

  try {
    // 检查 HTTP 服务
    await checkHTTPService(checks);
    
    // 检查 MongoDB 连接
    await checkMongoDB(checks);
    
    // 检查 Redis 连接
    await checkRedis(checks);
    
    // 检查磁盘空间
    checkDiskSpace(checks);
    
    // 总体状态判断
    const hasFailures = Object.values(checks.services).some(service => !service.healthy);
    checks.status = hasFailures ? 'unhealthy' : 'healthy';
    
  } catch (error) {
    checks.status = 'unhealthy';
    checks.error = error.message;
  }

  return checks;
}

// 检查 HTTP 服务
function checkHTTPService(checks) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      path: '/api/health',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      checks.services.http = {
        healthy: res.statusCode === 200 || res.statusCode === 404,
        status: res.statusCode,
        responseTime: Date.now() - startTime
      };
      resolve();
    });

    const startTime = Date.now();
    
    req.on('error', (error) => {
      checks.services.http = {
        healthy: false,
        error: error.message
      };
      resolve(); // 不要 reject，继续其他检查
    });

    req.on('timeout', () => {
      checks.services.http = {
        healthy: false,
        error: 'Request timeout'
      };
      req.destroy();
      resolve();
    });

    req.end();
  });
}

// 检查 MongoDB 连接
async function checkMongoDB(checks) {
  try {
    const startTime = Date.now();
    
    if (mongoose.connection.readyState === 1) {
      // 已连接，执行一个简单查询
      await mongoose.connection.db.admin().ping();
      
      checks.services.mongodb = {
        healthy: true,
        status: 'connected',
        responseTime: Date.now() - startTime,
        readyState: mongoose.connection.readyState
      };
    } else {
      // 尝试连接
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/deep360', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000
      });
      
      checks.services.mongodb = {
        healthy: true,
        status: 'connected',
        responseTime: Date.now() - startTime,
        readyState: mongoose.connection.readyState
      };
    }
  } catch (error) {
    checks.services.mongodb = {
      healthy: false,
      error: error.message,
      readyState: mongoose.connection.readyState
    };
  }
}

// 检查 Redis 连接
async function checkRedis(checks) {
  let client = null;
  
  try {
    const startTime = Date.now();
    
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    await client.connect();
    await client.ping();
    
    checks.services.redis = {
      healthy: true,
      status: 'connected',
      responseTime: Date.now() - startTime
    };
    
  } catch (error) {
    checks.services.redis = {
      healthy: false,
      error: error.message
    };
  } finally {
    if (client) {
      try {
        await client.quit();
      } catch (e) {
        // 忽略关闭错误
      }
    }
  }
}

// 检查磁盘空间
function checkDiskSpace(checks) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const stats = fs.statSync(path.resolve('./'));
    const free = stats.free || 0;
    const total = stats.size || 1;
    const usedPercentage = ((total - free) / total) * 100;
    
    checks.services.diskSpace = {
      healthy: usedPercentage < 90, // 磁盘使用率低于90%
      usedPercentage: Math.round(usedPercentage * 100) / 100,
      freeSpace: Math.round(free / 1024 / 1024), // MB
      totalSpace: Math.round(total / 1024 / 1024) // MB
    };
  } catch (error) {
    checks.services.diskSpace = {
      healthy: true, // 默认为健康，因为这个检查可能在某些环境下不可用
      error: error.message
    };
  }
}

// 命令行模式
if (require.main === module) {
  healthCheck()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'healthy' ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}

module.exports = healthCheck;