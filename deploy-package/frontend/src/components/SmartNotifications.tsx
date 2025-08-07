/**
 * 智能通知组件
 */

import React, { useState } from 'react';
import { Badge, Dropdown, Menu, Button, List, Card, Empty } from 'antd';
import { BellOutlined, ExclamationCircleOutlined, InfoCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  content: string;
  time: string;
  read: boolean;
}

export const SmartNotifications: React.FC = () => {
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'warning',
      title: '发现断链',
      content: '检测到3个链接失效，建议立即修复',
      time: '2分钟前',
      read: false
    },
    {
      id: '2',
      type: 'success',
      title: '群发完成',
      content: '营销活动"春季促销"发送完成，送达率98%',
      time: '10分钟前',
      read: false
    },
    {
      id: '3',
      type: 'info',
      title: '新账号就绪',
      content: '批量注册的20个账号已完成养号，可以使用',
      time: '1小时前',
      read: true
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const notificationMenu = (
    <Card style={{ width: 300, maxHeight: 400, overflow: 'auto' }} bodyStyle={{ padding: 0 }}>
      {notifications.length > 0 ? (
        <List
          size="small"
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '12px 16px',
                backgroundColor: item.read ? 'transparent' : '#f6f6f6',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <List.Item.Meta
                avatar={getIcon(item.type)}
                title={
                  <div style={{ fontSize: '14px', fontWeight: item.read ? 'normal' : 'bold' }}>
                    {item.title}
                  </div>
                }
                description={
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{item.content}</div>
                    <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{item.time}</div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="暂无通知" style={{ padding: '40px 20px' }} />
      )}
      
      {notifications.length > 0 && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
          <Button type="link" size="small">
            查看全部
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <Dropdown 
      overlay={notificationMenu} 
      trigger={['click']} 
      placement="bottomRight"
    >
      <Badge count={unreadCount} size="small">
        <Button 
          type="text" 
          icon={<BellOutlined />} 
          style={{ border: 'none' }}
        />
      </Badge>
    </Dropdown>
  );
};