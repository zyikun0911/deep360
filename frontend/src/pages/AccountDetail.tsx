import React from 'react';
import { Card, Descriptions, Tag, Typography } from 'antd';

const { Title } = Typography;

const AccountDetail: React.FC = () => {
  return (
    <div>
      <Title level={2}>账号详情</Title>
      <Card>
        <Descriptions title="基本信息" bordered>
          <Descriptions.Item label="账号名称">账号1</Descriptions.Item>
          <Descriptions.Item label="平台">WhatsApp</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color="green">在线</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">2024-01-01</Descriptions.Item>
          <Descriptions.Item label="最后登录">2024-01-01 12:00:00</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default AccountDetail;
