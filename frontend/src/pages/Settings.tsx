import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Settings: React.FC = () => {
  return (
    <div>
      <Title level={2}>系统设置</Title>
      <Card>
        <p>设置功能正在开发中...</p>
      </Card>
    </div>
  );
};

export default Settings;
