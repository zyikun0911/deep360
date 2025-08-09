import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface AccountRow {
  key: string;
  name: string;
  platform: string;
  status: string;
}

const Accounts: React.FC = () => {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    {
      title: '账号名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '平台',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => (
        <Tag color={platform === 'whatsapp' ? 'green' : 'blue'}>{platform}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'connected' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link" icon={<EditOutlined />}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Space>
      ),
    },
  ];

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('加载账号失败');
      const raw = await resp.json();
      const list = raw?.data || [];
      const mapped: AccountRow[] = (Array.isArray(list) ? list : []).map((a: any) => ({
        key: a._id || a.accountId,
        name: a.name,
        platform: a.type || a.platform,
        status: a.status || 'pending',
      }));
      setRows(mapped);
    } catch (e: any) {
      message.error(e.message || '加载账号失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAccounts(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>账号管理</Title>
        <Button type="primary" icon={<PlusOutlined />}>添加账号</Button>
      </div>
      <Table columns={columns} dataSource={rows} loading={loading} />
    </div>
  );
};

export default Accounts;
