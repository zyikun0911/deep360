/**
 * 实时多账号管理器 - 指纹浏览器集成
 * 支持实时画面、单独对话、群发功能
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Button,
  Space,
  Avatar,
  Badge,
  Tag,
  Input,
  Select,
  Switch,
  Modal,
  Drawer,
  Tabs,
  List,
  Tooltip,
  message,
  notification,
  Progress,
  Statistic,
  Divider,
  Typography,
  Image,
  Popconfirm,
  Dropdown,
  Menu
} from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  SendOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  FileOutlined,
  SmileOutlined,
  SettingOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  PlusOutlined,
  MinusOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  SafetyOutlined,
  GlobalOutlined,
  HeartOutlined,
  StarOutlined,
  CrownOutlined,
  FireOutlined
} from '@ant-design/icons';

const { Content, Sider } = Layout;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface Account {
  id: string;
  name: string;
  phone: string;
  country: string;
  platform: 'whatsapp' | 'telegram' | 'facebook' | 'instagram';
  status: 'online' | 'offline' | 'busy' | 'error';
  avatar: string;
  fingerprint: {
    browser: string;
    os: string;
    device: string;
    ip: string;
    location: string;
  };
  health: {
    score: number;
    lastActivity: string;
    messageCount: number;
    groupCount: number;
  };
  isSelected: boolean;
  isVisible: boolean;
  streamUrl?: string;
}

interface Message {
  id: string;
  accountId: string;
  type: 'text' | 'image' | 'video' | 'file' | 'audio';
  content: string;
  timestamp: string;
  direction: 'in' | 'out';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: any;
}

interface RealTimeAccountManagerProps {
  accounts?: Account[];
  onAccountSelect?: (accountId: string) => void;
  onSendMessage?: (accountId: string, message: Message) => void;
  onBulkSend?: (accounts: string[], message: Message) => void;
}

export const RealTimeAccountManager: React.FC<RealTimeAccountManagerProps> = ({
  accounts = [],
  onAccountSelect,
  onSendMessage,
  onBulkSend
}) => {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [inputMessage, setInputMessage] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'file'>('text');
  const [bulkMode, setBulkMode] = useState(false);
  const [streamLayout, setStreamLayout] = useState<'grid' | 'masonry' | 'carousel'>('grid');
  const [showSettings, setShowSettings] = useState(false);
  const [autoReply, setAutoReply] = useState(false);
  const [aiAssistant, setAiAssistant] = useState(false);
  const [streamsVisible, setStreamsVisible] = useState(true);
  const [fullscreenAccount, setFullscreenAccount] = useState<string | null>(null);

  // 模拟实时数据
  const mockAccounts: Account[] = [
    {
      id: 'acc_001',
      name: 'John Smith',
      phone: '+1-555-0123',
      country: 'US',
      platform: 'whatsapp',
      status: 'online',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      fingerprint: {
        browser: 'Chrome 120.0',
        os: 'Windows 11',
        device: 'Desktop',
        ip: '192.168.1.100',
        location: 'New York, US'
      },
      health: {
        score: 95,
        lastActivity: '2 minutes ago',
        messageCount: 1247,
        groupCount: 23
      },
      isSelected: false,
      isVisible: true,
      streamUrl: 'ws://localhost:8080/stream/acc_001'
    },
    {
      id: 'acc_002',
      name: 'Maria Garcia',
      phone: '+34-666-7890',
      country: 'ES',
      platform: 'telegram',
      status: 'online',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
      fingerprint: {
        browser: 'Firefox 121.0',
        os: 'macOS 14.0',
        device: 'Desktop',
        ip: '192.168.1.101',
        location: 'Madrid, ES'
      },
      health: {
        score: 88,
        lastActivity: '5 minutes ago',
        messageCount: 892,
        groupCount: 15
      },
      isSelected: false,
      isVisible: true,
      streamUrl: 'ws://localhost:8080/stream/acc_002'
    },
    {
      id: 'acc_003',
      name: 'Li Wei',
      phone: '+86-138-1234',
      country: 'CN',
      platform: 'whatsapp',
      status: 'busy',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li',
      fingerprint: {
        browser: 'Edge 120.0',
        os: 'Windows 10',
        device: 'Desktop',
        ip: '192.168.1.102',
        location: 'Beijing, CN'
      },
      health: {
        score: 92,
        lastActivity: '1 minute ago',
        messageCount: 2156,
        groupCount: 31
      },
      isSelected: false,
      isVisible: true,
      streamUrl: 'ws://localhost:8080/stream/acc_003'
    }
  ];

  const [accountList, setAccountList] = useState<Account[]>(mockAccounts);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#52c41a';
      case 'offline': return '#d9d9d9';
      case 'busy': return '#faad14';
      case 'error': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 获取平台图标
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp': return '💬';
      case 'telegram': return '📱';
      case 'facebook': return '📘';
      case 'instagram': return '📷';
      default: return '📱';
    }
  };

  // 选择账号
  const handleAccountSelect = (accountId: string) => {
    setActiveAccount(accountId);
    onAccountSelect?.(accountId);
  };

  // 切换账号可见性
  const toggleAccountVisibility = (accountId: string) => {
    setAccountList(prev => 
      prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, isVisible: !acc.isVisible }
          : acc
      )
    );
  };

  // 发送消息
  const handleSendMessage = () => {
    if (!inputMessage.trim() || !activeAccount) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      accountId: activeAccount,
      type: messageType,
      content: inputMessage,
      timestamp: new Date().toISOString(),
      direction: 'out',
      status: 'sent'
    };

    setMessages(prev => ({
      ...prev,
      [activeAccount]: [...(prev[activeAccount] || []), newMessage]
    }));

    onSendMessage?.(activeAccount, newMessage);
    setInputMessage('');
    message.success('消息已发送');
  };

  // 群发消息
  const handleBulkSend = () => {
    if (!inputMessage.trim() || selectedAccounts.length === 0) {
      message.warning('请选择账号并输入消息内容');
      return;
    }

    const bulkMessage: Message = {
      id: `bulk_${Date.now()}`,
      accountId: 'bulk',
      type: messageType,
      content: inputMessage,
      timestamp: new Date().toISOString(),
      direction: 'out',
      status: 'sent'
    };

    onBulkSend?.(selectedAccounts, bulkMessage);
    message.success(`群发消息已发送到 ${selectedAccounts.length} 个账号`);
    setInputMessage('');
    setBulkMode(false);
  };

  // 渲染实时画面
  const renderRealTimeStreams = () => (
    <div style={{ 
      background: '#000', 
      borderRadius: '8px', 
      padding: '16px',
      minHeight: '400px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        color: '#fff'
      }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          🎥 实时画面监控
        </Title>
        <Space>
          <Button 
            type="text" 
            icon={streamsVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            onClick={() => setStreamsVisible(!streamsVisible)}
            style={{ color: '#fff' }}
          >
            {streamsVisible ? '隐藏' : '显示'}
          </Button>
          <Select
            value={streamLayout}
            onChange={setStreamLayout}
            style={{ width: 120 }}
            size="small"
          >
            <Option value="grid">网格布局</Option>
            <Option value="masonry">瀑布流</Option>
            <Option value="carousel">轮播</Option>
          </Select>
        </Space>
      </div>

      {streamsVisible && (
        <Row gutter={[16, 16]}>
          {accountList.filter(acc => acc.isVisible).map(account => (
            <Col 
              key={account.id} 
              span={streamLayout === 'grid' ? 8 : 12}
              style={{ position: 'relative' }}
            >
              <Card
                size="small"
                style={{ 
                  background: '#1a1a1a', 
                  border: '1px solid #333',
                  position: 'relative'
                }}
                bodyStyle={{ padding: '8px' }}
              >
                {/* 实时画面 */}
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
                      {account.fingerprint.location}
                    </div>
                  </div>
                  
                  {/* 状态指示器 */}
                  <Badge 
                    status={account.status === 'online' ? 'success' : 'default'}
                    style={{ 
                      position: 'absolute', 
                      top: '8px', 
                      right: '8px' 
                    }}
                  />
                </div>

                {/* 控制按钮 */}
                <div style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  left: '8px',
                  display: 'flex',
                  gap: '4px'
                }}>
                  <Tooltip title="全屏">
                    <Button 
                      type="text" 
                      size="small"
                      icon={<FullscreenOutlined />}
                      style={{ color: '#fff', background: 'rgba(0,0,0,0.5)' }}
                      onClick={() => setFullscreenAccount(account.id)}
                    />
                  </Tooltip>
                  <Tooltip title="刷新">
                    <Button 
                      type="text" 
                      size="small"
                      icon={<ReloadOutlined />}
                      style={{ color: '#fff', background: 'rgba(0,0,0,0.5)' }}
                    />
                  </Tooltip>
                </div>

                {/* 账号信息 */}
                <div style={{ 
                  padding: '8px 0', 
                  color: '#fff',
                  fontSize: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{account.platform}</span>
                    <span>{account.health.score}%</span>
                  </div>
                  <Progress 
                    percent={account.health.score} 
                    size="small" 
                    showInfo={false}
                    strokeColor={account.health.score > 90 ? '#52c41a' : account.health.score > 70 ? '#faad14' : '#ff4d4f'}
                  />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );

  // 渲染账号列表
  const renderAccountList = () => (
    <div style={{ height: '300px', overflowY: 'auto' }}>
      <List
        dataSource={accountList}
        renderItem={(account) => (
          <List.Item
            style={{
              padding: '12px',
              border: account.id === activeAccount ? '2px solid #1890ff' : '1px solid #f0f0f0',
              borderRadius: '8px',
              marginBottom: '8px',
              background: account.id === activeAccount ? '#f6ffed' : '#fff',
              cursor: 'pointer'
            }}
            onClick={() => handleAccountSelect(account.id)}
            actions={[
              <Switch
                size="small"
                checked={account.isVisible}
                onChange={() => toggleAccountVisibility(account.id)}
              />,
              <Button 
                type="text" 
                size="small"
                icon={<SettingOutlined />}
              />
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar 
                  src={account.avatar} 
                  size="large"
                  style={{ border: `2px solid ${getStatusColor(account.status)}` }}
                />
              }
              title={
                <Space>
                  <span style={{ fontWeight: 'bold' }}>{account.name}</span>
                  <Badge status={account.status === 'online' ? 'success' : 'default'} />
                  <Tag color="blue">{account.platform}</Tag>
                  {account.health.score > 90 && <CrownOutlined style={{ color: '#faad14' }} />}
                </Space>
              }
              description={
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {account.phone} • {account.fingerprint.location}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    健康度: {account.health.score}% • 消息: {account.health.messageCount} • 群组: {account.health.groupCount}
                  </div>
                  <div style={{ fontSize: '10px', color: '#ccc', marginTop: '2px' }}>
                    {account.fingerprint.browser} • {account.fingerprint.os}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  // 渲染聊天界面
  const renderChatInterface = () => {
    const currentAccount = accountList.find(acc => acc.id === activeAccount);
    const currentMessages = messages[activeAccount || ''] || [];

    if (!currentAccount) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '400px',
          color: '#999'
        }}>
          请选择一个账号开始对话
        </div>
      );
    }

    return (
      <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
        {/* 聊天头部 */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Avatar src={currentAccount.avatar} size="large" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>{currentAccount.name}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {currentAccount.phone} • {currentAccount.fingerprint.location}
            </div>
          </div>
          <Space>
            <Badge status={currentAccount.status === 'online' ? 'success' : 'default'} />
            <Tag color="blue">{currentAccount.platform}</Tag>
            <Button type="text" icon={<SettingOutlined />} size="small" />
          </Space>
        </div>

        {/* 消息列表 */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '16px',
          background: '#f5f5f5'
        }}>
          {currentMessages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '100px' }}>
              <MessageOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div>暂无消息，开始对话吧！</div>
            </div>
          ) : (
            currentMessages.map(message => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.direction === 'out' ? 'flex-end' : 'flex-start',
                  marginBottom: '12px'
                }}
              >
                <div style={{
                  maxWidth: '70%',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: message.direction === 'out' ? '#1890ff' : '#fff',
                  color: message.direction === 'out' ? '#fff' : '#333',
                  border: message.direction === 'in' ? '1px solid #e8e8e8' : 'none'
                }}>
                  <div>{message.content}</div>
                  <div style={{ 
                    fontSize: '10px', 
                    opacity: 0.7, 
                    marginTop: '4px',
                    textAlign: message.direction === 'out' ? 'right' : 'left'
                  }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 输入区域 */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #f0f0f0',
          background: '#fff'
        }}>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              value={messageType}
              onChange={setMessageType}
              style={{ width: 100 }}
              size="large"
            >
              <Option value="text">文字</Option>
              <Option value="image">图片</Option>
              <Option value="video">视频</Option>
              <Option value="file">文件</Option>
            </Select>
            <TextArea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="输入消息内容..."
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ flex: 1 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              size="large"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
            >
              发送
            </Button>
          </Space.Compact>
        </div>
      </div>
    );
  };

  // 渲染群发界面
  const renderBulkSendInterface = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Title level={5}>群发消息</Title>
        <Text type="secondary">已选择 {selectedAccounts.length} 个账号</Text>
      </div>

      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          mode="multiple"
          placeholder="选择要群发的账号"
          style={{ width: '100%' }}
          value={selectedAccounts}
          onChange={setSelectedAccounts}
        >
          {accountList.map(account => (
            <Option key={account.id} value={account.id}>
              <Space>
                <Avatar src={account.avatar} size="small" />
                {account.name} ({account.platform})
              </Space>
            </Option>
          ))}
        </Select>

        <Select
          value={messageType}
          onChange={setMessageType}
          style={{ width: '100%' }}
        >
          <Option value="text">文字消息</Option>
          <Option value="image">图片消息</Option>
          <Option value="video">视频消息</Option>
          <Option value="file">文件消息</Option>
        </Select>

        <TextArea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="输入群发消息内容..."
          rows={4}
        />

        <Button
          type="primary"
          icon={<SendOutlined />}
          size="large"
          onClick={handleBulkSend}
          disabled={!inputMessage.trim() || selectedAccounts.length === 0}
          style={{ width: '100%' }}
        >
          群发到 {selectedAccounts.length} 个账号
        </Button>
      </Space>
    </div>
  );

  return (
    <Layout style={{ height: '100vh', background: '#f0f2f5' }}>
      <Sider width={320} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px' }}>
          <Title level={4}>📱 账号管理</Title>
          {renderAccountList()}
        </div>
      </Sider>

      <Layout>
        <Content style={{ padding: '16px' }}>
          <Tabs defaultActiveKey="streams">
            <TabPane 
              tab={
                <span>
                  <VideoCameraOutlined />
                  实时画面
                </span>
              } 
              key="streams"
            >
              {renderRealTimeStreams()}
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <MessageOutlined />
                  单独对话
                </span>
              } 
              key="chat"
            >
              {renderChatInterface()}
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <SendOutlined />
                  群发消息
                </span>
              } 
              key="bulk"
            >
              {renderBulkSendInterface()}
            </TabPane>
          </Tabs>
        </Content>
      </Layout>

      {/* 全屏模式 */}
      {fullscreenAccount && (
        <Modal
          title="全屏实时画面"
          visible={!!fullscreenAccount}
          onCancel={() => setFullscreenAccount(null)}
          footer={null}
          width="90vw"
          style={{ top: 20 }}
        >
          <div style={{
            width: '100%',
            height: '70vh',
            background: '#000',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                🎥
              </div>
              <div style={{ fontSize: '24px' }}>
                {accountList.find(acc => acc.id === fullscreenAccount)?.name}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.7 }}>
                实时画面流
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 设置面板 */}
      <Drawer
        title="设置"
        placement="right"
        width={400}
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>自动回复</Text>
            <Switch 
              checked={autoReply} 
              onChange={setAutoReply}
              style={{ float: 'right' }}
            />
          </div>
          <div>
            <Text>AI助手</Text>
            <Switch 
              checked={aiAssistant} 
              onChange={setAiAssistant}
              style={{ float: 'right' }}
            />
          </div>
          <Divider />
          <div>
            <Text>指纹浏览器设置</Text>
            <div style={{ marginTop: '8px' }}>
              <Button size="small">配置指纹</Button>
              <Button size="small" style={{ marginLeft: '8px' }}>同步设置</Button>
            </div>
          </div>
        </Space>
      </Drawer>
    </Layout>
  );
}; 