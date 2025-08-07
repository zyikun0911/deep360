const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const Plugin = require('../models/Plugin');

const router = express.Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'plugins/temp/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'plugin-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /\.(zip|tar\.gz|tgz)$/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传 ZIP、TAR.GZ 格式的插件包'));
    }
  }
});

// 获取所有插件
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { category, type, status, search, page = 1, limit = 20 } = req.query;

    // 构建查询条件
    const query = {};
    if (category) query.category = category;
    if (type) query.type = type;
    if (status) query['status.state'] = status;

    let plugins;
    if (search) {
      plugins = await Plugin.search(search);
    } else {
      plugins = await Plugin.find(query);
    }

    // 分页
    const skip = (page - 1) * limit;
    const paginatedPlugins = plugins.slice(skip, skip + parseInt(limit));

    // 获取运行时状态
    const pluginManager = services.pluginManager;
    const runtimeData = pluginManager.getAllPlugins();

    // 合并数据
    const result = paginatedPlugins.map(plugin => {
      const runtime = runtimeData.find(r => r.id === plugin.id);
      return {
        ...plugin.toJSON(),
        runtime: runtime || null
      };
    });

    res.json({
      success: true,
      data: {
        plugins: result,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: plugins.length,
          pages: Math.ceil(plugins.length / limit)
        }
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取插件列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取插件列表失败',
      error: error.message
    });
  }
});

// 获取单个插件详情
router.get('/:pluginId', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { pluginId } = req.params;

    const plugin = await Plugin.findOne({ id: pluginId });
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: '插件不存在'
      });
    }

    // 获取运行时状态
    const pluginManager = services.pluginManager;
    const runtime = pluginManager.getPlugin(pluginId);

    res.json({
      success: true,
      data: {
        ...plugin.toJSON(),
        runtime: runtime || null
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取插件详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取插件详情失败',
      error: error.message
    });
  }
});

// 安装插件
router.post('/install', authMiddleware, requirePermission('plugin_manage'), upload.single('plugin'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { source, url } = req.body;
    const file = req.file;

    let installSource;
    if (file) {
      installSource = file.path;
    } else if (url) {
      installSource = url;
    } else if (source) {
      installSource = source;
    } else {
      return res.status(400).json({
        success: false,
        message: '请提供插件包文件、URL或源标识'
      });
    }

    const pluginManager = services.pluginManager;
    const plugin = await pluginManager.installPlugin(installSource, {
      userId: req.user.userId
    });

    // 保存到数据库
    const pluginDoc = new Plugin({
      ...plugin.manifest,
      installation: {
        installDate: new Date(),
        installedBy: req.user.userId,
        installSource: typeof installSource === 'string' && installSource.startsWith('http') ? 'url' : 'upload'
      }
    });
    await pluginDoc.save();

    res.json({
      success: true,
      message: '插件安装成功',
      data: {
        plugin: pluginDoc,
        nextSteps: [
          '配置插件参数（如需要）',
          '启用插件开始使用',
          '查看插件文档了解功能'
        ]
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('安装插件失败:', error);
    res.status(500).json({
      success: false,
      message: '安装插件失败',
      error: error.message
    });
  }
});

// 卸载插件
router.delete('/:pluginId', authMiddleware, requirePermission('plugin_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { pluginId } = req.params;

    // 从数据库获取插件信息
    const plugin = await Plugin.findOne({ id: pluginId });
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: '插件不存在'
      });
    }

    // 卸载插件
    const pluginManager = services.pluginManager;
    await pluginManager.uninstallPlugin(pluginId);

    // 从数据库删除
    await Plugin.deleteOne({ id: pluginId });

    res.json({
      success: true,
      message: '插件卸载成功',
      data: {
        pluginId,
        name: plugin.name
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('卸载插件失败:', error);
    res.status(500).json({
      success: false,
      message: '卸载插件失败',
      error: error.message
    });
  }
});

// 启用插件
router.post('/:pluginId/enable', authMiddleware, requirePermission('plugin_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { pluginId } = req.params;

    const plugin = await Plugin.findOne({ id: pluginId });
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: '插件不存在'
      });
    }

    // 启用插件
    const pluginManager = services.pluginManager;
    await pluginManager.enablePlugin(pluginId);

    // 更新数据库状态
    await plugin.enable();

    res.json({
      success: true,
      message: '插件启用成功',
      data: {
        pluginId,
        name: plugin.name,
        status: 'enabled'
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('启用插件失败:', error);
    res.status(500).json({
      success: false,
      message: '启用插件失败',
      error: error.message
    });
  }
});

