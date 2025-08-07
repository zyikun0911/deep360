/**
 * 链接健康监控页面
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Progress,
  Alert,
  Row,
  Col,
  Statistic,
  Select,
  Input,
  Modal,
  message,
  Tooltip,
  Badge,
  Divider,
  Typography
} from 'antd';
import {
  LinkOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/plots';

const { Search } = Input;
const { Option } = Select;
const { Text, Title } = Typography;
const { confirm } = Modal;

interface LinkData {
  id: string;
  originalUrl: string;
  shortUrl: string;
  trackingUrl: string;
  status: 'active' | 'broken' | 'error' | 'redirected';
  domain: string;
  title: string;
  description: string;
  responseTime: number;
  lastChecked: string;
  clickCount: number;
  uniqueClicks: number;
  campaigns: string[];
  repairHistory: any[];
}

interface HealthStats {
  total: number;
  active: number;
  broken: number;
  error: number;
  redirected: number;
  averageResponseTime: number;
  totalClicks: number;
  repairedToday: number;
}

export const LinkHealthMonitor: React.FC = () => {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [healthStats, setHealthStats] = useState<HealthStats>({
    total: 0,
    active: 0,
    broken: 0,
    error: 0,
    redirected: 0,
    averageResponseTime: 0,
    totalClicks: 0,
    repairedToday: 0
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkData | null>(null);

  // 加载数据
  useEffect(() => {
    loadLinks();
    loadHealthStats();
    loadTrendData();
  }, []);

  // 过滤数据
  useEffect(() => {
    let filtered = links;

    if (searchText) {
      filtered = filtered.filter(link =>
        link.originalUrl.toLowerCase().includes(searchText.toLowerCase()) ||
        link.title.toLowerCase().includes(searchText.toLowerCase()) ||
        link.domain.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(link => link.status === statusFilter);
    }

    if (domainFilter !== 'all') {
      filtered = filtered.filter(link => link.domain === domainFilter);
    }

    setFilteredLinks(filtered);
  }, [links, searchText, statusFilter, domainFilter]);

  // 加载链接列表
  const loadLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mass-messaging/links');
      const data = await response.json();
      
      if (data.success) {
        setLinks(data.data);
      }
    } catch (error) {
      message.error('加载链接列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载健康统计
  const loadHealthStats = async () => {
    try {
      const response = await fetch('/api/mass-messaging/links/stats');
      const data = await response.json();
      
      if (data.success) {
        setHealthStats(data.data);
      }
    } catch (error) {
      message.error('加载统计数据失败');
    }
  };

  // 加载趋势数据
  const loadTrendData = async () => {
    try {
      const response = await fetch('/api/mass-messaging/links/trends');
      const data = await response.json();
      
      if (data.success) {
        setTrendData(data.data);
      }
    } catch (error) {
      console.error('加载趋势数据失败');
    }
  };

  // 执行健康检查
  const handleHealthCheck = async (linkIds?: string[]) => {
    try {
      setCheckingHealth(true);
      
      const body = linkIds ? { linkIds } : {};
      const response = await fetch('/api/mass-messaging/links/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (data.success) {
        message.success(`健康检查完成，修复了 ${data.data.repaired} 个断链`);
        loadLinks();
        loadHealthStats();
      }
    } catch (error) {
      message.error('健康检查失败');
    } finally {
      setCheckingHealth(false);
    }
  };

  // 修复链接
  const handleRepairLink = async (linkId: string, newUrl?: string) => {
    try {
      const body = newUrl ? { newUrl } : {};
      const response = await fetch(`/api/mass-messaging/links/${linkId}/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await response.json();
      
      if (data.success) {
        message.success('链接修复成功');
        loadLinks();
        loadHealthStats();
      } else {
        message.error(data.message || '链接修复失败');
      }
    } catch (error) {
      message.error('链接修复失败');
    }
  };

  // 删除链接
  const handleDeleteLink = async (linkId: string) => {
    confirm({
      title: '确认删除链接？',
      content: '删除后无法恢复，相关统计数据也会丢失',
      onOk: async () => {
        try {
          const response = await fetch(`/api/mass-messaging/links/${linkId}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            message.success('链接已删除');
            loadLinks();
            loadHealthStats();
          }
        } catch (error) {
          message.error('删除链接失败');
        }
      }
    });
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colorMap = {
      active: 'success',
      broken: 'error',
      error: 'warning',
      redirected: 'processing'
    };
    return colorMap[status as keyof typeof colorMap] || 'default';
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const textMap = {
      active: '正常',
      broken: '断链',
      error: '错误',
      redirected: '重定向'
    };
    return textMap[status as keyof typeof textMap] || status;
  };

  // 获取域名列表
  const getDomains = () => {
    const domains = [...new Set(links.map(link => link.domain))];
    return domains.sort();
  };

  // 饼图数据
  const pieData = [
    { type: '正常', value: healthStats.active },
    { type: '断链', value: healthStats.broken },
    { type: '错误', value: healthStats.error },
    { type: '重定向', value: healthStats.redirected }
  ].filter(item => item.value > 0);

  // 趋势图配置
  const trendConfig = {
    data: trendData,
    xField: 'date',
    yField: 'count',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
  };

  // 饼图配置
  const pieConfig = {
    appendPadding: 10,
    data: pieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    color: ['#52c41a', '#ff4d4f', '#faad14', '#1890ff'],
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
    interactions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
  };

  // 表格列定义
  const columns = [
    {
      title: '链接信息',
      key: 'linkInfo',
      width: 300,
      render: (record: LinkData) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
            {record.title || '无标题'}
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
            {record.originalUrl}
          </div>
          <div>
            <Tag color="blue" size="small">{record.domain}</Tag>
            {record.campaigns.map(campaign => (
              <Tag key={campaign} size="small">{campaign}</Tag>
            ))}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Badge
          status={getStatusColor(status) as any}
          text={getStatusText(status)}
        />
      )
    },
    {
      title: '响应时间',
      dataIndex: 'responseTime',
      key: 'responseTime',
      width: 100,
      render: (time: number) => {
        let color = 'green';
        if (time > 3000) color = 'red';
        else if (time > 1000) color = 'orange';
        
        return (
          <span style={{ color }}>
            {time > 0 ? `${time}ms` : '-'}
          </span>
        );
      }
    },
    {
      title: '点击统计',
      key: 'clicks',
      width: 120,
      render: (record: LinkData) => (
        <div>
          <div>总点击: {record.clickCount}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            独立访客: {record.uniqueClicks}
          </div>
        </div>
      )
    },
    {
      title: '最后检查',
      dataIndex: 'lastChecked',
      key: 'lastChecked',
      width: 120,
      render: (date: string) => (
        <div style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleString()}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (record: LinkData) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedLink(record);
                // 显示详情弹窗
              }}
            />
          </Tooltip>
          
          <Tooltip title="检查状态">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={() => handleHealthCheck([record.id])}
            />
          </Tooltip>

          {(record.status === 'broken' || record.status === 'error') && (
            <Tooltip title="修复链接">
              <Button
                type="text"
                icon={<SettingOutlined />}
                onClick={() => {
                  setSelectedLink(record);
                  setShowRepairModal(true);
                }}
              />
            </Tooltip>
          )}

          <Tooltip title="删除">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteLink(record.id)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div className="link-health-monitor">
      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总链接数"
              value={healthStats.total}
              prefix={<LinkOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="正常链接"
              value={healthStats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="断链数量"
              value={healthStats.broken}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日修复"
              value={healthStats.repairedToday}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 趋势图表 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={16}>
          <Card title="链接健康趋势">
            <Line {...trendConfig} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="状态分布">
            <Pie {...pieConfig} />
          </Card>
        </Col>
      </Row>

      {/* 断链警告 */}
      {healthStats.broken > 0 && (
        <Alert
          message={`发现 ${healthStats.broken} 个断链`}
          description="断链会影响用户体验和转化率，建议立即修复"
          type="error"
          action={
            <Button
              size="small"
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => handleHealthCheck()}
            >
              自动修复
            </Button>
          }
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Search
                placeholder="搜索链接或标题"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
              />
              
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
              >
                <Option value="all">全部状态</Option>
                <Option value="active">正常</Option>
                <Option value="broken">断链</Option>
                <Option value="error">错误</Option>
                <Option value="redirected">重定向</Option>
              </Select>

              <Select
                value={domainFilter}
                onChange={setDomainFilter}
                style={{ width: 150 }}
              >
                <Option value="all">全部域名</Option>
                {getDomains().map(domain => (
                  <Option key={domain} value={domain}>{domain}</Option>
                ))}
              </Select>
            </Space>
          </Col>
          
          <Col>
            <Space>
              {selectedRowKeys.length > 0 && (
                <>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => handleHealthCheck(selectedRowKeys)}
                  >
                    批量检查 ({selectedRowKeys.length})
                  </Button>
                  
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => {
                      confirm({
                        title: `确认删除 ${selectedRowKeys.length} 个链接？`,
                        onOk: () => {
                          selectedRowKeys.forEach(id => handleDeleteLink(id));
                          setSelectedRowKeys([]);
                        }
                      });
                    }}
                  >
                    批量删除
                  </Button>
                </>
              )}
              
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={checkingHealth}
                onClick={() => handleHealthCheck()}
              >
                全量检查
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 链接列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredLinks}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 链接修复弹窗 */}
      <Modal
        title="修复链接"
        visible={showRepairModal}
        onCancel={() => setShowRepairModal(false)}
        onOk={() => {
          if (selectedLink) {
            handleRepairLink(selectedLink.id);
            setShowRepairModal(false);
          }
        }}
      >
        {selectedLink && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>原链接：</Text>
              <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                {selectedLink.originalUrl}
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>状态：</Text>
              <Badge
                status={getStatusColor(selectedLink.status) as any}
                text={getStatusText(selectedLink.status)}
              />
            </div>

            <div>
              <Text type="secondary">
                系统将尝试自动修复此链接，包括移除跟踪参数、尝试HTTPS版本、添加www前缀等策略。
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};