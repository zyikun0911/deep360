import React from 'react';
import { Form, Input, Select, Button, Card, Typography } from 'antd';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CreateTask: React.FC = () => {
  const onFinish = (values: any) => {
    console.log('Success:', values);
  };

  return (
    <div>
      <Title level={2}>创建任务</Title>
      <Card>
        <Form
          name="createTask"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="任务名称"
            rules={[{ required: true, message: '请输入任务名称！' }]}
          >
            <Input placeholder="请输入任务名称" />
          </Form.Item>

          <Form.Item
            name="type"
            label="任务类型"
            rules={[{ required: true, message: '请选择任务类型！' }]}
          >
            <Select placeholder="请选择任务类型">
              <Option value="群发消息">群发消息</Option>
              <Option value="自动回复">自动回复</Option>
              <Option value="定时任务">定时任务</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="任务描述"
          >
            <TextArea rows={4} placeholder="请输入任务描述" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              创建任务
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateTask;
