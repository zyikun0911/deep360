/**
 * PluginManager 单元测试
 */

// Mock dependencies first
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rmdir: jest.fn()
  }
}));

jest.mock('vm');

const PluginManager = require('../../../services/pluginManager');
const fs = require('fs').promises;
const path = require('path');

describe('PluginManager', () => {
  let pluginManager;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    pluginManager = new PluginManager(mockLogger);
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该成功初始化插件管理器', async () => {
      // Mock 文件系统操作
      fs.mkdir.mockResolvedValue();
      fs.readdir.mockResolvedValue([]);

      await pluginManager.initialize();

      expect(mockLogger.info).toHaveBeenCalledWith('初始化插件管理器...');
      expect(mockLogger.info).toHaveBeenCalledWith('插件管理器初始化完成');
    });

    test('初始化失败时应该抛出错误', async () => {
      const error = new Error('初始化失败');
      fs.mkdir.mockRejectedValue(error);

      await expect(pluginManager.initialize()).rejects.toThrow('初始化失败');
      expect(mockLogger.error).toHaveBeenCalledWith('插件管理器初始化失败:', error);
    });
  });

  describe('插件加载', () => {
    test('应该成功加载有效的插件', async () => {
      const mockManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        main: 'index.js',
        description: 'A test plugin'
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));
      fs.stat.mockResolvedValue({ isDirectory: () => true });

      const plugin = await pluginManager.loadPlugin('/test/path');

      expect(plugin.id).toBe('test-plugin');
      expect(plugin.name).toBe('Test Plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(pluginManager.plugins.has('test-plugin')).toBe(true);
    });

    test('应该拒绝无效的插件清单', async () => {
      const invalidManifest = {
        name: 'Invalid Plugin'
        // 缺少必需的字段
      };

      fs.readFile.mockResolvedValue(JSON.stringify(invalidManifest));

      await expect(pluginManager.loadPlugin('/test/path')).rejects.toThrow();
    });

    test('应该验证插件版本格式', async () => {
      const invalidVersionManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: 'invalid-version',
        main: 'index.js',
        description: 'A test plugin'
      };

      fs.readFile.mockResolvedValue(JSON.stringify(invalidVersionManifest));

      await expect(pluginManager.loadPlugin('/test/path')).rejects.toThrow('插件版本格式不正确');
    });
  });

  describe('插件状态管理', () => {
    beforeEach(async () => {
      // 创建测试插件
      const mockManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        main: 'index.js',
        description: 'A test plugin',
        hooks: ['test.hook']
      };

      fs.readFile.mockResolvedValue(JSON.stringify(mockManifest));
      await pluginManager.loadPlugin('/test/path');
    });

    test('应该能够启动插件', async () => {
      const mockPluginCode = `
        module.exports = {
          initialize: jest.fn(),
          'test.hook': jest.fn()
        };
      `;

      fs.readFile.mockResolvedValue(mockPluginCode);

      await pluginManager.startPlugin('test-plugin');

      expect(pluginManager.pluginStates.get('test-plugin')).toBe('running');
      expect(mockLogger.info).toHaveBeenCalledWith('插件启动成功: Test Plugin');
    });

    test('应该能够停止插件', async () => {
      // 首先启动插件
      const mockPluginInstance = {
        initialize: jest.fn(),
        destroy: jest.fn()
      };

      pluginManager.plugins.get('test-plugin').instance = mockPluginInstance;
      pluginManager.pluginStates.set('test-plugin', 'running');

      await pluginManager.stopPlugin('test-plugin');

      expect(pluginManager.pluginStates.get('test-plugin')).toBe('stopped');
      expect(mockPluginInstance.destroy).toHaveBeenCalled();
    });

    test('应该能够启用和禁用插件', async () => {
      const plugin = pluginManager.plugins.get('test-plugin');
      
      await pluginManager.enablePlugin('test-plugin');
      expect(plugin.config.enabled).toBe(true);

      await pluginManager.disablePlugin('test-plugin');
      expect(plugin.config.enabled).toBe(false);
    });
  });

  describe('插件安全', () => {
    test('应该创建安全的沙箱环境', () => {
      const mockPlugin = {
        id: 'test-plugin',
        path: '/test/path',
        permissions: ['whatsapp.send']
      };

      const sandbox = pluginManager.createSandbox(mockPlugin);

      // 检查沙箱包含必要的API
      expect(sandbox.pluginAPI).toBeDefined();
      expect(sandbox.utils).toBeDefined();
      expect(sandbox.console).toBeDefined();

      // 检查受限的全局对象
      expect(sandbox.process.env).toBeDefined();
      expect(sandbox.global).toEqual({});
    });

    test('require函数应该限制模块访问', () => {
      const mockPlugin = {
        id: 'test-plugin',
        path: '/test/path',
        permissions: []
      };

      const sandbox = pluginManager.createSandbox(mockPlugin);
      const requireFn = sandbox.require;

      // 允许的模块
      expect(() => requireFn('crypto')).not.toThrow();
      expect(() => requireFn('util')).not.toThrow();

      // 不允许的模块
      expect(() => requireFn('fs')).toThrow();
      expect(() => requireFn('child_process')).toThrow();
    });
  });

  describe('钩子系统', () => {
    test('应该能够注册和执行钩子', async () => {
      const mockHandler = jest.fn().mockResolvedValue('test result');
      const mockPlugin = {
        id: 'test-plugin',
        hooks: ['test.hook'],
        instance: {
          'test.hook': mockHandler
        }
      };

      pluginManager.registerPluginHooks(mockPlugin);

      const results = await pluginManager.executeHook('test.hook', 'arg1', 'arg2');

      expect(results).toHaveLength(1);
      expect(results[0].pluginId).toBe('test-plugin');
      expect(results[0].result).toBe('test result');
      expect(mockHandler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('钩子执行错误应该被捕获', async () => {
      const error = new Error('Hook execution failed');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const mockPlugin = {
        id: 'test-plugin',
        hooks: ['test.hook'],
        instance: {
          'test.hook': mockHandler
        }
      };

      pluginManager.registerPluginHooks(mockPlugin);

      const results = await pluginManager.executeHook('test.hook');

      expect(results).toHaveLength(1);
      expect(results[0].pluginId).toBe('test-plugin');
      expect(results[0].error).toBe('Hook execution failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('插件API', () => {
    test('应该提供 WhatsApp API', () => {
      const api = pluginManager.createPluginAPIs();
      
      expect(api.whatsapp).toBeDefined();
      expect(api.whatsapp.sendMessage).toBeInstanceOf(Function);
      expect(api.whatsapp.createGroup).toBeInstanceOf(Function);
    });

    test('应该提供 AI API', () => {
      const api = pluginManager.createPluginAPIs();
      
      expect(api.ai).toBeDefined();
      expect(api.ai.generateText).toBeInstanceOf(Function);
      expect(api.ai.translateText).toBeInstanceOf(Function);
    });

    test('应该提供数据库 API', () => {
      const api = pluginManager.createPluginAPIs();
      
      expect(api.database).toBeDefined();
      expect(api.database.save).toBeInstanceOf(Function);
      expect(api.database.find).toBeInstanceOf(Function);
    });
  });

  describe('插件工具', () => {
    test('应该提供日志工具', () => {
      const mockPlugin = { id: 'test-plugin', path: '/test' };
      const utils = pluginManager.createPluginUtils(mockPlugin);

      utils.log('info', 'Test message', { key: 'value' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        '[Plugin:test-plugin] Test message',
        { key: 'value' }
      );
    });

    test('应该提供配置管理工具', () => {
      const mockPlugin = {
        id: 'test-plugin',
        path: '/test',
        config: { key1: 'value1', key2: 'value2' }
      };
      const utils = pluginManager.createPluginUtils(mockPlugin);

      expect(utils.getConfig('key1')).toBe('value1');
      expect(utils.getConfig()).toEqual({ key1: 'value1', key2: 'value2' });
    });

    test('应该提供文件操作工具', async () => {
      const mockPlugin = { id: 'test-plugin', path: '/test' };
      const utils = pluginManager.createPluginUtils(mockPlugin);

      fs.readFile.mockResolvedValue('file content');
      
      const content = await utils.readFile('test.txt');
      
      expect(content).toBe('file content');
      expect(fs.readFile).toHaveBeenCalledWith('/test/test.txt', 'utf8');
    });
  });

  describe('统计信息', () => {
    test('应该返回正确的统计信息', () => {
      // 添加一些测试插件
      pluginManager.plugins.set('plugin1', { category: 'messaging', type: 'extension' });
      pluginManager.plugins.set('plugin2', { category: 'ai', type: 'core' });
      pluginManager.pluginStates.set('plugin1', 'running');
      pluginManager.pluginStates.set('plugin2', 'stopped');

      const stats = pluginManager.getStatistics();

      expect(stats.total).toBe(2);
      expect(stats.running).toBe(1);
      expect(stats.stopped).toBe(1);
      expect(stats.byCategory.messaging).toBe(1);
      expect(stats.byCategory.ai).toBe(1);
      expect(stats.byType.extension).toBe(1);
      expect(stats.byType.core).toBe(1);
    });
  });
});