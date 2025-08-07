/**
 * 智能工作流引擎 - 建群拉群与超链普链的逻辑关联
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Steps,
  Button,
  Space,
  Select,
  Input,
  Switch,
  Slider,
  Row,
  Col,
  Tag,
  Progress,
  Modal,
  message,
  Timeline,
  Tooltip,
  Alert,
  Divider,
  Typography,
  Form,
  InputNumber
} from 'antd';
import {
  PlayCircleOutlined,
  PauseOutlined,
  SettingOutlined,
  LinkOutlined,
  TeamOutlined,
  MessageOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  BranchesOutlined,
  NodeIndexOutlined,
  InteractionOutlined
} from '@ant-design/icons';
import { Flowchart } from '@ant-design/flowchart';

const { Step } = Steps;
const { Option } = Select;
const { Text, Title } = Typography;

interface WorkflowNode {
  id: string;
  type: 'group_creation' | 'member_invitation' | 'content_distribution' | 'link_sharing' | 'engagement_tracking' | 'analytics';
  title: string;
  config: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  dependencies: string[];
  triggers: string[];
  metrics: any;
}

interface SmartWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: Array<{ source: string; target: string; condition?: string }>;
  status: 'draft' | 'running' | 'paused' | 'completed';
  performance: {
    totalSteps: number;
    completedSteps: number;
    successRate: number;
    averageTime: number;
  };
}

export const SmartWorkflowEngine: React.FC = () => {
  const [workflows, setWorkflows] = useState<SmartWorkflow[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<SmartWorkflow | null>(null);
  const [designMode, setDesignMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [executionLog, setExecutionLog] = useState<any[]>([]);

  // 预定义工作流模板
  const workflowTemplates = {
    'group_marketing': {
      name: '群组营销自动化',
      description: '自动创建群组、邀请成员、分发内容、跟踪效果',
      nodes: [
        {
          id: 'create_groups',
          type: 'group_creation',
          title: '批量创建群组',
          config: {
            groupCount: 10,
            groupNamePattern: '产品交流群{index}',
            groupDescription: '专业产品讨论和经验分享',
            platform: 'whatsapp',
            settings: {
              privacy: 'invite_only',
              adminApproval: false,
              allowMemberInvites: true
            }
          },
          status: 'pending',
          dependencies: [],
          triggers: ['groups_created'],
          metrics: {
            successRate: 0,
            totalGroups: 0,
            activeGroups: 0
          }
        },
        {
          id: 'invite_members',
          type: 'member_invitation',
          title: '智能邀请成员',
          config: {
            invitationStrategy: 'gradual',
            membersPerGroup: 50,
            invitationDelay: { min: 30, max: 120 }, // 秒
            targetAudience: {
              demographics: ['age_25_45', 'interest_technology'],
              behavior: ['active_users', 'group_participants'],
              location: ['urban_areas']
            },
            personalizedMessages: true
          },
          status: 'pending',
          dependencies: ['create_groups'],
          triggers: ['members_invited'],
          metrics: {
            invitationsSent: 0,
            acceptanceRate: 0,
            activeMembers: 0
          }
        },
        {
          id: 'distribute_content',
          type: 'content_distribution',
          title: '智能内容分发',
          config: {
            contentTypes: ['product_updates', 'educational_content', 'promotional_offers'],
            distributionSchedule: {
              frequency: 'daily',
              timing: 'optimal_engagement_hours',
              timeZone: 'auto_detect'
            },
            contentPersonalization: {
              enabled: true,
              factors: ['member_interests', 'engagement_history', 'demographics']
            },
            linkIntegration: {
              trackingEnabled: true,
              shortLinksEnabled: true,
              utmParameters: true
            }
          },
          status: 'pending',
          dependencies: ['invite_members'],
          triggers: ['content_distributed'],
          metrics: {
            messagesDelivered: 0,
            engagementRate: 0,
            linkClicks: 0
          }
        },
        {
          id: 'share_links',
          type: 'link_sharing',
          title: '超链接分享优化',
          config: {
            linkTypes: ['product_pages', 'landing_pages', 'promotional_content'],
            optimizationStrategy: {
              linkPreviews: true,
              customThumbnails: true,
              appealingDescriptions: true,
              urgencyTriggers: true
            },
            sharingPattern: {
              distribution: 'staggered',
              crossPosting: false,
              contextual: true
            },
            trackingIntegration: {
              clickTracking: true,
              conversionTracking: true,
              heatmapAnalysis: true
            }
          },
          status: 'pending',
          dependencies: ['distribute_content'],
          triggers: ['links_shared'],
          metrics: {
            linksShared: 0,
            totalClicks: 0,
            conversionRate: 0
          }
        },
        {
          id: 'track_engagement',
          type: 'engagement_tracking',
          title: '互动追踪分析',
          config: {
            trackingMetrics: [
              'message_opens',
              'link_clicks',
              'member_responses',
              'group_activity',
              'content_shares'
            ],
            realTimeMonitoring: true,
            alertThresholds: {
              lowEngagement: 0.1,
              highEngagement: 0.8,
              suspiciousActivity: 0.05
            },
            adaptiveOptimization: {
              enabled: true,
              optimizationInterval: '1hour',
              adjustmentFactors: ['engagement_rates', 'member_feedback', 'link_performance']
            }
          },
          status: 'pending',
          dependencies: ['share_links'],
          triggers: ['engagement_tracked'],
          metrics: {
            totalInteractions: 0,
            avgEngagementRate: 0,
            memberSatisfaction: 0
          }
        },
        {
          id: 'analyze_results',
          type: 'analytics',
          title: '效果分析报告',
          config: {
            reportingPeriod: 'daily',
            analyticsDepth: 'comprehensive',
            insights: {
              performanceComparison: true,
              trendAnalysis: true,
              predictiveAnalytics: true,
              recommendationEngine: true
            },
            optimization: {
              autoOptimization: true,
              mlOptimization: true,
              abTesting: true
            }
          },
          status: 'pending',
          dependencies: ['track_engagement'],
          triggers: ['analysis_completed'],
          metrics: {
            reportsGenerated: 0,
            insightsProvided: 0,
            optimizationsSuggested: 0
          }
        }
      ],
      connections: [
        { source: 'create_groups', target: 'invite_members' },
        { source: 'invite_members', target: 'distribute_content' },
        { source: 'distribute_content', target: 'share_links' },
        { source: 'share_links', target: 'track_engagement' },
        { source: 'track_engagement', target: 'analyze_results' }
      ]
    },

    'viral_growth': {
      name: '病毒式传播工作流',
      description: '通过群组和链接的协同作用实现病毒式增长',
      nodes: [
        {
          id: 'seed_groups',
          type: 'group_creation',
          title: '种子群组创建',
          config: {
            groupCount: 5,
            groupType: 'seed_community',
            memberLimit: 20,
            exclusivity: 'high',
            inviteStrategy: 'influencer_first'
          },
          status: 'pending',
          dependencies: [],
          triggers: ['seed_groups_ready']
        },
        {
          id: 'viral_content',
          type: 'content_distribution',
          title: '病毒内容投放',
          config: {
            contentStrategy: 'viral_optimized',
            shareabilityIndex: 'high',
            emotionalTriggers: ['curiosity', 'fomo', 'social_proof'],
            viralCoefficient: 2.5
          },
          status: 'pending',
          dependencies: ['seed_groups'],
          triggers: ['viral_content_live']
        },
        {
          id: 'incentive_links',
          type: 'link_sharing',
          title: '激励链接分享',
          config: {
            incentiveType: 'referral_rewards',
            trackingDepth: 'multi_level',
            rewardStructure: 'progressive',
            socialProof: 'dynamic_counters'
          },
          status: 'pending',
          dependencies: ['viral_content'],
          triggers: ['incentives_active']
        }
      ]
    }
  };

  // 加载工作流列表
  const loadWorkflows = useCallback(async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      if (data.success) {
        setWorkflows(data.data);
      }
    } catch (error) {
      message.error('加载工作流失败');
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // 创建新工作流
  const createWorkflow = async (template?: string) => {
    try {
      const workflowData = template ? workflowTemplates[template] : {
        name: '新工作流',
        description: '自定义工作流',
        nodes: [],
        connections: []
      };

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData)
      });

      if (response.ok) {
        const result = await response.json();
        message.success('工作流创建成功');
        loadWorkflows();
        setCurrentWorkflow(result.data);
        setDesignMode(true);
      }
    } catch (error) {
      message.error('创建工作流失败');
    }
  };

  // 执行工作流
  const executeWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST'
      });

      if (response.ok) {
        message.success('工作流开始执行');
        
        // 实时监控执行状态
        const monitorExecution = () => {
          const eventSource = new EventSource(`/api/workflows/${workflowId}/monitor`);
          
          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setExecutionLog(prev => [...prev, data]);
            
            // 更新工作流状态
            setWorkflows(prev => prev.map(wf => 
              wf.id === workflowId ? { ...wf, ...data.workflow } : wf
            ));
          };

          eventSource.onerror = () => {
            eventSource.close();
          };
        };

        monitorExecution();
      }
    } catch (error) {
      message.error('执行工作流失败');
    }
  };

  // 暂停工作流
  const pauseWorkflow = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/pause`, {
        method: 'POST'
      });

      if (response.ok) {
        message.success('工作流已暂停');
        loadWorkflows();
      }
    } catch (error) {
      message.error('暂停工作流失败');
    }
  };

  // 渲染工作流设计器
  const renderWorkflowDesigner = () => {
    if (!currentWorkflow) return null;

    const flowchartData = {
      nodes: currentWorkflow.nodes.map(node => ({
        id: node.id,
        type: 'customNode',
        data: {
          title: node.title,
          type: node.type,
          status: node.status,
          config: node.config
        },
        position: { x: 0, y: 0 } // 将由布局算法计算
      })),
      edges: currentWorkflow.connections.map(conn => ({
        id: `${conn.source}-${conn.target}`,
        source: conn.source,
        target: conn.target,
        label: conn.condition
      }))
    };

    return (
      <Card 
        title="工作流设计器"
        extra={
          <Space>
            <Button onClick={() => setDesignMode(false)}>
              返回列表
            </Button>
            <Button type="primary" onClick={() => executeWorkflow(currentWorkflow.id)}>
              执行工作流
            </Button>
          </Space>
        }
      >
        <Flowchart
          data={flowchartData}
          onReady={(app) => {
            // 配置自定义节点
            app.useCustomNode({
              type: 'customNode',
              component: ({ data }) => (
                <div className="custom-workflow-node">
                  <div className="node-header">
                    {getNodeIcon(data.type)}
                    <span>{data.title}</span>
                    <Tag color={getStatusColor(data.status)}>
                      {data.status}
                    </Tag>
                  </div>
                  <div className="node-content">
                    {renderNodeConfig(data.config, data.type)}
                  </div>
                </div>
              )
            });
          }}
        />
      </Card>
    );
  };

  // 获取节点图标
  const getNodeIcon = (type: string) => {
    const iconMap = {
      'group_creation': <TeamOutlined />,
      'member_invitation': <InteractionOutlined />,
      'content_distribution': <MessageOutlined />,
      'link_sharing': <LinkOutlined />,
      'engagement_tracking': <NodeIndexOutlined />,
      'analytics': <BranchesOutlined />
    };
    return iconMap[type] || <SettingOutlined />;
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colorMap = {
      'pending': 'default',
      'running': 'processing',
      'completed': 'success',
      'failed': 'error'
    };
    return colorMap[status] || 'default';
  };

  // 渲染节点配置
  const renderNodeConfig = (config: any, type: string) => {
    switch (type) {
      case 'group_creation':
        return (
          <div>
            <Text type="secondary">群组数量: {config.groupCount}</Text><br />
            <Text type="secondary">平台: {config.platform}</Text>
          </div>
        );
      case 'member_invitation':
        return (
          <div>
            <Text type="secondary">每群成员: {config.membersPerGroup}</Text><br />
            <Text type="secondary">策略: {config.invitationStrategy}</Text>
          </div>
        );
      case 'content_distribution':
        return (
          <div>
            <Text type="secondary">频率: {config.distributionSchedule?.frequency}</Text><br />
            <Text type="secondary">个性化: {config.contentPersonalization?.enabled ? '启用' : '禁用'}</Text>
          </div>
        );
      case 'link_sharing':
        return (
          <div>
            <Text type="secondary">跟踪: {config.trackingIntegration?.clickTracking ? '启用' : '禁用'}</Text><br />
            <Text type="secondary">优化: {config.optimizationStrategy?.linkPreviews ? '启用' : '禁用'}</Text>
          </div>
        );
      default:
        return <Text type="secondary">配置已设置</Text>;
    }
  };

  // 渲染工作流列表
  const renderWorkflowList = () => (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4}>智能工作流引擎</Title>
        </Col>
        <Col>
          <Space>
            <Button 
              type="primary" 
              onClick={() => setShowTemplates(true)}
            >
              从模板创建
            </Button>
            <Button 
              onClick={() => createWorkflow()}
            >
              自定义创建
            </Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {workflows.map(workflow => (
          <Col span={8} key={workflow.id}>
            <Card
              title={workflow.name}
              extra={
                <Space>
                  {workflow.status === 'running' ? (
                    <Button 
                      size="small" 
                      icon={<PauseOutlined />}
                      onClick={() => pauseWorkflow(workflow.id)}
                    >
                      暂停
                    </Button>
                  ) : (
                    <Button 
                      size="small" 
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={() => executeWorkflow(workflow.id)}
                    >
                      执行
                    </Button>
                  )}
                  <Button 
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={() => {
                      setCurrentWorkflow(workflow);
                      setDesignMode(true);
                    }}
                  >
                    编辑
                  </Button>
                </Space>
              }
            >
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">{workflow.description}</Text>
              </div>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="完成率"
                    value={workflow.performance.successRate}
                    suffix="%"
                    precision={1}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="平均耗时"
                    value={workflow.performance.averageTime}
                    suffix="分钟"
                  />
                </Col>
              </Row>

              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={(workflow.performance.completedSteps / workflow.performance.totalSteps) * 100}
                  size="small"
                  status={workflow.status === 'completed' ? 'success' : 'active'}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <Tag color={getStatusColor(workflow.status)}>
                  {workflow.status}
                </Tag>
                <Text type="secondary">
                  {workflow.performance.completedSteps}/{workflow.performance.totalSteps} 步骤
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  return (
    <div>
      {designMode ? renderWorkflowDesigner() : renderWorkflowList()}

      {/* 模板选择模态框 */}
      <Modal
        title="选择工作流模板"
        visible={showTemplates}
        onCancel={() => setShowTemplates(false)}
        footer={null}
        width={800}
      >
        <Row gutter={[16, 16]}>
          {Object.entries(workflowTemplates).map(([key, template]) => (
            <Col span={12} key={key}>
              <Card
                hoverable
                onClick={() => {
                  createWorkflow(key);
                  setShowTemplates(false);
                }}
              >
                <Card.Meta
                  title={template.name}
                  description={template.description}
                />
                <div style={{ marginTop: 16 }}>
                  <Tag color="blue">{template.nodes.length} 个步骤</Tag>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Modal>
    </div>
  );
};