import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface TaskRow {
  key: string;
  name: string;
  type: string;
  status: string;
}

const Tasks: React.FC = () => {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);

  const columns = [
    { title: '任务名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', render: (type: string) => (<Tag color={type === 'message' ? 'blue' : 'green'}>{type}</Tag>) },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => (<Tag color={status === 'running' ? 'processing' : status === 'completed' ? 'success' : 'default'}>{status}</Tag>) },
    { title: '操作', key: 'action', render: () => (<Space size="middle"><Button type="link" icon={<EditOutlined />}>编辑</Button><Button type="link" danger icon={<DeleteOutlined />}>删除</Button></Space>) },
  ];

  const loadTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const resp = await fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error('加载任务失败');
      const raw = await resp.json();
      const list = raw?.data?.tasks || raw?.data || [];
      const mapped: TaskRow[] = (Array.isArray(list) ? list : []).map((t: any) => ({
        key: t._id,
        name: t.name || t.type,
        type: t.type,
        status: t.status || 'pending',
      }));
      setRows(mapped);
    } catch (e: any) {
      message.error(e.message || '加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>任务管理</Title>
        <Button type="primary" icon={<PlusOutlined />}>创建任务</Button>
      </div>
      <Table columns={columns} dataSource={rows} loading={loading} />
    </div>
  );
};

export default Tasks;
