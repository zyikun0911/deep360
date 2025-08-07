import React from 'react';
import { Table, Button, Space, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Accounts: React.FC = () => {
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
        <Tag color={platform === 'WhatsApp' ? 'green' : 'blue'}>{platform}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === '在线' ? 'green' : 'red'}>{status}</Tag>
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

  const data = [
    {
      key: '1',
      name: '账号1',
      platform: 'WhatsApp',
      status: '在线',
    },
    {
      key: '2',
      name: '账号2',
      platform: 'Telegram',
      status: '离线',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>账号管理</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          添加账号
        </Button>
      </div>
      
      <Table columns={columns} dataSource={data} />
    </div>
  );
};

export default Accounts;
