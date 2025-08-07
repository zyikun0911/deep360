/**
 * 最优面板 - 全插件生态系统的智能仪表板
 */

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Tabs,
  Button,
  Space,
  Avatar,
  Badge,
  Statistic,
  Progress,
  Alert,
  message,
  Modal,
  Drawer,
  Switch,
  Select,
  Tooltip,
  Tag
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  RobotOutlined,
  SafetyOutlined,
  SettingOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  MessageOutlined,
  BarChartOutlined,
  TeamOutlined,
  LinkOutlined,
  HeartOutlined,
  TrophyOutlined,
  BulbOutlined,
  EyeOutlined,
  PlusOutlined,
  LayoutOutlined
} from '@ant-design/icons';

import { PluginDashboard } from '../components/PluginDashboard';
import { UnifiedDashboard } from './Dashboard/UnifiedDashboard';
import { SmartWorkflowEngine } from '../components/SmartWorkflowEngine';
import { WorldMap } from '../components/WorldMap';
import { IntelligentInsights } from '../components/IntelligentInsights';
import { QuickActions } from '../components/QuickActions';
import { SmartNotifications } from '../components/SmartNotifications';
import { PersonalizedRecommendations } from '../components/PersonalizedRecommendations';
import { Typography } from 'antd';

const { Header, Content, Sider } = Layout;
const { TabPane } = Tabs;
const { Text } = Typography;

interface DashboardModule {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  component: React.ComponentType<any>;
  category: 'core' | 'intelligence' | 'management' | 'automation' | 'analytics';
  priority: number;
  requiredPlugins: string[];
  optionalPlugins: string[];
  status: 'active' | 'loading' | 'disabled';
}

interface SystemMetrics {
  plugins: {
    total: number;
    active: number;
    categories: Record<string, number>;
  };
  performance: {
    systemHealth: number;
    responseTime: number;
    uptime: number;
  };
  users: {
    online: number;
    total: number;
    satisfaction: number;
  };
  business: {
    conversion: number;
    revenue: number;
    growth: number;
  };
}