// 禁用插件
router.post('/:pluginId/disable', authMiddleware, requirePermission('plugin_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { pluginId } = req.params;

    const plugin = await Plugin.findOne({ id: pluginId });
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: '插件不存在'
      });
    }

    // 禁用插件
    const pluginManager = services.pluginManager;
    await pluginManager.disablePlugin(pluginId);

    // 更新数据库状态
    await plugin.disable();

    res.json({
      success: true,
      message: '插件禁用成功',
      data: {
        pluginId,
        name: plugin.name,
        status: 'disabled'
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('禁用插件失败:', error);
    res.status(500).json({
      success: false,
      message: '禁用插件失败',
      error: error.message
    });
  }
});

// 更新插件
router.post('/:pluginId/update', authMiddleware, requirePermission('plugin_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { pluginId } = req.params;
    const { version = 'latest' } = req.body;

    const plugin = await Plugin.findOne({ id: pluginId });
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: '插件不存在'
      });
    }

    // 更新插件
    const pluginManager = services.pluginManager;
    await pluginManager.updatePlugin(pluginId, version);

    // 更新数据库记录
    const updatedManifest = pluginManager.getPlugin(pluginId).manifest;
    Object.assign(plugin, updatedManifest);
    await plugin.save();

    res.json({
      success: true,
      message: '插件更新成功',
      data: {
        pluginId,
        name: plugin.name,
        oldVersion: plugin.version,
        newVersion: updatedManifest.version
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('更新插件失败:', error);
    res.status(500).json({
      success: false,
      message: '更新插件失败',
      error: error.message
    });
  }
});

// 配置插件
router.put('/:pluginId/config', authMiddleware, requirePermission('plugin_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { pluginId } = req.params;
    const { config } = req.body;

    const plugin = await Plugin.findOne({ id: pluginId });
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: '插件不存在'
      });
    }

    // 更新配置
    plugin.userConfig = { ...plugin.userConfig, ...config };
    await plugin.save();

    // 如果插件正在运行，重新加载配置
    const pluginManager = services.pluginManager;
    const runtimePlugin = pluginManager.getPlugin(pluginId);
    if (runtimePlugin && runtimePlugin.state === 'running') {
      Object.assign(runtimePlugin.config, config);
      await pluginManager.savePluginConfig(runtimePlugin);
    }

    res.json({
      success: true,
      message: '插件配置更新成功',
      data: {
        pluginId,
        config: plugin.userConfig
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('更新插件配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新插件配置失败',
      error: error.message
    });
  }
});

// 获取插件日志
router.get('/:pluginId/logs', authMiddleware, requirePermission('plugin_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { pluginId } = req.params;
    const { level = 'info', limit = 100 } = req.query;

    const plugin = await Plugin.findOne({ id: pluginId });
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: '插件不存在'
      });
    }

    // 读取插件日志文件
    const logPath = path.join('plugins/logs', `${pluginId}.log`);
    try {
      const logContent = await fs.readFile(logPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      // 解析和过滤日志
      const logs = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, level: 'info', timestamp: new Date() };
          }
        })
        .filter(log => level === 'all' || log.level === level)
        .slice(-limit);

      res.json({
        success: true,
        data: {
          pluginId,
          logs,
          total: logs.length
        }
      });

    } catch (error) {
      if (error.code === 'ENOENT') {
        res.json({
          success: true,
          data: {
            pluginId,
            logs: [],
            total: 0,
            message: '暂无日志记录'
          }
        });
      } else {
        throw error;
      }
    }

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取插件日志失败:', error);
    res.status(500).json({
      success: false,
      message: '获取插件日志失败',
      error: error.message
    });
  }
});

