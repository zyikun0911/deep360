import React from 'react';
import { Table, Button, Space, Tag, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Tasks: React.FC = () => {
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === '群发消息' ? 'blue' : 'green'}>{type}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === '进行中' ? 'processing' : status === '已完成' ? 'success' : 'default'}>{status}</Tag>
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
      name: '群发消息任务1',
      type: '群发消息',
      status: '进行中',
    },
    {
      key: '2',
      name: '自动回复任务1',
      type: '自动回复',
      status: '已完成',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>任务管理</Title>
        <Button type="primary" icon={<PlusOutlined />}>
          创建任务
        </Button>
      </div>
      
      <Table columns={columns} dataSource={data} />
    </div>
  );
};

export default Tasks;