export const OptimalDashboard: React.FC = () => {
  const [currentModule, setCurrentModule] = useState('overview');
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [pluginMode, setPluginMode] = useState(false);
  const [aiAssistantVisible, setAiAssistantVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [personalizedView, setPersonalizedView] = useState(true);
  const [intelligentLayout, setIntelligentLayout] = useState(true);
  const [realtimeSync, setRealtimeSync] = useState(true);

  // 仪表板模块配置
  const dashboardModules: DashboardModule[] = [
    {
      id: 'overview',
      name: '全局概览',
      icon: <GlobalOutlined />,
      description: '系统整体状况和关键指标概览',
      component: UnifiedDashboard,
      category: 'core',
      priority: 1,
      requiredPlugins: ['system-monitor', 'metrics-collector'],
      optionalPlugins: ['ai-insights', 'world-map'],
      status: 'active'
    },
    {
      id: 'accounts',
      name: '账号生态',
      icon: <UserOutlined />,
      description: '多账号管理、健康监控、智能养号',
      component: () => <div>账号生态管理模块</div>,
      category: 'management',
      priority: 2,
      requiredPlugins: ['account-manager', 'health-monitor', 'nurturing-engine'],
      optionalPlugins: ['geo-intelligence', 'fingerprint-manager'],
      status: 'active'
    },
    {
      id: 'marketing',
      name: '智能营销',
      icon: <MessageOutlined />,
      description: '群发管理、内容生成、效果分析',
      component: () => <div>智能营销中心</div>,
      category: 'automation',
      priority: 3,
      requiredPlugins: ['mass-messaging', 'group-manager', 'ai-content'],
      optionalPlugins: ['link-tracker', 'analytics-dashboard'],
      status: 'active'
    },
    {
      id: 'security',
      name: '安全风控',
      icon: <SafetyOutlined />,
      description: '风险监控、异常检测、应急响应',
      component: () => <div>安全风控面板</div>,
      category: 'intelligence',
      priority: 4,
      requiredPlugins: ['risk-monitor', 'anomaly-detector', 'compliance-checker'],
      optionalPlugins: ['audit-logger', 'emergency-response'],
      status: 'active'
    },
    {
      id: 'workflows',
      name: '智能工作流',
      icon: <ThunderboltOutlined />,
      description: '可视化工作流设计和自动化执行',
      component: SmartWorkflowEngine,
      category: 'automation',
      priority: 5,
      requiredPlugins: ['workflow-engine', 'task-scheduler'],
      optionalPlugins: ['ai-optimizer', 'template-library'],
      status: 'active'
    },
    {
      id: 'analytics',
      name: '数据洞察',
      icon: <BarChartOutlined />,
      description: '深度数据分析和智能预测',
      component: () => <div>数据洞察分析</div>,
      category: 'analytics',
      priority: 6,
      requiredPlugins: ['data-analyzer', 'chart-renderer', 'ml-predictor'],
      optionalPlugins: ['real-time-stream', 'export-tools'],
      status: 'active'
    },
    {
      id: 'plugins',
      name: '插件管理',
      icon: <AppstoreOutlined />,
      description: '插件市场、安装管理、配置优化',
      component: PluginDashboard,
      category: 'management',
      priority: 7,
      requiredPlugins: ['plugin-manager', 'marketplace-api'],
      optionalPlugins: ['security-scanner', 'performance-monitor'],
      status: 'active'
    }
  ];

  // 加载系统指标
  const loadSystemMetrics = async () => {
    try {
      const response = await fetch('/api/system/metrics');
      const data = await response.json();
      setSystemMetrics(data);
    } catch (error) {
      console.error('加载系统指标失败:', error);
    }
  };

  useEffect(() => {
    loadSystemMetrics();
    
    // 定期更新指标
    const interval = setInterval(loadSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // 渲染顶部状态栏
  const renderStatusBar = () => (
    <Header style={{ 
      background: '#fff', 
      padding: '0 24px', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000 
    }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Space size="large">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar size="large" icon={<GlobalOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <div>
                <h2 style={{ margin: 0 }}>Deep360 最优面板</h2>
                <Text type="secondary">全球最佳多账号SaaS系统</Text>
              </div>
            </div>
            
            {systemMetrics && (
              <Space size="large">
                <Statistic
                  title="系统健康度"
                  value={systemMetrics.performance.systemHealth}
                  suffix="%"
                  valueStyle={{ color: systemMetrics.performance.systemHealth > 90 ? '#3f8600' : '#cf1322' }}
                />
                <Statistic
                  title="插件总数"
                  value={systemMetrics.plugins.total}
                  prefix={<AppstoreOutlined />}
                />
                <Statistic
                  title="在线用户"
                  value={systemMetrics.users.online}
                  prefix={<UserOutlined />}
                />
              </Space>
            )}
          </Space>
        </Col>
        
        <Col>
          <Space>
            <SmartNotifications />
            
            <Switch
              checkedChildren="个性化"
              unCheckedChildren="标准"
              checked={personalizedView}
              onChange={setPersonalizedView}
            />
            
            <Switch
              checkedChildren="实时"
              unCheckedChildren="静态"
              checked={realtimeSync}
              onChange={setRealtimeSync}
            />
            
            <Tooltip title="AI助手">
              <Button 
                type="primary"
                icon={<RobotOutlined />}
                onClick={() => setAiAssistantVisible(true)}
              >
                AI助手
              </Button>
            </Tooltip>
            
            <Tooltip title="系统设置">
              <Button 
                type="text"
                icon={<SettingOutlined />}
                onClick={() => setSettingsVisible(true)}
              />
            </Tooltip>
          </Space>
        </Col>
      </Row>
    </Header>
  );

  // 渲染智能侧边栏
  const renderIntelligentSidebar = () => (
    <Sider width={280} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
      <div style={{ padding: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 快速切换 */}
          <Card size="small" title="模块导航">
            <Space direction="vertical" style={{ width: '100%' }}>
              {dashboardModules.map(module => (
                <Button
                  key={module.id}
                  type={currentModule === module.id ? 'primary' : 'text'}
                  icon={module.icon}
                  block
                  style={{ textAlign: 'left' }}
                  onClick={() => setCurrentModule(module.id)}
                >
                  <Space>
                    {module.name}
                    <Badge 
                      status={module.status === 'active' ? 'success' : 'default'} 
                      size="small"
                    />
                  </Space>
                </Button>
              ))}
            </Space>
          </Card>

          {/* 快速操作 */}
          <QuickActions 
            templateBased={true}
            batchOperations={true}
            smartDefaults={intelligentLayout}
            culturalPresets={true}
          />

          {/* 个性化推荐 */}
          {personalizedView && (
            <PersonalizedRecommendations />
          )}
        </Space>
      </div>
    </Sider>
  );

  // 渲染主内容区域
  const renderMainContent = () => {
    const currentModuleConfig = dashboardModules.find(m => m.id === currentModule);
    
    if (!currentModuleConfig) {
      return <div>模块不存在</div>;
    }

    const ModuleComponent = currentModuleConfig.component;

    return (
      <div style={{ padding: '24px', background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
        {/* 模块头部 */}
        <div style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                {currentModuleConfig.icon}
                <div>
                  <h3 style={{ margin: 0 }}>{currentModuleConfig.name}</h3>
                  <Text type="secondary">{currentModuleConfig.description}</Text>
                </div>
              </Space>
            </Col>
            
            <Col>
              <Space>
                <Tag color="blue">{currentModuleConfig.category}</Tag>
                <Button 
                  icon={<LayoutOutlined />}
                  onClick={() => setPluginMode(!pluginMode)}
                >
                  {pluginMode ? '退出插件模式' : '插件模式'}
                </Button>
                <Button icon={<EyeOutlined />}>
                  全屏
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 插件依赖状态 */}
        {currentModuleConfig.requiredPlugins.length > 0 && (
          <Alert
            message="插件依赖"
            description={
              <Space wrap>
                <span>必需插件:</span>
                {currentModuleConfig.requiredPlugins.map(plugin => (
                  <Tag key={plugin} color="red">{plugin}</Tag>
                ))}
                {currentModuleConfig.optionalPlugins.length > 0 && (
                  <>
                    <span>可选插件:</span>
                    {currentModuleConfig.optionalPlugins.map(plugin => (
                      <Tag key={plugin} color="blue">{plugin}</Tag>
                    ))}
                  </>
                )}
              </Space>
            }
            type="info"
            showIcon
            closable
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* 模块内容 */}
        <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
          {pluginMode && currentModule === 'plugins' ? (
            <ModuleComponent editable={true} />
          ) : (
            <ModuleComponent />
          )}
        </div>
      </div>
    );
  };

  // 渲染AI助手抽屉
  const renderAIAssistant = () => (
    <Drawer
      title="AI智能助手"
      placement="right"
      width={400}
      visible={aiAssistantVisible}
      onClose={() => setAiAssistantVisible(false)}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Card size="small" title="智能建议">
          <IntelligentInsights data={{
            trends: [],
            predictions: [],
            recommendations: [],
            alerts: []
          }} />
        </Card>
        
        <Card size="small" title="系统优化">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" block icon={<ThunderboltOutlined />}>
              一键优化性能
            </Button>
            <Button block icon={<BulbOutlined />}>
              智能推荐配置
            </Button>
            <Button block icon={<LayoutOutlined />}>
              优化布局
            </Button>
          </Space>
        </Card>
        
        <Card size="small" title="使用统计">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>今日使用时长</Text>
              <Progress percent={68} size="small" />
            </div>
            <div>
              <Text>功能使用率</Text>
              <Progress percent={85} size="small" status="active" />
            </div>
            <div>
              <Text>效率提升</Text>
              <Progress percent={92} size="small" strokeColor="#52c41a" />
            </div>
          </Space>
        </Card>
      </Space>
    </Drawer>
  );

  // 渲染设置抽屉
  const renderSettings = () => (
    <Modal
      title="系统设置"
      visible={settingsVisible}
      onCancel={() => setSettingsVisible(false)}
      width={600}
      footer={[
        <Button key="cancel" onClick={() => setSettingsVisible(false)}>
          取消
        </Button>,
        <Button key="save" type="primary">
          保存设置
        </Button>
      ]}
    >
      <Tabs>
        <TabPane tab="界面设置" key="ui">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>个性化视图</Text>
              <Switch 
                checked={personalizedView} 
                onChange={setPersonalizedView}
                style={{ float: 'right' }}
              />
            </div>
            <div>
              <Text>智能布局</Text>
              <Switch 
                checked={intelligentLayout} 
                onChange={setIntelligentLayout}
                style={{ float: 'right' }}
              />
            </div>
            <div>
              <Text>实时同步</Text>
              <Switch 
                checked={realtimeSync} 
                onChange={setRealtimeSync}
                style={{ float: 'right' }}
              />
            </div>
          </Space>
        </TabPane>
        
        <TabPane tab="插件设置" key="plugins">
          <div>插件配置选项...</div>
        </TabPane>
        
        <TabPane tab="高级设置" key="advanced">
          <div>高级系统配置...</div>
        </TabPane>
      </Tabs>
    </Modal>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {renderStatusBar()}
      
      <Layout>
        {renderIntelligentSidebar()}
        
        <Layout>
          <Content>
            {renderMainContent()}
          </Content>
        </Layout>
      </Layout>

      {renderAIAssistant()}
      {renderSettings()}
    </Layout>
  );
};