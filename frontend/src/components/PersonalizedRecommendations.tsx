/**
 * 个性化推荐组件
 */

import React, { useState } from 'react';
import { Card, List, Button, Tag, Space, Avatar, Progress, Tabs } from 'antd';
import { RobotOutlined, BulbOutlined, TrophyOutlined, StarOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

interface Recommendation {
  id: string;
  type: 'optimization' | 'strategy' | 'feature' | 'best_practice';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'medium' | 'hard';
  category: string;
}

export const PersonalizedRecommendations: React.FC = () => {
  const [recommendations] = useState<Recommendation[]>([
    {
      id: '1',
      type: 'optimization',
      title: '优化群发时间',
      description: '根据您的受众分析，建议在晚上8-10点发送消息，可提升30%的打开率',
      impact: 'high',
      effort: 'easy',
      category: '效果优化'
    },
    {
      id: '2',
      type: 'strategy',
      title: '增加欧洲市场账号',
      description: '检测到您的业务主要集中在亚洲，建议增加欧洲账号以扩展市场覆盖',
      impact: 'high',
      effort: 'medium',
      category: '市场扩展'
    },
    {
      id: '3',
      type: 'feature',
      title: '启用AI内容生成',
      description: '基于您的历史数据，AI可以为您生成更有吸引力的营销内容',
      impact: 'medium',
      effort: 'easy',
      category: '功能建议'
    },
    {
      id: '4',
      type: 'best_practice',
      title: '设置链接健康监控',
      description: '定期检查链接状态可以避免用户体验问题，建议启用自动监控',
      impact: 'medium',
      effort: 'easy',
      category: '最佳实践'
    }
  ]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'blue';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrophyOutlined style={{ color: '#52c41a' }} />;
      case 'strategy': return <BulbOutlined style={{ color: '#1890ff' }} />;
      case 'feature': return <StarOutlined style={{ color: '#722ed1' }} />;
      case 'best_practice': return <RobotOutlined style={{ color: '#faad14' }} />;
      default: return <BulbOutlined />;
    }
  };

  const categoryGroups = recommendations.reduce((groups, rec) => {
    const category = rec.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(rec);
    return groups;
  }, {} as Record<string, Recommendation[]>);

  return (
    <div className="personalized-recommendations">
      <Card 
        title={
          <Space>
            <RobotOutlined />
            AI智能推荐
            <Tag color="blue">个性化</Tag>
          </Space>
        }
        style={{ height: '600px', overflow: 'auto' }}
      >
        <Tabs defaultActiveKey="all">
          <TabPane tab="全部推荐" key="all">
            <List
              dataSource={recommendations}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button type="primary" size="small">
                      采纳建议
                    </Button>,
                    <Button size="small">
                      了解详情
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={getTypeIcon(item.type)} />}
                    title={
                      <Space>
                        {item.title}
                        <Tag color={getImpactColor(item.impact)}>
                          {item.impact === 'high' ? '高影响' : item.impact === 'medium' ? '中等影响' : '低影响'}
                        </Tag>
                        <Tag color={getEffortColor(item.effort)}>
                          {item.effort === 'easy' ? '容易实施' : item.effort === 'medium' ? '中等难度' : '较难实施'}
                        </Tag>
                      </Space>
                    }
                    description={item.description}
                  />
                </List.Item>
              )}
            />
          </TabPane>
          
          {Object.entries(categoryGroups).map(([category, items]) => (
            <TabPane tab={category} key={category}>
              <List
                dataSource={items}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button type="primary" size="small">
                        采纳建议
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={getTypeIcon(item.type)} />}
                      title={item.title}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </TabPane>
          ))}
        </Tabs>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Space>
            <Button type="dashed">
              刷新推荐
            </Button>
            <Button>
              反馈建议
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};