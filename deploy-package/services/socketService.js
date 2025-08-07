class SocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> Set of socket ids
    this.accountRooms = new Map(); // accountId -> Set of socket ids
  }

  /**
   * 用户加入房间
   */
  joinUserRoom(socket, userId) {
    const roomName = `user_${userId}`;
    socket.join(roomName);

    // 记录用户的 socket 连接
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    // 监听断开连接
    socket.on('disconnect', () => {
      this.handleDisconnect(socket, userId);
    });

    console.log(`用户 ${userId} 加入房间: ${roomName}`);
  }

  /**
   * 用户加入账号房间
   */
  joinAccountRoom(socket, accountId, userId) {
    const roomName = `account_${accountId}`;
    socket.join(roomName);

    // 记录账号房间的 socket 连接
    if (!this.accountRooms.has(accountId)) {
      this.accountRooms.set(accountId, new Set());
    }
    this.accountRooms.get(accountId).add(socket.id);

    console.log(`用户 ${userId} 加入账号房间: ${roomName}`);
  }

  /**
   * 处理断开连接
   */
  handleDisconnect(socket, userId) {
    // 清理用户 socket 记录
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket.id);
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // 清理账号房间记录
    for (const [accountId, sockets] of this.accountRooms.entries()) {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          this.accountRooms.delete(accountId);
        }
      }
    }

    console.log(`Socket 断开连接: ${socket.id}`);
  }

  /**
   * 向用户发送消息
   */
  emitToUser(userId, event, data) {
    const roomName = `user_${userId}`;
    this.io.to(roomName).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * 向账号房间发送消息
   */
  emitToAccount(accountId, event, data) {
    const roomName = `account_${accountId}`;
    this.io.to(roomName).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      accountId
    });
  }

  /**
   * 向所有连接的客户端发送消息
   */
  broadcast(event, data) {
    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 发送系统通知
   */
  sendNotification(userId, notification) {
    this.emitToUser(userId, 'notification', {
      id: Date.now().toString(),
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      persistent: notification.persistent || false
    });
  }

  /**
   * 发送任务状态更新
   */
  sendTaskUpdate(userId, taskId, status, progress = null) {
    this.emitToUser(userId, 'task_update', {
      taskId,
      status,
      progress,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 发送账号状态更新
   */
  sendAccountUpdate(userId, accountId, status, data = {}) {
    this.emitToUser(userId, 'account_update', {
      accountId,
      status,
      ...data,
      updatedAt: new Date().toISOString()
    });

    // 同时发送到账号房间
    this.emitToAccount(accountId, 'status_update', {
      status,
      ...data,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 发送系统状态
   */
  sendSystemStatus(status) {
    this.broadcast('system_status', {
      status,
      services: status.services || {},
      stats: status.stats || {},
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 发送实时消息统计
   */
  sendMessageStats(userId, stats) {
    this.emitToUser(userId, 'message_stats', {
      ...stats,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 发送错误信息
   */
  sendError(userId, error, context = {}) {
    this.emitToUser(userId, 'error', {
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        details: error.details || {}
      },
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 发送QR码
   */
  sendQRCode(userId, accountId, qrCode) {
    this.emitToUser(userId, 'qr_code', {
      accountId,
      qrCode,
      message: '请使用手机扫描二维码登录'
    });

    this.emitToAccount(accountId, 'qr_code', {
      qrCode,
      message: '请使用手机扫描二维码登录'
    });
  }

  /**
   * 发送账号连接成功消息
   */
  sendAccountConnected(userId, accountId, profile = {}) {
    const message = {
      accountId,
      message: '账号连接成功',
      profile,
      connectedAt: new Date().toISOString()
    };

    this.emitToUser(userId, 'account_connected', message);
    this.emitToAccount(accountId, 'connected', message);
  }

  /**
   * 发送账号断开连接消息
   */
  sendAccountDisconnected(userId, accountId, reason = '') {
    const message = {
      accountId,
      message: '账号连接已断开',
      reason,
      disconnectedAt: new Date().toISOString()
    };

    this.emitToUser(userId, 'account_disconnected', message);
    this.emitToAccount(accountId, 'disconnected', message);
  }

  /**
   * 发送消息接收通知
   */
  sendMessageReceived(userId, accountId, messageData) {
    this.emitToUser(userId, 'message_received', {
      accountId,
      ...messageData
    });

    this.emitToAccount(accountId, 'message_received', messageData);
  }

  /**
   * 发送消息发送确认
   */
  sendMessageSent(userId, accountId, messageData) {
    this.emitToUser(userId, 'message_sent', {
      accountId,
      ...messageData
    });

    this.emitToAccount(accountId, 'message_sent', messageData);
  }

  /**
   * 发送批量操作进度
   */
  sendBulkProgress(userId, taskId, progress) {
    this.emitToUser(userId, 'bulk_progress', {
      taskId,
      total: progress.total,
      completed: progress.completed,
      failed: progress.failed,
      percentage: Math.round((progress.completed + progress.failed) / progress.total * 100),
      currentTarget: progress.currentTarget,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 发送实时日志
   */
  sendLog(userId, log) {
    this.emitToUser(userId, 'log', {
      level: log.level || 'info',
      message: log.message,
      category: log.category || 'system',
      accountId: log.accountId || null,
      taskId: log.taskId || null,
      timestamp: log.timestamp || new Date().toISOString()
    });
  }

  /**
   * 发送心跳
   */
  sendHeartbeat() {
    this.broadcast('heartbeat', {
      serverTime: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  /**
   * 获取连接统计
   */
  getConnectionStats() {
    const totalConnections = this.io.engine.clientsCount;
    const userConnections = this.userSockets.size;
    const accountRooms = this.accountRooms.size;

    return {
      total: totalConnections,
      users: userConnections,
      accountRooms,
      averageSocketsPerUser: userConnections > 0 ? 
        Array.from(this.userSockets.values()).reduce((sum, sockets) => sum + sockets.size, 0) / userConnections : 0
    };
  }

  /**
   * 清理断开的连接
   */
  cleanup() {
    // 清理空的用户 socket 集合
    for (const [userId, sockets] of this.userSockets.entries()) {
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // 清理空的账号房间
    for (const [accountId, sockets] of this.accountRooms.entries()) {
      if (sockets.size === 0) {
        this.accountRooms.delete(accountId);
      }
    }
  }

  /**
   * 定期发送心跳和清理
   */
  startHeartbeat() {
    setInterval(() => {
      this.sendHeartbeat();
      this.cleanup();
    }, 30000); // 每30秒
  }
}

module.exports = SocketService;