// 插件市场
router.get('/marketplace/featured', authMiddleware, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const featuredPlugins = await Plugin.find({ 'marketplace.featured': true })
      .sort({ 'marketplace.rating.average': -1, 'marketplace.downloads': -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: featuredPlugins
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取推荐插件失败:', error);
    res.status(500).json({
      success: false,
      message: '获取推荐插件失败',
      error: error.message
    });
  }
});

// 插件市场搜索
router.get('/marketplace/search', authMiddleware, async (req, res) => {
  try {
    const { q, category, type, page = 1, limit = 20 } = req.query;

    let query = {};
    if (category) query.category = category;
    if (type) query.type = type;

    let plugins;
    if (q) {
      plugins = await Plugin.search(q);
      if (category || type) {
        plugins = plugins.filter(plugin => {
          return (!category || plugin.category === category) &&
                 (!type || plugin.type === type);
        });
      }
    } else {
      plugins = await Plugin.find(query);
    }

    // 按评分和下载量排序
    plugins.sort((a, b) => {
      const scoreA = a.marketplace.rating.average * 0.7 + Math.log(a.marketplace.downloads + 1) * 0.3;
      const scoreB = b.marketplace.rating.average * 0.7 + Math.log(b.marketplace.downloads + 1) * 0.3;
      return scoreB - scoreA;
    });

    // 分页
    const skip = (page - 1) * limit;
    const paginatedPlugins = plugins.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        plugins: paginatedPlugins,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: plugins.length,
          pages: Math.ceil(plugins.length / limit)
        }
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('搜索插件失败:', error);
    res.status(500).json({
      success: false,
      message: '搜索插件失败',
      error: error.message
    });
  }
});

// 添加插件评价
router.post('/:pluginId/review', authMiddleware, async (req, res) => {
  try {
    const { services } = req.app.locals;
    const { pluginId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: '评分必须在1-5之间'
      });
    }

    const plugin = await Plugin.findOne({ id: pluginId });
    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: '插件不存在'
      });
    }

    // 检查用户是否已经评价过
    const existingReview = plugin.marketplace.reviews.find(
      review => review.userId.toString() === req.user.userId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: '您已经评价过此插件'
      });
    }

    // 添加评价
    await plugin.addReview(req.user.userId, rating, comment);

    res.json({
      success: true,
      message: '评价添加成功',
      data: {
        pluginId,
        rating,
        comment,
        newAverage: plugin.marketplace.rating.average
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('添加插件评价失败:', error);
    res.status(500).json({
      success: false,
      message: '添加插件评价失败',
      error: error.message
    });
  }
});

// 获取插件统计
router.get('/stats/overview', authMiddleware, requirePermission('plugin_manage'), async (req, res) => {
  try {
    const { services } = req.app.locals;

    // 数据库统计
    const totalPlugins = await Plugin.countDocuments();
    const enabledPlugins = await Plugin.countDocuments({ 'status.state': 'enabled' });
    const disabledPlugins = await Plugin.countDocuments({ 'status.state': 'disabled' });
    const errorPlugins = await Plugin.countDocuments({ 'status.state': 'error' });

    // 按分类统计
    const categoryStats = await Plugin.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // 运行时统计
    const pluginManager = services.pluginManager;
    const runtimeStats = pluginManager.getStatistics();

    res.json({
      success: true,
      data: {
        total: totalPlugins,
        enabled: enabledPlugins,
        disabled: disabledPlugins,
        error: errorPlugins,
        byCategory: categoryStats,
        runtime: runtimeStats,
        popularPlugins: await Plugin.findPopular(5)
      }
    });

  } catch (error) {
    const { services } = req.app.locals;
    services.logger.error('获取插件统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取插件统计失败',
      error: error.message
    });
  }
});

module.exports = router;