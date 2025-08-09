import React, { useEffect, useState } from 'react';
import { Card, Typography, Row, Col, Statistic, message } from 'antd';

const { Title } = Typography;

const Statistics: React.FC = () => {
  const [overview, setOverview] = useState({ accounts: 0, tasks: 0, messages: 0 });
  const [byPlatform, setByPlatform] = useState<Record<string, number>>({});
  const [byStatus, setByStatus] = useState<Record<string, number>>({});

  const load = async () => {
    try {
      const token = localStorage.getItem('token');
      const h = { Authorization: `Bearer ${token}` } as any;
      const ov = await fetch('/api/stats/overview', { headers: h });
      if (!ov.ok) throw new Error('获取概览失败');
      const ovj = await ov.json();
      setOverview(ovj?.data || { accounts: 0, tasks: 0, messages: 0 });

      const acc = await fetch('/api/stats/accounts', { headers: h });
      if (!acc.ok) throw new Error('获取账号统计失败');
      const accj = await acc.json();
      setByPlatform(accj?.data?.byPlatform || {});
      setByStatus(accj?.data?.byStatus || {});
    } catch (e: any) {
      message.error(e.message || '加载统计失败');
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <Title level={2}>统计分析</Title>
      <Row gutter={16}>
        <Col span={8}><Card><Statistic title="账号数" value={overview.accounts} /></Card></Col>
        <Col span={8}><Card><Statistic title="任务数" value={overview.tasks} /></Card></Col>
        <Col span={8}><Card><Statistic title="消息数" value={overview.messages} /></Card></Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}><Card title="按平台">{Object.entries(byPlatform).map(([k,v]) => (<div key={k}>{k}: {v}</div>))}</Card></Col>
        <Col span={12}><Card title="按状态">{Object.entries(byStatus).map(([k,v]) => (<div key={k}>{k}: {v}</div>))}</Card></Col>
      </Row>
    </div>
  );
};

export default Statistics;
