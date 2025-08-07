/**
 * 群发活动创建页面
 */

import React, { useState, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Steps,
  Upload,
  Switch,
  InputNumber,
  DatePicker,
  message,
  Row,
  Col,
  Divider,
  Tag,
  Space,
  Typography,
  Tooltip,
  Progress,
  Modal
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  LinkOutlined,
  FileImageOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  SendOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { RichTextEditor } from '../../components/RichTextEditor';
import { LinkManager } from '../../components/LinkManager';
import { MediaUploader } from '../../components/MediaUploader';
import { AudienceSelector } from '../../components/AudienceSelector';
import { ContentPreview } from '../../components/ContentPreview';

const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;
const { Title, Text } = Typography;

interface CampaignCreatorProps {
  onSave?: (campaign: any) => void;
  onCancel?: () => void;
}

export const CampaignCreator: React.FC<CampaignCreatorProps> = ({
  onSave,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [messageType, setMessageType] = useState<string>('text');
  const [content, setContent] = useState<any>({});
  const [links, setLinks] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [audience, setAudience] = useState<any>({});
  const [settings, setSettings] = useState<any>({
    sendRate: 10,
    randomDelay: { min: 5, max: 30 },
    personalizeContent: false,
    trackLinks: true,
    enableRetry: true,
    maxRetries: 3
  });
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const editorRef = useRef<any>(null);

  // 步骤配置
  const steps = [
    {
      title: '基本信息',
      description: '活动名称和描述',
      icon: <SettingOutlined />
    },
    {
      title: '内容编辑',
      description: '创建消息内容',
      icon: <FileTextOutlined />
    },
    {
      title: '目标受众',
      description: '选择发送对象',
      icon: <SendOutlined />
    },
    {
      title: '发送设置',
      description: '配置发送参数',
      icon: <SettingOutlined />
    },
    {
      title: '预览确认',
      description: '最终检查',
      icon: <EyeOutlined />
    }
  ];

  // 消息类型选项
  const messageTypeOptions = [
    { value: 'text', label: '纯文本', icon: <FileTextOutlined /> },
    { value: 'rich_media', label: '超链图文', icon: <FileImageOutlined /> },
    { value: 'image', label: '图片消息', icon: <FileImageOutlined /> },
    { value: 'video', label: '视频消息', icon: <VideoCameraOutlined /> },
    { value: 'document', label: '文档消息', icon: <FileTextOutlined /> }
  ];

  // 处理步骤切换
  const handleStepChange = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step === currentStep + 1) {
      // 验证当前步骤
      validateCurrentStep().then(valid => {
        if (valid) {
          setCurrentStep(step);
        }
      });
    }
  };

  // 验证当前步骤
  const validateCurrentStep = async (): Promise<boolean> => {
    try {
      switch (currentStep) {
        case 0:
          await form.validateFields(['name', 'description']);
          return true;
        case 1:
          return validateContent();
        case 2:
          return validateAudience();
        case 3:
          return validateSettings();
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  };

  // 验证内容
  const validateContent = (): boolean => {
    if (messageType === 'text' && !content.text) {
      message.error('请输入文本内容');
      return false;
    }
    if (messageType === 'rich_media' && (!content.text || media.length === 0)) {
      message.error('超链图文需要包含文本和媒体内容');
      return false;
    }
    return true;
  };

  // 验证受众
  const validateAudience = (): boolean => {
    if (!audience.totalCount || audience.totalCount === 0) {
      message.error('请选择目标受众');
      return false;
    }
    return true;
  };

  // 验证设置
  const validateSettings = (): boolean => {
    if (settings.sendRate < 1 || settings.sendRate > 100) {
      message.error('发送速率必须在1-100之间');
      return false;
    }
    return true;
  };

  // 添加链接
  const handleAddLink = (linkData: any) => {
    setLinks([...links, {
      id: Date.now(),
      url: linkData.url,
      text: linkData.text,
      trackable: linkData.trackable || true,
      shortened: linkData.shortened || false
    }]);
  };

  // 删除链接
  const handleDeleteLink = (linkId: string) => {
    setLinks(links.filter(link => link.id !== linkId));
  };

  // 添加媒体
  const handleAddMedia = (mediaData: any) => {
    setMedia([...media, {
      id: Date.now(),
      type: mediaData.type,
      url: mediaData.url,
      name: mediaData.name,
      size: mediaData.size,
      preview: mediaData.preview
    }]);
  };

  // 删除媒体
  const handleDeleteMedia = (mediaId: string) => {
    setMedia(media.filter(item => item.id !== mediaId));
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const formData = await form.getFieldsValue();
      
      const campaignData = {
        ...formData,
        messageType,
        content: {
          ...content,
          links,
          media
        },
        targetAudience: audience,
        settings,
        status: 'draft'
      };

      // 调用API保存草稿
      const response = await fetch('/api/mass-messaging/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      if (response.ok) {
        message.success('草稿保存成功');
        onSave?.(campaignData);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      message.error('保存草稿失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建活动
  const handleCreateCampaign = async () => {
    try {
      setLoading(true);
      
      // 最终验证
      await form.validateFields();
      if (!validateContent() || !validateAudience() || !validateSettings()) {
        return;
      }

      const formData = await form.getFieldsValue();
      
      const campaignData = {
        ...formData,
        messageType,
        content: {
          ...content,
          links,
          media
        },
        targetAudience: audience,
        settings,
        status: 'ready'
      };

      // 调用API创建活动
      const response = await fetch('/api/mass-messaging/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      if (response.ok) {
        const result = await response.json();
        message.success('群发活动创建成功');
        onSave?.(result.data);
      } else {
        throw new Error('创建失败');
      }
    } catch (error) {
      message.error('创建活动失败');
    } finally {
      setLoading(false);
    }
  };

  // 预览内容
  const handlePreview = () => {
    setPreviewVisible(true);
  };

  // 渲染基本信息步骤
  const renderBasicInfoStep = () => (
    <Card title="基本信息" className="step-card">
      <Form form={form} layout="vertical">
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="活动名称"
              rules={[{ required: true, message: '请输入活动名称' }]}
            >
              <Input placeholder="输入群发活动名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="platforms" label="发送平台" initialValue={['whatsapp']}>
              <Select mode="multiple" placeholder="选择发送平台">
                <Option value="whatsapp">WhatsApp</Option>
                <Option value="telegram">Telegram</Option>
                <Option value="signal">Signal</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        
        <Form.Item name="description" label="活动描述">
          <TextArea rows={3} placeholder="输入活动描述（可选）" />
        </Form.Item>

        <Form.Item name="messageType" label="消息类型" initialValue="text">
          <Select onChange={setMessageType}>
            {messageTypeOptions.map(option => (
              <Option key={option.value} value={option.value}>
                <Space>
                  {option.icon}
                  {option.label}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Card>
  );

  // 渲染内容编辑步骤
  const renderContentEditStep = () => (
    <Card title="内容编辑" className="step-card">
      {messageType === 'text' && (
        <div>
          <TextArea
            rows={8}
            placeholder="输入文本内容..."
            value={content.text}
            onChange={(e) => setContent({ ...content, text: e.target.value })}
          />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              支持变量：{'{name}'}, {'{phone}'}, {'{company}'}
            </Text>
          </div>
        </div>
      )}

      {messageType === 'rich_media' && (
        <div>
          <RichTextEditor
            ref={editorRef}
            value={content}
            onChange={setContent}
            onAddLink={handleAddLink}
            onAddMedia={handleAddMedia}
          />
          
          <Divider orientation="left">链接管理</Divider>
          <LinkManager
            links={links}
            onAdd={handleAddLink}
            onDelete={handleDeleteLink}
            onEdit={(linkId, linkData) => {
              setLinks(links.map(link => 
                link.id === linkId ? { ...link, ...linkData } : link
              ));
            }}
          />

          <Divider orientation="left">媒体文件</Divider>
          <MediaUploader
            media={media}
            onAdd={handleAddMedia}
            onDelete={handleDeleteMedia}
            maxSize={10} // 10MB
            allowedTypes={['image', 'video']}
          />
        </div>
      )}

      {(messageType === 'image' || messageType === 'video' || messageType === 'document') && (
        <div>
          <MediaUploader
            media={media}
            onAdd={handleAddMedia}
            onDelete={handleDeleteMedia}
            maxSize={messageType === 'video' ? 50 : 10}
            allowedTypes={[messageType]}
            single={true}
          />
          
          <div style={{ marginTop: 16 }}>
            <TextArea
              rows={3}
              placeholder="添加说明文字（可选）"
              value={content.caption}
              onChange={(e) => setContent({ ...content, caption: e.target.value })}
            />
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Button icon={<EyeOutlined />} onClick={handlePreview}>
          预览内容
        </Button>
      </div>
    </Card>
  );

  // 渲染目标受众步骤
  const renderAudienceStep = () => (
    <Card title="目标受众" className="step-card">
      <AudienceSelector
        value={audience}
        onChange={setAudience}
        showStats={true}
      />
      
      {audience.totalCount > 0 && (
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f6f6f6', borderRadius: 8 }}>
          <Row gutter={16}>
            <Col span={6}>
              <div className="stat-item">
                <div className="stat-value">{audience.totalCount}</div>
                <div className="stat-label">总目标数</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-item">
                <div className="stat-value">{audience.validCount || 0}</div>
                <div className="stat-label">有效号码</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-item">
                <div className="stat-value">{audience.platforms?.whatsapp || 0}</div>
                <div className="stat-label">WhatsApp</div>
              </div>
            </Col>
            <Col span={6}>
              <div className="stat-item">
                <div className="stat-value">{audience.platforms?.telegram || 0}</div>
                <div className="stat-label">Telegram</div>
              </div>
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );

  // 渲染发送设置步骤
  const renderSettingsStep = () => (
    <Card title="发送设置" className="step-card">
      <Row gutter={24}>
        <Col span={12}>
          <div className="setting-group">
            <Title level={5}>发送控制</Title>
            
            <div className="setting-item">
              <Text>发送速率（条/分钟）</Text>
              <InputNumber
                min={1}
                max={100}
                value={settings.sendRate}
                onChange={(value) => setSettings({...settings, sendRate: value})}
                style={{ width: '100%' }}
              />
            </div>

            <div className="setting-item">
              <Text>随机延迟（秒）</Text>
              <Row gutter={8}>
                <Col span={12}>
                  <InputNumber
                    min={1}
                    max={300}
                    placeholder="最小"
                    value={settings.randomDelay.min}
                    onChange={(value) => setSettings({
                      ...settings,
                      randomDelay: { ...settings.randomDelay, min: value }
                    })}
                  />
                </Col>
                <Col span={12}>
                  <InputNumber
                    min={1}
                    max={300}
                    placeholder="最大"
                    value={settings.randomDelay.max}
                    onChange={(value) => setSettings({
                      ...settings,
                      randomDelay: { ...settings.randomDelay, max: value }
                    })}
                  />
                </Col>
              </Row>
            </div>
          </div>
        </Col>

        <Col span={12}>
          <div className="setting-group">
            <Title level={5}>高级选项</Title>
            
            <div className="setting-item">
              <Space>
                <Switch
                  checked={settings.personalizeContent}
                  onChange={(checked) => setSettings({...settings, personalizeContent: checked})}
                />
                <Text>个性化内容</Text>
                <Tooltip title="根据用户信息自动替换变量">
                  <Button type="link" size="small">?</Button>
                </Tooltip>
              </Space>
            </div>

            <div className="setting-item">
              <Space>
                <Switch
                  checked={settings.trackLinks}
                  onChange={(checked) => setSettings({...settings, trackLinks: checked})}
                />
                <Text>链接跟踪</Text>
              </Space>
            </div>

            <div className="setting-item">
              <Space>
                <Switch
                  checked={settings.enableRetry}
                  onChange={(checked) => setSettings({...settings, enableRetry: checked})}
                />
                <Text>失败重试</Text>
              </Space>
            </div>

            {settings.enableRetry && (
              <div className="setting-item">
                <Text>最大重试次数</Text>
                <InputNumber
                  min={1}
                  max={5}
                  value={settings.maxRetries}
                  onChange={(value) => setSettings({...settings, maxRetries: value})}
                />
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );

  // 渲染预览确认步骤
  const renderPreviewStep = () => (
    <Card title="预览确认" className="step-card">
      <Row gutter={24}>
        <Col span={16}>
          <ContentPreview
            messageType={messageType}
            content={content}
            links={links}
            media={media}
          />
        </Col>
        
        <Col span={8}>
          <Card size="small" title="活动摘要">
            <div className="summary-item">
              <Text strong>活动名称：</Text>
              <Text>{form.getFieldValue('name')}</Text>
            </div>
            <div className="summary-item">
              <Text strong>消息类型：</Text>
              <Text>{messageTypeOptions.find(opt => opt.value === messageType)?.label}</Text>
            </div>
            <div className="summary-item">
              <Text strong>目标受众：</Text>
              <Text>{audience.totalCount} 个联系人</Text>
            </div>
            <div className="summary-item">
              <Text strong>发送平台：</Text>
              <div>
                {form.getFieldValue('platforms')?.map((platform: string) => (
                  <Tag key={platform} color="blue">{platform}</Tag>
                ))}
              </div>
            </div>
            <div className="summary-item">
              <Text strong>预计耗时：</Text>
              <Text>{Math.ceil(audience.totalCount / settings.sendRate)} 分钟</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );

  return (
    <div className="campaign-creator">
      <Card>
        <Steps
          current={currentStep}
          onChange={handleStepChange}
          style={{ marginBottom: 24 }}
        >
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={step.icon}
            />
          ))}
        </Steps>

        <div className="step-content">
          {currentStep === 0 && renderBasicInfoStep()}
          {currentStep === 1 && renderContentEditStep()}
          {currentStep === 2 && renderAudienceStep()}
          {currentStep === 3 && renderSettingsStep()}
          {currentStep === 4 && renderPreviewStep()}
        </div>

        <div className="step-actions">
          <Space>
            {currentStep > 0 && (
              <Button onClick={() => setCurrentStep(currentStep - 1)}>
                上一步
              </Button>
            )}
            
            {currentStep < steps.length - 1 && (
              <Button
                type="primary"
                onClick={() => handleStepChange(currentStep + 1)}
              >
                下一步
              </Button>
            )}

            {currentStep === steps.length - 1 && (
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={loading}
                onClick={handleCreateCampaign}
              >
                创建活动
              </Button>
            )}

            <Button onClick={handleSaveDraft} loading={loading}>
              保存草稿
            </Button>

            <Button onClick={onCancel}>
              取消
            </Button>
          </Space>
        </div>
      </Card>

      <Modal
        title="内容预览"
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={null}
      >
        <ContentPreview
          messageType={messageType}
          content={content}
          links={links}
          media={media}
        />
      </Modal>
    </div>
  );
};