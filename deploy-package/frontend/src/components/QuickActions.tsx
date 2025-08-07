/**
 * 快速操作组件
 */

import React from 'react';
import { Card, Button, Row, Col, Space } from 'antd';
import {
  PlusOutlined,
  MessageOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  RobotOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

interface QuickActionsProps {
  templateBased?: boolean;
  batchOperations?: boolean;
  smartDefaults?: boolean;
  culturalPresets?: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  templateBased = true,
  batchOperations = true,
  smartDefaults = true,
  culturalPresets = true
}) => {
  const quickActions = [
    {
      title: '创建群发活动',
      icon: <MessageOutlined />,
      color: '#1890ff',
      description: '快速创建营销活动',
      action: () => window.location.href = '/mass-messaging/create'
    },
    {
      title: '批量注册账号',
      icon: <UserOutlined />,
      color: '#52c41a',
      description: '自动注册多个账号',
      action: () => window.location.href = '/registration/batch'
    },
    {
      title: '创建群组',
      icon: <TeamOutlined />,
      color: '#faad14',
      description: '批量创建群组',
      action: () => window.location.href = '/groups/create'
    },
    {
      title: '健康检查',
      icon: <SafetyOutlined />,
      color: '#f5222d',
      description: '系统健康检查',
      action: () => {
        // 这里应该调用健康检查API
        console.log('执行健康检查');
      }
    },
    {
      title: 'AI助手',
      icon: <RobotOutlined />,
      color: '#722ed1',
      description: '智能助手服务',
      action: () => {
        // 这里应该打开AI助手
        console.log('打开AI助手');
      }
    },
    {
      title: '系统设置',
      icon: <SettingOutlined />,
      color: '#13c2c2',
      description: '系统配置管理',
      action: () => window.location.href = '/settings'
    }
  ];

  return (
    <Card 
      title={
        <Space>
          <ThunderboltOutlined />
          快速操作
          {smartDefaults && <span style={{ fontSize: '12px', color: '#666' }}>智能默认</span>}
        </Space>
      }
    >
      <Row gutter={[8, 8]}>
        {quickActions.map((action, index) => (
          <Col span={8} key={index}>
            <Button
              type="text"
              block
              style={{
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px dashed ${action.color}`,
                color: action.color,
                borderRadius: '8px'
              }}
              onClick={action.action}
            >
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                {action.icon}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {action.title}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                {action.description}
              </div>
            </Button>
          </Col>
        ))}
      </Row>

      {batchOperations && (
        <div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <Space>
            <Button size="small" icon={<PlusOutlined />}>
              批量操作
            </Button>
            {templateBased && (
              <Button size="small">
                模板操作
              </Button>
            )}
            {culturalPresets && (
              <Button size="small">
                文化预设
              </Button>
            )}
          </Space>
        </div>
      )}
    </Card>
  );
};