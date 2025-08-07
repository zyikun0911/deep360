/**
 * 统一智能仪表板 - 全球最佳用户体验
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  Space,
  Avatar,
  Badge,
  Dropdown,
  Menu,
  Tooltip,
  Alert,
  Tabs,
  Timeline,
  List,
  Typography,
  Switch,
  Select,
  Tag,
  Modal,
  message,
  Drawer
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  MessageOutlined,
  TeamOutlined,
  LinkOutlined,
  SettingOutlined,
  GlobalOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  BulbOutlined,
  TrophyOutlined,
  RiseOutlined,
  HeartOutlined,
  StarOutlined,
  CrownOutlined,
  FireOutlined
} from '@ant-design/icons';
import { Line, Column, Pie, Gauge, Liquid } from '@ant-design/plots';
import { WorldMap } from '../../components/WorldMap';
import { IntelligentInsights } from '../../components/IntelligentInsights';
import { QuickActions } from '../../components/QuickActions';
import { SmartNotifications } from '../../components/SmartNotifications';
import { PersonalizedRecommendations } from '../../components/PersonalizedRecommendations';

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface DashboardData {
  accounts: {
    total: number;
    active: number;
    nurturing: number;
    byCountry: Record<string, number>;
    healthScore: number;
  };
  messaging: {
    totalSent: number;
    deliveryRate: number;
    clickRate: number;
    campaigns: number;
    realtimeMetrics: any[];
  };
  groups: {
    total: number;
    members: number;
    activeGroups: number;
    growthRate: number;
  };
  performance: {
    systemHealth: number;
    responseTime: number;
    uptime: number;
    errorRate: number;
  };
  insights: {
    trends: any[];
    predictions: any[];
    recommendations: any[];
    alerts: any[];
  };
}

export const UnifiedDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [realTimeMode, setRealTimeMode] = useState(true);
  const [personalizedMode, setPersonalizedMode] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [aiAssistantVisible, setAiAssistantVisible] = useState(false);

  // 加载仪表板数据
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        accountsResponse,
        messagingResponse,
        groupsResponse,
        performanceResponse,
        insightsResponse
      ] = await Promise.all([
        fetch(`/api/accounts/stats?timeRange=${selectedTimeRange}&country=${selectedCountry}`),
        fetch(`/api/mass-messaging/stats?timeRange=${selectedTimeRange}`),
        fetch(`/api/groups/stats?timeRange=${selectedTimeRange}`),
        fetch(`/api/system/performance?timeRange=${selectedTimeRange}`),
        fetch(`/api/ai/insights?timeRange=${selectedTimeRange}&personalized=${personalizedMode}`)
      ]);

      const data: DashboardData = {
        accounts: await accountsResponse.json(),
        messaging: await messagingResponse.json(),
        groups: await groupsResponse.json(),
        performance: await performanceResponse.json(),
        insights: await insightsResponse.json()
      };

      setDashboardData(data);
    } catch (error) {
      message.error('加载仪表板数据失败');
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, selectedCountry, personalizedMode]);

  // 实时数据更新
  useEffect(() => {
    loadDashboardData();
    
    if (realTimeMode) {
      const interval = setInterval(loadDashboardData, 30000); // 30秒更新
      return () => clearInterval(interval);
    }
  }, [loadDashboardData, realTimeMode]);

  // 时间范围选择
  const timeRangeOptions = [
    { label: '最近1小时', value: '1h' },
    { label: '最近24小时', value: '24h' },
    { label: '最近7天', value: '7d' },
    { label: '最近30天', value: '30d' },
    { label: '最近90天', value: '90d' }
  ];

  // 智能洞察卡片
  const renderIntelligentInsights = () => {
    if (!dashboardData?.insights) return null;

    return (
      <Card 
        title={
          <Space>
            <BulbOutlined />
            智能洞察
            <Badge count={dashboardData.insights.alerts.length} />
          </Space>
        }
        extra={
          <Button 
            type="link" 
            onClick={() => setShowInsights(true)}
          >
            查看详情
          </Button>
        }
      >
        <List
          size="small"
          dataSource={dashboardData.insights.recommendations.slice(0, 3)}
          renderItem={(item: any) => (
            <List.Item>
              <Space>
                <Avatar 
                  size="small" 
                  icon={<StarOutlined />} 
                  style={{ backgroundColor: '#52c41a' }}
                />
                <Text>{item.title}</Text>
                <Tag color={item.priority === 'high' ? 'red' : 'blue'}>
                  {item.priority}
                </Tag>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    );
  };

  // 全球账号分布
  const renderGlobalDistribution = () => {
    if (!dashboardData?.accounts.byCountry) return null;

    return (
      <Card 
        title={
          <Space>
            <GlobalOutlined />
            全球账号分布
            <Tag color="blue">{Object.keys(dashboardData.accounts.byCountry).length} 个国家</Tag>
          </Space>
        }
      >
        <WorldMap
          data={dashboardData.accounts.byCountry}
          interactive={true}
          showTooltip={true}
          colorScheme="viridis"
          onClick={(country) => setSelectedCountry(country)}
        />
      </Card>
    );
  };

  // 实时性能监控
  const renderPerformanceMonitoring = () => {
    if (!dashboardData?.performance) return null;

    const { systemHealth, responseTime, uptime, errorRate } = dashboardData.performance;

    return (
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Gauge
              percent={systemHealth / 100}
              range={{
                color: systemHealth > 90 ? '#30BF78' : systemHealth > 70 ? '#FAAD14' : '#F4664A'
              }}
              indicator={{
                pointer: { style: { stroke: '#D0D0D0' } }
              }}
              statistic={{
                title: { style: { fontSize: '12px' }, content: '系统健康度' },
                content: { style: { fontSize: '16px' }, content: `${systemHealth}%` }
              }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="响应时间"
              value={responseTime}
              suffix="ms"
              valueStyle={{ 
                color: responseTime < 100 ? '#3f8600' : responseTime < 300 ? '#cf1322' : '#ff4d4f' 
              }}
              prefix={<ThunderboltOutlined />}
            />
            <Progress 
              percent={Math.max(0, 100 - responseTime / 5)} 
              showInfo={false} 
              size="small"
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="系统可用性"
              value={uptime}
              suffix="%"
              precision={2}
              valueStyle={{ color: uptime > 99.9 ? '#3f8600' : '#cf1322' }}
              prefix={<SafetyOutlined />}
            />
            <Progress 
              percent={uptime} 
              showInfo={false} 
              size="small"
              strokeColor={uptime > 99.9 ? '#52c41a' : '#ff4d4f'}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic
              title="错误率"
              value={errorRate}
              suffix="%"
              precision={3}
              valueStyle={{ color: errorRate < 0.1 ? '#3f8600' : '#cf1322' }}
              prefix={<HeartOutlined />}
            />
            <Progress 
              percent={Math.max(0, 100 - errorRate * 1000)} 
              showInfo={false} 
              size="small"
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 快速操作面板
  const renderQuickActions = () => {
    const quickActions = [
      {
        title: '创建群发活动',
        icon: <MessageOutlined />,
        color: '#1890ff',
        action: () => window.location.href = '/mass-messaging/create'
      },
      {
        title: '批量注册账号',
        icon: <UserOutlined />,
        color: '#52c41a',
        action: () => window.location.href = '/registration/batch'
      },
      {
        title: '创建群组',
        icon: <TeamOutlined />,
        color: '#faad14',
        action: () => window.location.href = '/groups/create'
      },
      {
        title: '健康检查',
        icon: <SafetyOutlined />,
        color: '#f5222d',
        action: () => handleHealthCheck()
      },
      {
        title: 'AI助手',
        icon: <RobotOutlined />,
        color: '#722ed1',
        action: () => setAiAssistantVisible(true)
      },
      {
        title: '系统设置',
        icon: <SettingOutlined />,
        color: '#13c2c2',
        action: () => window.location.href = '/settings'
      }
    ];

    return (
      <Card title={
        <Space>
          <ThunderboltOutlined />
          快速操作
        </Space>
      }>
        <Row gutter={[8, 8]}>
          {quickActions.map((action, index) => (
            <Col span={8} key={index}>
              <Button
                type="text"
                block
                style={{
                  height: '60px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px dashed ${action.color}`,
                  color: action.color
                }}
                onClick={action.action}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                  {action.icon}
                </div>
                <div style={{ fontSize: '12px' }}>
                  {action.title}
                </div>
              </Button>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  // 趋势分析图表
  const renderTrendAnalysis = () => {
    if (!dashboardData?.messaging.realtimeMetrics) return null;

    const lineConfig = {
      data: dashboardData.messaging.realtimeMetrics,
      xField: 'time',
      yField: 'value',
      seriesField: 'metric',
      smooth: true,
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000,
        },
      },
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        shared: true,
        crosshairs: {
          type: 'line',
        },
      },
    };

    return (
      <Card 
        title={
          <Space>
            <RiseOutlined />
            实时趋势分析
            <Badge status="processing" text="实时更新" />
          </Space>
        }
        extra={
          <Space>
            <Select
              value={selectedTimeRange}
              onChange={setSelectedTimeRange}
              options={timeRangeOptions}
              size="small"
            />
            <Switch
              checked={realTimeMode}
              onChange={setRealTimeMode}
              checkedChildren="实时"
              unCheckedChildren="静态"
              size="small"
            />
          </Space>
        }
      >
        <Line {...lineConfig} />
      </Card>
    );
  };

  // 成就徽章系统
  const renderAchievements = () => {
    const achievements = [
      { title: '群发达人', icon: <MessageOutlined />, level: 'gold', progress: 95 },
      { title: '全球拓展', icon: <GlobalOutlined />, level: 'silver', progress: 80 },
      { title: '技术先锋', icon: <RobotOutlined />, level: 'bronze', progress: 60 },
      { title: '效率专家', icon: <ThunderboltOutlined />, level: 'gold', progress: 100 }
    ];

    return (
      <Card 
        title={
          <Space>
            <TrophyOutlined />
            成就系统
            <Tag color="gold">4/12 已解锁</Tag>
          </Space>
        }
      >
        <Row gutter={[8, 8]}>
          {achievements.map((achievement, index) => (
            <Col span={12} key={index}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                  {achievement.level === 'gold' ? (
                    <CrownOutlined style={{ color: '#ffd700' }} />
                  ) : achievement.level === 'silver' ? (
                    <StarOutlined style={{ color: '#c0c0c0' }} />
                  ) : (
                    <FireOutlined style={{ color: '#cd7f32' }} />
                  )}
                </div>
                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  {achievement.title}
                </div>
                <Progress 
                  percent={achievement.progress} 
                  size="small" 
                  showInfo={false}
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  // 健康检查处理
  const handleHealthCheck = async () => {
    try {
      message.loading('正在执行系统健康检查...', 2);
      
      const response = await fetch('/api/system/health-check', {
        method: 'POST'
      });
      
      if (response.ok) {
        message.success('系统健康检查完成');
        loadDashboardData();
      }
    } catch (error) {
      message.error('健康检查失败');
    }
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '24px', textAlign: 'center' }}>
          <div>加载中...</div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="large">
              <Title level={4} style={{ margin: 0 }}>
                <Space>
                  <DashboardOutlined />
                  Deep360 统一控制台
                </Space>
              </Title>
              
              <Space>
                <Badge status="processing" />
                <Text type="secondary">实时监控中</Text>
              </Space>
            </Space>
          </Col>
          
          <Col>
            <Space>
              <Tooltip title="个性化模式">
                <Switch
                  checked={personalizedMode}
                  onChange={setPersonalizedMode}
                  checkedChildren="个性化"
                  unCheckedChildren="标准"
                />
              </Tooltip>
              
              <SmartNotifications />
              
              <Avatar 
                icon={<UserOutlined />} 
                style={{ backgroundColor: '#1890ff', cursor: 'pointer' }}
                onClick={() => setAiAssistantVisible(true)}
              />
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ padding: '24px' }}>
        {/* 核心指标卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总账号数"
                value={dashboardData?.accounts.total || 0}
                prefix={<UserOutlined />}
                suffix={
                  <Tooltip title={`健康度: ${dashboardData?.accounts.healthScore}%`}>
                    <Progress 
                      type="circle" 
                      percent={dashboardData?.accounts.healthScore || 0} 
                      width={30}
                      format={() => ''}
                    />
                  </Tooltip>
                }
              />
            </Card>
          </Col>
          
          <Col span={6}>
            <Card>
              <Statistic
                title="总发送量"
                value={dashboardData?.messaging.totalSent || 0}
                prefix={<MessageOutlined />}
                suffix={
                  <Tag color="green">
                    {dashboardData?.messaging.deliveryRate}% 送达率
                  </Tag>
                }
              />
            </Card>
          </Col>
          
          <Col span={6}>
            <Card>
              <Statistic
                title="群组总数"
                value={dashboardData?.groups.total || 0}
                prefix={<TeamOutlined />}
                suffix={
                  <Tag color="blue">
                    +{dashboardData?.groups.growthRate}% 增长
                  </Tag>
                }
              />
            </Card>
          </Col>
          
          <Col span={6}>
            <Card>
              <Statistic
                title="系统健康"
                value={dashboardData?.performance.systemHealth || 0}
                suffix="%"
                prefix={<SafetyOutlined />}
                valueStyle={{
                  color: (dashboardData?.performance.systemHealth || 0) > 90 ? '#3f8600' : '#cf1322'
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* 性能监控 */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col span={24}>
            {renderPerformanceMonitoring()}
          </Col>
        </Row>

        {/* 主要内容区域 */}
        <Row gutter={[16, 16]}>
          {/* 左侧 - 图表和分析 */}
          <Col span={16}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                {renderTrendAnalysis()}
              </Col>
              
              <Col span={24}>
                {renderGlobalDistribution()}
              </Col>
            </Row>
          </Col>

          {/* 右侧 - 操作和洞察 */}
          <Col span={8}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                {renderQuickActions()}
              </Col>
              
              <Col span={24}>
                {renderIntelligentInsights()}
              </Col>
              
              <Col span={24}>
                {renderAchievements()}
              </Col>
            </Row>
          </Col>
        </Row>
      </Content>

      {/* 智能洞察抽屉 */}
      <Drawer
        title="智能洞察详情"
        placement="right"
        width={600}
        visible={showInsights}
        onClose={() => setShowInsights(false)}
      >
        <IntelligentInsights data={dashboardData?.insights} />
      </Drawer>

      {/* AI助手模态框 */}
      <Modal
        title="AI智能助手"
        visible={aiAssistantVisible}
        onCancel={() => setAiAssistantVisible(false)}
        width={800}
        footer={null}
      >
        <PersonalizedRecommendations />
      </Modal>
    </Layout>
  );
};