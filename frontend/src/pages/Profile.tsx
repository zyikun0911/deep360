import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const Profile: React.FC = () => {
  return (
    <div>
      <Title level={2}>个人资料</Title>
      <Card>
        <p>个人资料功能正在开发中...</p>
      </Card>
    </div>
  );
};

export default Profile;
