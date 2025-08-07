/**
 * 智能洞察组件
 */

import React from 'react';
import { Card, List, Tag, Space, Avatar, Progress, Alert } from 'antd';
import { BulbOutlined, TrophyOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

interface InsightData {
  trends: any[];
  predictions: any[];
  recommendations: any[];
  alerts: any[];
}

interface IntelligentInsightsProps {
  data?: InsightData;
}

export const IntelligentInsights: React.FC<IntelligentInsightsProps> = ({ data }) => {
  if (!data) {
    return (
      <Card title="智能洞察" style={{ height: '400px' }}>
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>暂无洞察数据</p>
        </div>
      </Card>
    );
  }

  const { trends, predictions, recommendations, alerts } = data;

  return (
    <div className="intelligent-insights">
      {/* 警告提醒 */}
      {alerts && alerts.length > 0 && (
        <Card title="重要提醒" size="small" style={{ marginBottom: '16px' }}>
          {alerts.slice(0, 3).map((alert: any, index: number) => (
            <Alert
              key={index}
              message={alert.title}
              description={alert.description}
              type={alert.type || 'warning'}
              showIcon
              style={{ marginBottom: '8px' }}
            />
          ))}
        </Card>
      )}

      {/* 智能推荐 */}
      <Card title="智能推荐" size="small" style={{ marginBottom: '16px' }}>
        <List
          size="small"
          dataSource={recommendations?.slice(0, 5) || []}
          renderItem={(item: any, index: number) => (
            <List.Item>
              <Space>
                <Avatar
                  size="small"
                  icon={<BulbOutlined />}
                  style={{ backgroundColor: '#52c41a' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{item.title || `推荐 ${index + 1}`}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {item.description || '系统建议优化此项'}
                  </div>
                </div>
                <Tag color={item.priority === 'high' ? 'red' : 'blue'}>
                  {item.priority || 'normal'}
                </Tag>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {/* 趋势分析 */}
      <Card title="趋势分析" size="small" style={{ marginBottom: '16px' }}>
        <List
          size="small"
          dataSource={trends?.slice(0, 3) || []}
          renderItem={(item: any, index: number) => (
            <List.Item>
              <Space>
                <Avatar
                  size="small"
                  icon={<TrophyOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{item.metric || `指标 ${index + 1}`}</div>
                  <Progress
                    percent={item.changePercent || Math.random() * 100}
                    size="small"
                    status={item.trend === 'up' ? 'success' : item.trend === 'down' ? 'exception' : 'normal'}
                  />
                </div>
                <Tag color={item.trend === 'up' ? 'green' : item.trend === 'down' ? 'red' : 'blue'}>
                  {item.trend || 'stable'}
                </Tag>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {/* 预测分析 */}
      <Card title="预测分析" size="small">
        <List
          size="small"
          dataSource={predictions?.slice(0, 3) || []}
          renderItem={(item: any, index: number) => (
            <List.Item>
              <Space>
                <Avatar
                  size="small"
                  icon={<ExclamationCircleOutlined />}
                  style={{ backgroundColor: '#faad14' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold' }}>{item.prediction || `预测 ${index + 1}`}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    置信度: {item.confidence || '85'}%
                  </div>
                </div>
                <Tag color="purple">预测</Tag>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};