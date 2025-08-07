/**
 * 指纹浏览器仪表板 - 实时画面、单独对话、群发功能
 */

import React, { useState } from 'react';
import { Layout, Card, Row, Col, Button, Space, Avatar, Badge, Tag, Tabs, message } from 'antd';
import { VideoCameraOutlined, MessageOutlined, SendOutlined, FullscreenOutlined } from '@ant-design/icons';

const { Content, Sider } = Layout;
const { TabPane } = Tabs;

export const FingerprintDashboard: React.FC = () => {
  const [streamsVisible, setStreamsVisible] = useState(true);
  const [fullscreenAccount, setFullscreenAccount] = useState<string | null>(null);

  const accounts = [
    {
      id: 'fp_001',
      name: 'John Smith',
      platform: 'whatsapp',
      status: 'online',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      location: 'New York, US',
      health: 95
    },
    {
      id: 'fp_002',
      name: 'Maria Garcia',
      platform: 'telegram',
      status: 'online',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
      location: 'Madrid, ES',
      health: 88
    },
    {
      id: 'fp_003',
      name: 'Li Wei',
      platform: 'whatsapp',
      status: 'busy',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li',
      location: 'Beijing, CN',
      health: 92
    }
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return '💬';
      case 'telegram': return '📱';
      default: return '📱';
    }
  };

  const renderRealTimeStreams = () => (
    <div style={{ background: '#000', borderRadius: '8px', padding: '16px', minHeight: '400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: '#fff' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>🎥 指纹浏览器实时画面</h3>
        <Button 
          type="text" 
          icon={streamsVisible ? '👁️' : '🙈'}
          onClick={() => setStreamsVisible(!streamsVisible)}
          style={{ color: '#fff' }}
        >
          {streamsVisible ? '隐藏' : '显示'}
        </Button>
      </div>

      {streamsVisible && (
        <Row gutter={[16, 16]}>
          {accounts.map(account => (
            <Col key={account.id} span={8}>
              <Card
                size="small"
                style={{ background: '#1a1a1a', border: '1px solid #333', position: 'relative' }}
                bodyStyle={{ padding: '8px' }}
              >
                <div style={{
                  width: '100%',
                  height: '200px',
                  background: `linear-gradient(45deg, #${account.id.slice(-6)}, #${account.id.slice(-6)}80)`,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  position: 'relative'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                      {getPlatformIcon(account.platform)}
                    </div>
                    <div>{account.name}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>
                      {account.location}
                    </div>
                  </div>
                  
                  <Badge 
                    status={account.status === 'online' ? 'success' : 'default'}
                    style={{ position: 'absolute', top: '8px', right: '8px' }}
                  />
                </div>

                <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<FullscreenOutlined />}
                    style={{ color: '#fff', background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setFullscreenAccount(account.id)}
                  />
                </div>

                <div style={{ padding: '8px 0', color: '#fff', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{account.platform}</span>
                    <span>{account.health}%</span>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );

  const renderChatInterface = () => (
    <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
      <MessageOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
      <div>单独对话功能</div>
    </div>
  );

  const renderBulkSendInterface = () => (
    <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
      <SendOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
      <div>群发消息功能</div>
    </div>
  );

  return (
    <Layout style={{ height: '100vh', background: '#f0f2f5' }}>
      <Sider width={320} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px' }}>
          <h3>🔐 指纹浏览器管理</h3>
          <div style={{ height: '300px', overflowY: 'auto' }}>
            {accounts.map(account => (
              <Card key={account.id} size="small" style={{ marginBottom: '8px' }}>
                <Space>
                  <Avatar src={account.avatar} />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{account.name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {account.platform} • {account.location}
                    </div>
                  </div>
                  <Badge status={account.status === 'online' ? 'success' : 'default'} />
                </Space>
              </Card>
            ))}
          </div>
        </div>
      </Sider>

      <Layout>
        <Content style={{ padding: '16px' }}>
          <Tabs defaultActiveKey="streams">
            <TabPane 
              tab={<span><VideoCameraOutlined />实时画面</span>} 
              key="streams"
            >
              {renderRealTimeStreams()}
            </TabPane>

            <TabPane 
              tab={<span><MessageOutlined />单独对话</span>} 
              key="chat"
            >
              {renderChatInterface()}
            </TabPane>

            <TabPane 
              tab={<span><SendOutlined />群发消息</span>} 
              key="bulk"
            >
              {renderBulkSendInterface()}
            </TabPane>
          </Tabs>
        </Content>
      </Layout>

      {fullscreenAccount && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#000',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
            <div style={{ fontSize: '24px' }}>
              {accounts.find(acc => acc.id === fullscreenAccount)?.name}
            </div>
            <div style={{ fontSize: '14px', opacity: 0.7 }}>
              指纹浏览器实时画面流
            </div>
            <Button 
              style={{ marginTop: '20px' }}
              onClick={() => setFullscreenAccount(null)}
            >
              关闭
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}; 