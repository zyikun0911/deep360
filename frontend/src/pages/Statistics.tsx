import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Statistics: React.FC = () => {
  return (
    <div>
      <Title level={2}>统计分析</Title>
      <Card>
        <p>统计功能正在开发中...</p>
      </Card>
    </div>
  );
};

export default Statistics;
