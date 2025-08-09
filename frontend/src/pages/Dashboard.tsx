import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, message } from 'antd';
import { UserOutlined, MessageOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState({ accounts: 0, tasks: 0, messages: 0 });
  const [completed, setCompleted] = useState(0);

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = { Authorization: `Bearer ${token}` };
      const ov = await fetch('/api/stats/overview', { headers });
      if (!ov.ok) throw new Error('获取概览失败');
      const ovj = await ov.json();
      setOverview(ovj?.data || { accounts: 0, tasks: 0, messages: 0 });

      const tasks = await fetch('/api/tasks', { headers });
      if (tasks.ok) {
        const tj = await tasks.json();
        const list = tj?.data?.tasks || tj?.data || [];
        const comp = (Array.isArray(list) ? list : []).filter((t: any) => t.status === 'completed').length;
        setCompleted(comp);
      }
    } catch (e: any) {
      message.error(e.message || '加载仪表板数据失败');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <Title level={2}>仪表板</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总账号数" value={overview.accounts} prefix={<UserOutlined />} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="活跃任务" value={overview.tasks} prefix={<SettingOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="今日消息" value={overview.messages} prefix={<MessageOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="完成任务" value={completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="最近活动"><p>暂无活动记录</p></Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="系统状态"><p>系统运行正常</p></Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
