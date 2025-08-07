import React from 'react';
import { Card, Descriptions, Tag, Typography } from 'antd';

const { Title } = Typography;

const TaskDetail: React.FC = () => {
  return (
    <div>
      <Title level={2}>任务详情</Title>
      <Card>
        <Descriptions title="基本信息" bordered>
          <Descriptions.Item label="任务名称">群发消息任务1</Descriptions.Item>
          <Descriptions.Item label="任务类型">群发消息</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color="processing">进行中</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">2024-01-01</Descriptions.Item>
          <Descriptions.Item label="开始时间">2024-01-01 12:00:00</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default TaskDetail;
