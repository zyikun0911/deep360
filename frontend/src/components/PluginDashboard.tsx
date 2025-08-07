/**
 * 插件仪表板 - 智能布局引擎和插件管理中心
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Button,
  Space,
  Dropdown,
  Menu,
  Input,
  Select,
  Switch,
  Modal,
  List,
  Avatar,
  Badge,
  Tag,
  Tooltip,
  message,
  Drawer,
  Tabs,
  Divider,
  Empty,
  Spin
} from 'antd';
import {
  AppstoreOutlined,
  SettingOutlined,
  SearchOutlined,
  FilterOutlined,
  LayoutOutlined,
  PlusOutlined,
  StarOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { PluginContainer } from './PluginContainer';
import { PluginMarketplace } from './PluginMarketplace';

const { Content, Sider } = Layout;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface Plugin {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  type: 'widget' | 'panel' | 'chart' | 'form' | 'table';
  icon: React.ReactNode;
  version: string;
  status: 'active' | 'loading' | 'error' | 'disabled';
  author: string;
  installed: boolean;
  featured: boolean;
  rating: number;
  downloads: number;
  lastUpdated: string;
  size: { width: number; height: number };
  position: { x: number; y: number };
  config: Record<string, any>;
  dependencies: string[];
}

interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  plugins: Plugin[];
  isDefault: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PluginDashboardProps {
  initialLayout?: DashboardLayout;
  editable?: boolean;
  onLayoutChange?: (layout: DashboardLayout) => void;
}

export const PluginDashboard: React.FC<PluginDashboardProps> = ({
  initialLayout,
  editable = true,
  onLayoutChange
}) => {
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout | null>(initialLayout || null);
  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([]);
  const [selectedPlugins, setSelectedPlugins] = useState<Plugin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'free'>('grid');
  const [editMode, setEditMode] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showLayoutManager, setShowLayoutManager] = useState(false);
  const [loading, setLoading] = useState(true);

  // 插件分类
  const categories = [
    { key: 'all', label: '全部', count: 0 },
    { key: 'messaging', label: '消息通讯', count: 0 },
    { key: 'automation', label: '自动化', count: 0 },
    { key: 'ai', label: 'AI增强', count: 0 },
    { key: 'analytics', label: '数据分析', count: 0 },
    { key: 'security', label: '安全防护', count: 0 },
    { key: 'integration', label: '第三方集成', count: 0 },
    { key: 'utility', label: '实用工具', count: 0 },
    { key: 'marketing', label: '营销工具', count: 0 },
    { key: 'crm', label: '客户管理', count: 0 },
    { key: 'workflow', label: '工作流', count: 0 }
  ];

  // 加载可用插件
  const loadAvailablePlugins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plugins/available');
      const plugins = await response.json();
      setAvailablePlugins(plugins);
      
      // 加载当前布局
      if (initialLayout) {
        setCurrentLayout(initialLayout);
        setSelectedPlugins(initialLayout.plugins);
      } else {
        // 加载默认布局
        const defaultResponse = await fetch('/api/plugins/layouts/default');
        const defaultLayout = await defaultResponse.json();
        setCurrentLayout(defaultLayout);
        setSelectedPlugins(defaultLayout.plugins);
      }
    } catch (error) {
      message.error('加载插件失败');
    } finally {
      setLoading(false);
    }
  }, [initialLayout]);

  useEffect(() => {
    loadAvailablePlugins();
  }, [loadAvailablePlugins]);

  // 过滤插件
  const filteredPlugins = useMemo(() => {
    return availablePlugins.filter(plugin => {
      const matchesSearch = plugin.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || plugin.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [availablePlugins, searchTerm, categoryFilter]);

  // 添加插件到布局
  const addPluginToLayout = useCallback((plugin: Plugin) => {
    const newPlugin = {
      ...plugin,
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      size: plugin.size || { width: 300, height: 200 }
    };
    
    setSelectedPlugins(prev => [...prev, newPlugin]);
    message.success(`插件 "${plugin.displayName}" 已添加到布局`);
  }, []);

  // 从布局中移除插件
  const removePluginFromLayout = useCallback((pluginId: string) => {
    setSelectedPlugins(prev => prev.filter(p => p.id !== pluginId));
    message.success('插件已从布局中移除');
  }, []);

  // 更新插件位置
  const updatePluginPosition = useCallback((pluginId: string, position: { x: number; y: number }) => {
    setSelectedPlugins(prev => 
      prev.map(p => p.id === pluginId ? { ...p, position } : p)
    );
  }, []);

  // 更新插件大小
  const updatePluginSize = useCallback((pluginId: string, size: { width: number; height: number }) => {
    setSelectedPlugins(prev => 
      prev.map(p => p.id === pluginId ? { ...p, size } : p)
    );
  }, []);

  // 保存布局
  const saveLayout = useCallback(async () => {
    if (!currentLayout) return;
    
    try {
      const updatedLayout = {
        ...currentLayout,
        plugins: selectedPlugins,
        updatedAt: new Date().toISOString()
      };
      
      await fetch(`/api/plugins/layouts/${currentLayout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedLayout)
      });
      
      setCurrentLayout(updatedLayout);
      onLayoutChange?.(updatedLayout);
      message.success('布局已保存');
    } catch (error) {
      message.error('保存布局失败');
    }
  }, [currentLayout, selectedPlugins, onLayoutChange]);

  // 重置布局
  const resetLayout = useCallback(() => {
    Modal.confirm({
      title: '重置布局',
      content: '确定要重置当前布局吗？所有自定义设置将丢失。',
      onOk: () => {
        setSelectedPlugins(currentLayout?.plugins || []);
        message.success('布局已重置');
      }
    });
  }, [currentLayout]);

  // 智能推荐布局
  const generateSmartLayout = useCallback(() => {
    Modal.confirm({
      title: 'AI智能布局',
      content: '根据您的使用习惯和插件特性，AI将为您生成最优布局，是否继续？',
      onOk: async () => {
        try {
          const response = await fetch('/api/plugins/layouts/smart-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              currentPlugins: selectedPlugins,
              userPreferences: {}
            })
          });
          const smartLayout = await response.json();
          setSelectedPlugins(smartLayout.plugins);
          message.success('AI智能布局已生成');
        } catch (error) {
          message.error('生成智能布局失败');
        }
      }
    });
  }, [selectedPlugins]);

  // 渲染插件库侧边栏
  const renderPluginLibrary = () => (
    <Sider width={320} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
      <div style={{ padding: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Search
            placeholder="搜索插件..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            style={{ width: '100%' }}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="选择分类"
          >
            {categories.map(cat => (
              <Option key={cat.key} value={cat.key}>
                {cat.label} {cat.count > 0 && `(${cat.count})`}
              </Option>
            ))}
          </Select>
          
          <Space>
            <Button 
              icon={<AppstoreOutlined />}
              onClick={() => setShowMarketplace(true)}
            >
              插件市场
            </Button>
            <Button 
              icon={<LayoutOutlined />}
              onClick={() => setShowLayoutManager(true)}
            >
              布局管理
            </Button>
          </Space>
        </Space>
      </div>
      
      <div style={{ height: 'calc(100vh - 200px)', overflowY: 'auto', padding: '0 16px' }}>
        <List
          dataSource={filteredPlugins}
          renderItem={(plugin) => (
            <List.Item
              actions={[
                <Tooltip title="添加到布局">
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => addPluginToLayout(plugin)}
                    disabled={selectedPlugins.some(p => p.id === plugin.id)}
                  />
                </Tooltip>,
                <Dropdown overlay={
                  <Menu>
                    <Menu.Item icon={<EyeOutlined />}>预览</Menu.Item>
                    <Menu.Item icon={<SettingOutlined />}>配置</Menu.Item>
                    <Menu.Item icon={<StarOutlined />}>收藏</Menu.Item>
                  </Menu>
                } trigger={['click']}>
                  <Button type="text" icon={<SettingOutlined />} />
                </Dropdown>
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={plugin.icon} />}
                title={
                  <Space>
                    {plugin.displayName}
                    <Badge status={plugin.status === 'active' ? 'success' : 'default'} />
                    {plugin.featured && <Tag color="gold">精选</Tag>}
                  </Space>
                }
                description={
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {plugin.description}
                    </div>
                    <Space size="small" style={{ marginTop: '4px' }}>
                      <Tag size="small">{plugin.category}</Tag>
                      <span style={{ fontSize: '11px', color: '#999' }}>
                        v{plugin.version}
                      </span>
                    </Space>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </Sider>
  );

  // 渲染工具栏
  const renderToolbar = () => (
    <div style={{
      background: '#fff',
      padding: '12px 24px',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <Space>
        <h3 style={{ margin: 0 }}>
          {currentLayout?.name || '我的工作台'}
        </h3>
        <Tag color="blue">{selectedPlugins.length} 个插件</Tag>
      </Space>
      
      <Space>
        <Switch
          checkedChildren="编辑"
          unCheckedChildren="预览"
          checked={editMode}
          onChange={setEditMode}
        />
        
        <Select
          value={layoutMode}
          onChange={setLayoutMode}
          style={{ width: 100 }}
        >
          <Option value="grid">网格</Option>
          <Option value="free">自由</Option>
        </Select>
        
        <Button icon={<RobotOutlined />} onClick={generateSmartLayout}>
          AI布局
        </Button>
        
        <Button icon={<ThunderboltOutlined />} onClick={saveLayout} type="primary">
          保存
        </Button>
        
        <Dropdown overlay={
          <Menu>
            <Menu.Item icon={<HistoryOutlined />} onClick={resetLayout}>
              重置布局
            </Menu.Item>
            <Menu.Item icon={<DownloadOutlined />}>
              导出布局
            </Menu.Item>
            <Menu.Item icon={<ShareAltOutlined />}>
              分享布局
            </Menu.Item>
          </Menu>
        } trigger={['click']}>
          <Button icon={<SettingOutlined />} />
        </Dropdown>
      </Space>
    </div>
  );

  // 渲染主内容区域
  const renderMainContent = () => {
    if (loading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh' 
        }}>
          <Spin size="large" tip="加载插件中..." />
        </div>
      );
    }

    if (selectedPlugins.length === 0) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh' 
        }}>
          <Empty 
            description="暂无插件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setShowMarketplace(true)}
            >
              添加插件
            </Button>
          </Empty>
        </div>
      );
    }

    return (
      <div style={{ 
        position: 'relative', 
        height: 'calc(100vh - 180px)', 
        overflow: 'hidden',
        background: '#f5f5f5'
      }}>
        {selectedPlugins.map((plugin) => (
          <PluginContainer
            key={plugin.id}
            plugin={plugin}
            size={plugin.size}
            position={plugin.position}
            resizable={editMode}
            draggable={editMode}
            closable={editMode}
            onResize={(size) => updatePluginSize(plugin.id, size)}
            onMove={(position) => updatePluginPosition(plugin.id, position)}
            onClose={() => removePluginFromLayout(plugin.id)}
            onSettings={() => {
              // 打开插件设置
              message.info(`配置插件: ${plugin.displayName}`);
            }}
            onRefresh={() => {
              // 刷新插件
              message.info(`刷新插件: ${plugin.displayName}`);
            }}
          >
            {/* 这里渲染具体的插件内容 */}
            <div style={{ padding: '16px' }}>
              <h4>{plugin.displayName}</h4>
              <p>{plugin.description}</p>
              <div style={{ marginTop: '16px' }}>
                插件内容区域 - {plugin.type}
              </div>
            </div>
          </PluginContainer>
        ))}
      </div>
    );
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {renderPluginLibrary()}
      
      <Layout>
        {renderToolbar()}
        <Content style={{ background: '#fff' }}>
          {renderMainContent()}
        </Content>
      </Layout>

      {/* 插件市场弹窗 */}
      <Modal
        title="插件市场"
        visible={showMarketplace}
        onCancel={() => setShowMarketplace(false)}
        width={1000}
        footer={null}
      >
        <PluginMarketplace 
          onInstall={(plugin) => {
            setAvailablePlugins(prev => [...prev, plugin]);
            message.success(`插件 "${plugin.displayName}" 安装成功`);
          }}
        />
      </Modal>

      {/* 布局管理抽屉 */}
      <Drawer
        title="布局管理"
        placement="right"
        width={400}
        visible={showLayoutManager}
        onClose={() => setShowLayoutManager(false)}
      >
        <div>布局管理内容...</div>
      </Drawer>
    </Layout>
  );
};