/**
 * 群发活动管理面板
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Statistic,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Modal,
  message,
  Dropdown,
  Menu,
  Tooltip,
  Alert,
  Badge
} from 'antd';
import {
  PlusOutlined,
  SendOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  StopOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SettingOutlined,
  LinkOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/plots';
import { CampaignCreator } from './CampaignCreator';
import { CampaignDetail } from './CampaignDetail';
import { LinkHealthMonitor } from './LinkHealthMonitor';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { confirm } = Modal;

interface Campaign {
  id: string;
  name: string;
  messageType: string;
  status: 'draft' | 'ready' | 'running' | 'paused' | 'completed' | 'failed';
  platforms: string[];
  stats: {
    totalTargets: number;
    sent: number;
    delivered: number;
    failed: number;
    clicked: number;
    replied: number;
  };
  createdAt: string;
  scheduledTime?: string;
  startedAt?: string;
  completedAt?: string;
}

export const CampaignDashboard: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showLinkMonitor, setShowLinkMonitor] = useState(false);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSent: 0,
    averageDeliveryRate: 0,
    averageClickRate: 0,
    brokenLinks: 0
  });

  // 加载数据
  useEffect(() => {
    loadCampaigns();
    loadStats();
  }, []);

  // 过滤数据
  useEffect(() => {
    let filtered = campaigns;

    if (searchText) {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchText, statusFilter]);

  // 加载活动列表
  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mass-messaging/campaigns');
      const data = await response.json();
      
      if (data.success) {
        setCampaigns(data.data);
      }
    } catch (error) {
      message.error('加载活动列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStats = async () => {
    try {
      const response = await fetch('/api/mass-messaging/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      message.error('加载统计数据失败');
    }
  };

  // 启动活动
  const handleStartCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/mass-messaging/campaigns/${campaignId}/start`, {
        method: 'POST'
      });
      
      if (response.ok) {
        message.success('活动启动成功');
        loadCampaigns();
      } else {
        throw new Error('启动失败');
      }
    } catch (error) {
      message.error('启动活动失败');
    }
  };

  // 暂停活动
  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/mass-messaging/campaigns/${campaignId}/pause`, {
        method: 'POST'
      });
      
      if (response.ok) {
        message.success('活动已暂停');
        loadCampaigns();
      } else {
        throw new Error('暂停失败');
      }
    } catch (error) {
      message.error('暂停活动失败');
    }
  };

  // 停止活动
  const handleStopCampaign = async (campaignId: string) => {
    confirm({
      title: '确认停止活动？',
      content: '停止后的活动无法恢复，请确认',
      onOk: async () => {
        try {
          const response = await fetch(`/api/mass-messaging/campaigns/${campaignId}/stop`, {
            method: 'POST'
          });
          
          if (response.ok) {
            message.success('活动已停止');
            loadCampaigns();
          } else {
            throw new Error('停止失败');
          }
        } catch (error) {
          message.error('停止活动失败');
        }
      }
    });
  };

  // 删除活动
  const handleDeleteCampaign = async (campaignId: string) => {
    confirm({
      title: '确认删除活动？',
      content: '删除后无法恢复，请确认',
      onOk: async () => {
        try {
          const response = await fetch(`/api/mass-messaging/campaigns/${campaignId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            message.success('活动已删除');
            loadCampaigns();
          } else {
            throw new Error('删除失败');
          }
        } catch (error) {
          message.error('删除活动失败');
        }
      }
    });
  };

  // 检查链接健康
  const handleCheckLinkHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mass-messaging/links/health-check', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        message.success(`链接健康检查完成，修复了 ${data.data.repaired} 个断链`);
        loadStats();
      }
    } catch (error) {
      message.error('链接健康检查失败');
    } finally {
      setLoading(false);
    }
  };

  // 批量操作菜单
  const batchActionMenu = (
    <Menu>
      <Menu.Item
        key="start"
        icon={<PlayCircleOutlined />}
        onClick={() => {
          // 批量启动
          selectedRowKeys.forEach(id => handleStartCampaign(id));
        }}
      >
        批量启动
      </Menu.Item>
      <Menu.Item
        key="pause"
        icon={<PauseOutlined />}
        onClick={() => {
          // 批量暂停
          selectedRowKeys.forEach(id => handlePauseCampaign(id));
        }}
      >
        批量暂停
      </Menu.Item>
      <Menu.Item
        key="delete"
        icon={<DeleteOutlined />}
        danger
        onClick={() => {
          confirm({
            title: `确认删除 ${selectedRowKeys.length} 个活动？`,
            content: '删除后无法恢复',
            onOk: () => {
              selectedRowKeys.forEach(id => handleDeleteCampaign(id));
              setSelectedRowKeys([]);
            }
          });
        }}
      >
        批量删除
      </Menu.Item>
    </Menu>
  );

  // 表格列定义
  const columns = [
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Campaign) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.platforms.map(platform => (
              <Tag key={platform} size="small">{platform}</Tag>
            ))}
          </div>
        </div>
      )
    },
    {
      title: '类型',
      dataIndex: 'messageType',
      key: 'messageType',
      render: (type: string) => {
        const typeMap = {
          text: { label: '文本', color: 'blue' },
          rich_media: { label: '超链图文', color: 'purple' },
          image: { label: '图片', color: 'green' },
          video: { label: '视频', color: 'orange' },
          document: { label: '文档', color: 'gray' }
        };
        const typeInfo = typeMap[type as keyof typeof typeMap] || { label: type, color: 'default' };
        return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          draft: { label: '草稿', color: 'default' },
          ready: { label: '就绪', color: 'blue' },
          running: { label: '发送中', color: 'processing' },
          paused: { label: '已暂停', color: 'warning' },
          completed: { label: '已完成', color: 'success' },
          failed: { label: '失败', color: 'error' }
        };
        const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, color: 'default' };
        return <Badge status={statusInfo.color as any} text={statusInfo.label} />;
      }
    },
    {
      title: '目标/已发送',
      key: 'progress',
      render: (record: Campaign) => (
        <div>
          <div>{record.stats.sent} / {record.stats.totalTargets}</div>
          <Progress
            percent={record.stats.totalTargets > 0 ? 
              (record.stats.sent / record.stats.totalTargets) * 100 : 0}
            size="small"
            showInfo={false}
          />
        </div>
      )
    },
    {
      title: '送达率',
      key: 'deliveryRate',
      render: (record: Campaign) => {
        const rate = record.stats.sent > 0 ? 
          (record.stats.delivered / record.stats.sent) * 100 : 0;
        return <span>{rate.toFixed(1)}%</span>;
      }
    },
    {
      title: '点击率',
      key: 'clickRate',
      render: (record: Campaign) => {
        const rate = record.stats.delivered > 0 ? 
          (record.stats.clicked / record.stats.delivered) * 100 : 0;
        return <span>{rate.toFixed(1)}%</span>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: Campaign) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedCampaign(record);
                setShowDetail(true);
              }}
            />
          </Tooltip>

          {record.status === 'draft' && (
            <Tooltip title="编辑">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => {
                  // 编辑活动
                }}
              />
            </Tooltip>
          )}

          {(record.status === 'ready' || record.status === 'paused') && (
            <Tooltip title="启动">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => handleStartCampaign(record.id)}
              />
            </Tooltip>
          )}

          {record.status === 'running' && (
            <Tooltip title="暂停">
              <Button
                type="text"
                icon={<PauseOutlined />}
                onClick={() => handlePauseCampaign(record.id)}
              />
            </Tooltip>
          )}

          {record.status === 'running' && (
            <Tooltip title="停止">
              <Button
                type="text"
                icon={<StopOutlined />}
                danger
                onClick={() => handleStopCampaign(record.id)}
              />
            </Tooltip>
          )}

          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteCampaign(record.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="campaign-dashboard">
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总活动数"
              value={stats.totalCampaigns}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃活动"
              value={stats.activeCampaigns}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总发送量"
              value={stats.totalSent}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均送达率"
              value={stats.averageDeliveryRate}
              suffix="%"
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      {/* 断链提醒 */}
      {stats.brokenLinks > 0 && (
        <Alert
          message={`发现 ${stats.brokenLinks} 个断链`}
          description="建议立即检查并修复断链，以确保用户体验"
          type="warning"
          action={
            <Space>
              <Button
                size="small"
                icon={<LinkOutlined />}
                onClick={() => setShowLinkMonitor(true)}
              >
                查看详情
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleCheckLinkHealth}
              >
                自动修复
              </Button>
            </Space>
          }
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Search
                placeholder="搜索活动名称"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
              >
                <Option value="all">全部状态</Option>
                <Option value="draft">草稿</Option>
                <Option value="ready">就绪</Option>
                <Option value="running">发送中</Option>
                <Option value="paused">已暂停</Option>
                <Option value="completed">已完成</Option>
                <Option value="failed">失败</Option>
              </Select>
            </Space>
          </Col>
          
          <Col>
            <Space>
              {selectedRowKeys.length > 0 && (
                <Dropdown overlay={batchActionMenu}>
                  <Button>
                    批量操作 ({selectedRowKeys.length})
                  </Button>
                </Dropdown>
              )}
              
              <Button
                icon={<LinkOutlined />}
                onClick={() => setShowLinkMonitor(true)}
              >
                链接监控
              </Button>
              
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowCreator(true)}
              >
                创建活动
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 活动列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCampaigns}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record) => ({
              disabled: record.status === 'running'
            })
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 创建活动弹窗 */}
      <Modal
        title="创建群发活动"
        visible={showCreator}
        onCancel={() => setShowCreator(false)}
        width={1200}
        footer={null}
        destroyOnClose
      >
        <CampaignCreator
          onSave={(campaign) => {
            setShowCreator(false);
            loadCampaigns();
            message.success('活动创建成功');
          }}
          onCancel={() => setShowCreator(false)}
        />
      </Modal>

      {/* 活动详情弹窗 */}
      <Modal
        title="活动详情"
        visible={showDetail}
        onCancel={() => setShowDetail(false)}
        width={1000}
        footer={null}
        destroyOnClose
      >
        {selectedCampaign && (
          <CampaignDetail
            campaign={selectedCampaign}
            onClose={() => setShowDetail(false)}
          />
        )}
      </Modal>

      {/* 链接监控弹窗 */}
      <Modal
        title="链接健康监控"
        visible={showLinkMonitor}
        onCancel={() => setShowLinkMonitor(false)}
        width={1200}
        footer={null}
        destroyOnClose
      >
        <LinkHealthMonitor />
      </Modal>
    </div>
  );
};