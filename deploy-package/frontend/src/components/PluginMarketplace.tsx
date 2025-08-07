/**
 * 插件市场 - 发现、安装、管理插件
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Select,
  Tabs,
  List,
  Avatar,
  Rate,
  Tag,
  Space,
  Badge,
  Statistic,
  Modal,
  Image,
  Descriptions,
  Progress,
  message,
  Spin,
  Empty,
  Tooltip,
  Divider,
  Typography,
  Alert
} from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  StarOutlined,
  EyeOutlined,
  HeartOutlined,
  ShopOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  GlobalOutlined,
  RobotOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface MarketplacePlugin {
  id: string;
  name: string;
  displayName: string;
  description: string;
  longDescription: string;
  category: string;
  type: string;
  icon: string;
  screenshots: string[];
  version: string;
  author: {
    name: string;
    avatar: string;
    verified: boolean;
  };
  pricing: {
    type: 'free' | 'freemium' | 'paid';
    price?: number;
    currency?: string;
    trial?: boolean;
  };
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
    favorites: number;
  };
  status: 'published' | 'beta' | 'deprecated';
  tags: string[];
  requirements: {
    minVersion: string;
    dependencies: string[];
    permissions: string[];
  };
  changelog: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
  support: {
    documentation: string;
    issues: string;
    community: string;
  };
  security: {
    verified: boolean;
    audited: boolean;
    lastAudit: string;
  };
  featured: boolean;
  trending: boolean;
  newRelease: boolean;
  installed: boolean;
  installing: boolean;
}

interface PluginMarketplaceProps {
  onInstall: (plugin: MarketplacePlugin) => void;
  onUninstall?: (pluginId: string) => void;
  installedPlugins?: string[];
}

export const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({
  onInstall,
  onUninstall,
  installedPlugins = []
}) => {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [priceFilter, setPriceFilter] = useState('all');
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);
  const [showPluginDetail, setShowPluginDetail] = useState(false);
  const [installingPlugins, setInstallingPlugins] = useState<Set<string>>(new Set());

  // 插件分类
  const categories = [
    { key: 'all', label: '全部分类', icon: <ShopOutlined /> },
    { key: 'messaging', label: '消息通讯', icon: <MessageOutlined /> },
    { key: 'automation', label: '自动化', icon: <ThunderboltOutlined /> },
    { key: 'ai', label: 'AI增强', icon: <RobotOutlined /> },
    { key: 'analytics', label: '数据分析', icon: <BarChartOutlined /> },
    { key: 'security', label: '安全防护', icon: <SafetyOutlined /> },
    { key: 'integration', label: '第三方集成', icon: <GlobalOutlined /> },
    { key: 'utility', label: '实用工具', icon: <SettingOutlined /> }
  ];

  // 排序选项
  const sortOptions = [
    { key: 'featured', label: '精选推荐' },
    { key: 'downloads', label: '下载量' },
    { key: 'rating', label: '评分' },
    { key: 'newest', label: '最新发布' },
    { key: 'updated', label: '最近更新' },
    { key: 'name', label: '名称' }
  ];

  // 价格筛选
  const priceOptions = [
    { key: 'all', label: '全部' },
    { key: 'free', label: '免费' },
    { key: 'freemium', label: '免费增值' },
    { key: 'paid', label: '付费' }
  ];

  // 加载插件市场数据
  const loadMarketplacePlugins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plugins/marketplace');
      const data = await response.json();
      setPlugins(data.plugins || []);
    } catch (error) {
      message.error('加载插件市场失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplacePlugins();
  }, []);

  // 过滤和排序插件
  const filteredAndSortedPlugins = useMemo(() => {
    let filtered = plugins.filter(plugin => {
      const matchesSearch = plugin.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           plugin.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || plugin.category === categoryFilter;
      
      const matchesPrice = priceFilter === 'all' || plugin.pricing.type === priceFilter;
      
      return matchesSearch && matchesCategory && matchesPrice;
    });

    // 排序
    switch (sortBy) {
      case 'downloads':
        filtered.sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;
      case 'rating':
        filtered.sort((a, b) => b.stats.rating - a.stats.rating);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.changelog[0]?.date || 0).getTime() - new Date(a.changelog[0]?.date || 0).getTime());
        break;
      case 'name':
        filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
      default: // featured
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          if (a.trending && !b.trending) return -1;
          if (!a.trending && b.trending) return 1;
          return b.stats.downloads - a.stats.downloads;
        });
    }

    return filtered;
  }, [plugins, searchTerm, categoryFilter, sortBy, priceFilter]);

  // 安装插件
  const handleInstallPlugin = async (plugin: MarketplacePlugin) => {
    try {
      setInstallingPlugins(prev => new Set([...prev, plugin.id]));
      
      // 模拟安装过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`/api/plugins/install/${plugin.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        message.success(`插件 "${plugin.displayName}" 安装成功`);
        onInstall({ ...plugin, installed: true });
        
        // 更新本地状态
        setPlugins(prev => 
          prev.map(p => p.id === plugin.id ? { ...p, installed: true } : p)
        );
      } else {
        throw new Error('安装失败');
      }
    } catch (error) {
      message.error(`插件安装失败: ${error.message}`);
    } finally {
      setInstallingPlugins(prev => {
        const newSet = new Set(prev);
        newSet.delete(plugin.id);
        return newSet;
      });
    }
  };

  // 卸载插件
  const handleUninstallPlugin = async (plugin: MarketplacePlugin) => {
    Modal.confirm({
      title: '卸载插件',
      content: `确定要卸载插件 "${plugin.displayName}" 吗？`,
      onOk: async () => {
        try {
          await fetch(`/api/plugins/uninstall/${plugin.id}`, {
            method: 'DELETE'
          });
          
          message.success(`插件 "${plugin.displayName}" 已卸载`);
          onUninstall?.(plugin.id);
          
          setPlugins(prev => 
            prev.map(p => p.id === plugin.id ? { ...p, installed: false } : p)
          );
        } catch (error) {
          message.error('卸载插件失败');
        }
      }
    });
  };

  // 渲染插件卡片
  const renderPluginCard = (plugin: MarketplacePlugin) => {
    const isInstalled = plugin.installed || installedPlugins.includes(plugin.id);
    const isInstalling = installingPlugins.has(plugin.id);

    return (
      <Card
        key={plugin.id}
        hoverable
        size="small"
        style={{ height: '100%' }}
        cover={
          <div style={{ position: 'relative', height: '120px', overflow: 'hidden' }}>
            <Image
              src={plugin.screenshots[0] || '/plugin-placeholder.png'}
              alt={plugin.displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              preview={false}
            />
            <div style={{ position: 'absolute', top: 8, right: 8 }}>
              {plugin.featured && <Badge.Ribbon text="精选" color="gold" />}
              {plugin.trending && <Badge.Ribbon text="热门" color="red" />}
              {plugin.newRelease && <Badge.Ribbon text="新品" color="green" />}
            </div>
            <div style={{ position: 'absolute', top: 8, left: 8 }}>
              {plugin.security.verified && (
                <Tooltip title="已验证">
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
                </Tooltip>
              )}
            </div>
          </div>
        }
        actions={[
          <Tooltip title="查看详情">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedPlugin(plugin);
                setShowPluginDetail(true);
              }}
            />
          </Tooltip>,
          isInstalled ? (
            <Button 
              type="text" 
              danger
              onClick={() => handleUninstallPlugin(plugin)}
            >
              卸载
            </Button>
          ) : (
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              loading={isInstalling}
              onClick={() => handleInstallPlugin(plugin)}
              disabled={plugin.pricing.type === 'paid'}
            >
              {isInstalling ? '安装中' : '安装'}
            </Button>
          ),
          <Tooltip title="收藏">
            <Button type="text" icon={<HeartOutlined />} />
          </Tooltip>
        ]}
      >
        <Card.Meta
          avatar={<Avatar src={plugin.icon} size="large" />}
          title={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                {plugin.displayName}
                {isInstalled && <Tag color="green" size="small">已安装</Tag>}
              </div>
              <Space>
                <Rate disabled defaultValue={plugin.stats.rating} style={{ fontSize: '12px' }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  ({plugin.stats.reviews})
                </Text>
              </Space>
            </Space>
          }
          description={
            <div>
              <Text ellipsis style={{ fontSize: '12px', color: '#666' }}>
                {plugin.description}
              </Text>
              <div style={{ marginTop: '8px' }}>
                <Space wrap size="small">
                  <Tag size="small" color="blue">{plugin.category}</Tag>
                  {plugin.pricing.type === 'free' && <Tag size="small" color="green">免费</Tag>}
                  {plugin.pricing.type === 'paid' && (
                    <Tag size="small" color="orange">
                      ¥{plugin.pricing.price}
                    </Tag>
                  )}
                </Space>
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                <Space split={<Divider type="vertical" />}>
                  <span>{plugin.stats.downloads.toLocaleString()} 下载</span>
                  <span>v{plugin.version}</span>
                  <span>{plugin.author.name}</span>
                </Space>
              </div>
            </div>
          }
        />
      </Card>
    );
  };

  // 渲染插件详情
  const renderPluginDetail = () => {
    if (!selectedPlugin) return null;

    return (
      <Modal
        title={selectedPlugin.displayName}
        visible={showPluginDetail}
        onCancel={() => setShowPluginDetail(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setShowPluginDetail(false)}>
            关闭
          </Button>,
          selectedPlugin.installed ? (
            <Button 
              key="uninstall" 
              danger
              onClick={() => handleUninstallPlugin(selectedPlugin)}
            >
              卸载插件
            </Button>
          ) : (
            <Button 
              key="install" 
              type="primary"
              icon={<DownloadOutlined />}
              loading={installingPlugins.has(selectedPlugin.id)}
              onClick={() => handleInstallPlugin(selectedPlugin)}
            >
              安装插件
            </Button>
          )
        ]}
      >
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Image.PreviewGroup>
              <Row gutter={[8, 8]}>
                {selectedPlugin.screenshots.map((screenshot, index) => (
                  <Col span={6} key={index}>
                    <Image
                      src={screenshot}
                      alt={`截图 ${index + 1}`}
                      style={{ width: '100%', borderRadius: '4px' }}
                    />
                  </Col>
                ))}
              </Row>
            </Image.PreviewGroup>
          </Col>
          
          <Col span={16}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Title level={4}>{selectedPlugin.displayName}</Title>
                <Text>{selectedPlugin.longDescription}</Text>
              </div>
              
              <Descriptions column={1} size="small">
                <Descriptions.Item label="版本">{selectedPlugin.version}</Descriptions.Item>
                <Descriptions.Item label="作者">
                  <Space>
                    <Avatar size="small" src={selectedPlugin.author.avatar} />
                    {selectedPlugin.author.name}
                    {selectedPlugin.author.verified && (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    )}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="分类">{selectedPlugin.category}</Descriptions.Item>
                <Descriptions.Item label="标签">
                  <Space wrap>
                    {selectedPlugin.tags.map(tag => (
                      <Tag key={tag} size="small">{tag}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Space>
          </Col>
          
          <Col span={8}>
            <Card size="small" title="统计信息">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic
                  title="下载量"
                  value={selectedPlugin.stats.downloads}
                  prefix={<DownloadOutlined />}
                />
                <div>
                  <Text>评分</Text>
                  <div>
                    <Rate disabled value={selectedPlugin.stats.rating} style={{ fontSize: '14px' }} />
                    <Text style={{ marginLeft: '8px' }}>
                      ({selectedPlugin.stats.reviews} 评价)
                    </Text>
                  </div>
                </div>
                <Statistic
                  title="收藏"
                  value={selectedPlugin.stats.favorites}
                  prefix={<HeartOutlined />}
                />
              </Space>
            </Card>
            
            {selectedPlugin.security.verified && (
              <Alert
                message="安全验证"
                description="此插件已通过安全审核"
                type="success"
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </Col>
        </Row>
      </Modal>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="加载插件市场..." />
      </div>
    );
  }

  return (
    <div>
      {/* 搜索和筛选栏 */}
      <div style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Search
              placeholder="搜索插件、标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="large"
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="分类"
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
              size="large"
            >
              {categories.map(cat => (
                <Option key={cat.key} value={cat.key}>
                  <Space>
                    {cat.icon}
                    {cat.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="价格"
              value={priceFilter}
              onChange={setPriceFilter}
              style={{ width: '100%' }}
              size="large"
            >
              {priceOptions.map(option => (
                <Option key={option.key} value={option.key}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Select
              placeholder="排序"
              value={sortBy}
              onChange={setSortBy}
              style={{ width: '100%' }}
              size="large"
            >
              {sortOptions.map(option => (
                <Option key={option.key} value={option.key}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Button 
              type="primary" 
              size="large" 
              style={{ width: '100%' }}
              onClick={loadMarketplacePlugins}
            >
              刷新
            </Button>
          </Col>
        </Row>
      </div>

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Statistic title="总插件数" value={plugins.length} prefix={<ShopOutlined />} />
        </Col>
        <Col span={6}>
          <Statistic title="搜索结果" value={filteredAndSortedPlugins.length} prefix={<SearchOutlined />} />
        </Col>
        <Col span={6}>
          <Statistic title="已安装" value={plugins.filter(p => p.installed).length} prefix={<CheckCircleOutlined />} />
        </Col>
        <Col span={6}>
          <Statistic title="精选插件" value={plugins.filter(p => p.featured).length} prefix={<TrophyOutlined />} />
        </Col>
      </Row>

      {/* 插件列表 */}
      {filteredAndSortedPlugins.length === 0 ? (
        <Empty description="未找到匹配的插件" />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredAndSortedPlugins.map(plugin => (
            <Col key={plugin.id} xs={24} sm={12} md={8} lg={6} xl={4}>
              {renderPluginCard(plugin)}
            </Col>
          ))}
        </Row>
      )}

      {/* 插件详情弹窗 */}
      {renderPluginDetail()}
    </div>
  );
};