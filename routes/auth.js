const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

const router = express.Router();

// 注册
router.post('/register', validateRequest([
  'username',
  'email', 
  'password'
]), async (req, res) => {
  try {
    const { username, email, password, plan = 'free' } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名或邮箱已存在'
      });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password,
      plan,
      emailVerified: false
    });

    await user.save();

    // 生成 JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
});

// 登录
router.post('/login', validateRequest([
  'email',
  'password'
]), async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 验证密码
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '邮箱或密码错误'
      });
    }

    // 检查账号状态
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用，请联系管理员'
      });
    }

    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();

    // 生成 JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: user.toJSON(),
        token
      }
    });

  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
});

// 获取当前用户信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    });
  }
});

// 兼容别名：/profile 返回与 /me 相同的数据
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    res.json({ success: true, data: { user: user.toJSON() } });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户信息失败', error: error.message });
  }
});

// 更新用户资料
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, settings } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    
    if (username) {
      // 检查用户名是否已被使用
      const existingUser = await User.findOne({
        username,
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名已被使用'
        });
      }
      
      updateData.username = username;
    }

    if (settings) {
      updateData.settings = settings;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: '资料更新成功',
      data: {
        user: user.toJSON()
      }
    });

  } catch (error) {
    console.error('更新资料失败:', error);
    res.status(500).json({
      success: false,
      message: '更新资料失败',
      error: error.message
    });
  }
});

// 修改密码
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供当前密码和新密码'
      });
    }

    // 获取用户（包含密码）
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败',
      error: error.message
    });
  }
});

// 刷新 token
router.post('/refresh', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 生成新的 token
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Token 刷新成功',
      data: {
        token
      }
    });

  } catch (error) {
    console.error('刷新 token 失败:', error);
    res.status(500).json({
      success: false,
      message: '刷新 token 失败',
      error: error.message
    });
  }
});

// 注销
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // 这里可以实现 token 黑名单机制
    // 暂时只返回成功响应
    
    res.json({
      success: true,
      message: '注销成功'
    });

  } catch (error) {
    console.error('注销失败:', error);
    res.status(500).json({
      success: false,
      message: '注销失败',
      error: error.message
    });
  }
});

// 邮箱验证（发送验证邮件）
router.post('/send-verification', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: '邮箱已验证'
      });
    }

    // TODO: 实现发送验证邮件逻辑
    // const verificationToken = jwt.sign(
    //   { userId: user._id, email: user.email },
    //   process.env.JWT_SECRET,
    //   { expiresIn: '1h' }
    // );
    
    // await emailService.sendVerificationEmail(user.email, verificationToken);

    res.json({
      success: true,
      message: '验证邮件已发送'
    });

  } catch (error) {
    console.error('发送验证邮件失败:', error);
    res.status(500).json({
      success: false,
      message: '发送验证邮件失败',
      error: error.message
    });
  }
});

// 验证邮箱
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: '邮箱已验证'
      });
    }

    // 更新验证状态
    user.emailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: '邮箱验证成功'
    });

  } catch (error) {
    console.error('邮箱验证失败:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: '验证链接无效或已过期'
      });
    }

    res.status(500).json({
      success: false,
      message: '邮箱验证失败',
      error: error.message
    });
  }
});

// 忘记密码
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '请提供邮箱地址'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // 为了安全，不要透露用户是否存在
      return res.json({
        success: true,
        message: '如果邮箱存在，重置链接已发送'
      });
    }

    // TODO: 实现发送重置密码邮件逻辑
    // const resetToken = jwt.sign(
    //   { userId: user._id, email: user.email },
    //   process.env.JWT_SECRET,
    //   { expiresIn: '1h' }
    // );
    
    // await emailService.sendPasswordResetEmail(user.email, resetToken);

    res.json({
      success: true,
      message: '如果邮箱存在，重置链接已发送'
    });

  } catch (error) {
    console.error('发送重置密码邮件失败:', error);
    res.status(500).json({
      success: false,
      message: '发送重置密码邮件失败',
      error: error.message
    });
  }
});

// 重置密码
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: '请提供新密码'
      });
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: '密码重置成功'
    });

  } catch (error) {
    console.error('重置密码失败:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: '重置链接无效或已过期'
      });
    }

    res.status(500).json({
      success: false,
      message: '重置密码失败',
      error: error.message
    });
  }
});

module.exports = router;