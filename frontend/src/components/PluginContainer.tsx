/**
 * 智能插件容器 - 支持可拖拽、可调整大小的插件展示
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Tooltip, Dropdown, Menu, Badge, Spin } from 'antd';
import {
  ExpandOutlined,
  CompressOutlined,
  SettingOutlined,
  CloseOutlined,
  DragOutlined,
  MoreOutlined,
  ReloadOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface PluginContainerProps {
  plugin: {
    id: string;
    name: string;
    displayName: string;
    type: 'widget' | 'panel' | 'chart' | 'form' | 'table';
    category: string;
    icon?: React.ReactNode;
    description?: string;
    status: 'active' | 'loading' | 'error' | 'disabled';
    version: string;
  };
  children: React.ReactNode;
  size: {
    width: number;
    height: number;
  };
  position: {
    x: number;
    y: number;
  };
  resizable?: boolean;
  draggable?: boolean;
  closable?: boolean;
  collapsible?: boolean;
  expandable?: boolean;
  onResize?: (size: { width: number; height: number }) => void;
  onMove?: (position: { x: number; y: number }) => void;
  onClose?: () => void;
  onSettings?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export const PluginContainer: React.FC<PluginContainerProps> = ({
  plugin,
  children,
  size,
  position,
  resizable = true,
  draggable = true,
  closable = true,
  collapsible = true,
  expandable = true,
  onResize,
  onMove,
  onClose,
  onSettings,
  onRefresh,
  className = ''
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentSize, setCurrentSize] = useState(size);
  const [currentPosition, setCurrentPosition] = useState(position);

  // 处理大小调整
  const handleResize = (event: any, { size: newSize }: any) => {
    setCurrentSize(newSize);
    onResize?.(newSize);
  };

  // 处理拖拽
  const handleDragStart = (e: React.MouseEvent) => {
    if (!draggable) return;
    
    setIsDragging(true);
    const startX = e.clientX - currentPosition.x;
    const startY = e.clientY - currentPosition.y;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = {
        x: e.clientX - startX,
        y: e.clientY - startY
      };
      setCurrentPosition(newPosition);
      onMove?.(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#52c41a';
      case 'loading': return '#1890ff';
      case 'error': return '#ff4d4f';
      case 'disabled': return '#d9d9d9';
      default: return '#d9d9d9';
    }
  };

  // 插件操作菜单
  const actionMenu = (
    <Menu>
      {onRefresh && (
        <Menu.Item key="refresh" icon={<ReloadOutlined />} onClick={onRefresh}>
          刷新插件
        </Menu.Item>
      )}
      {onSettings && (
        <Menu.Item key="settings" icon={<SettingOutlined />} onClick={onSettings}>
          插件设置
        </Menu.Item>
      )}
      <Menu.Item key="help" icon={<QuestionCircleOutlined />}>
        帮助文档
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="info">
        版本: {plugin.version}
      </Menu.Item>
    </Menu>
  );

  // 渲染插件头部
  const renderHeader = () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderBottom: collapsed ? 'none' : '1px solid #f0f0f0',
      cursor: draggable ? 'move' : 'default'
    }} onMouseDown={handleDragStart}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {draggable && <DragOutlined style={{ color: '#999' }} />}
        {plugin.icon}
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
          {plugin.displayName}
        </span>
        <Badge 
          color={getStatusColor(plugin.status)} 
          title={`状态: ${plugin.status}`}
        />
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {collapsible && (
          <Tooltip title={collapsed ? '展开' : '折叠'}>
            <Button 
              type="text" 
              size="small"
              icon={collapsed ? <ExpandOutlined /> : <CompressOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          </Tooltip>
        )}
        
        {expandable && (
          <Tooltip title={expanded ? '恢复' : '最大化'}>
            <Button 
              type="text" 
              size="small"
              icon={expanded ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={() => setExpanded(!expanded)}
            />
          </Tooltip>
        )}
        
        <Dropdown overlay={actionMenu} trigger={['click']}>
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
        
        {closable && (
          <Tooltip title="关闭插件">
            <Button 
              type="text" 
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={onClose}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );

  // 渲染插件内容
  const renderContent = () => {
    if (collapsed) return null;
    
    return (
      <div style={{ 
        padding: '12px',
        height: currentSize.height - 60, // 减去头部高度
        overflow: 'auto'
      }}>
        {plugin.status === 'loading' ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <Spin tip="插件加载中..." />
          </div>
        ) : plugin.status === 'error' ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#ff4d4f'
          }}>
            <div>插件加载失败</div>
            {onRefresh && (
              <Button 
                type="link" 
                icon={<ReloadOutlined />} 
                onClick={onRefresh}
                style={{ marginTop: '8px' }}
              >
                重试
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    );
  };

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: currentPosition.x,
    top: currentPosition.y,
    width: currentSize.width,
    height: collapsed ? 'auto' : currentSize.height,
    zIndex: isDragging ? 1000 : expanded ? 999 : 1,
    transition: isDragging ? 'none' : 'all 0.3s ease',
    transform: expanded ? 'scale(1.02)' : 'scale(1)',
    boxShadow: expanded ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.1)'
  };

  if (resizable && !collapsed && !expanded) {
    return (
      <Resizable
        width={currentSize.width}
        height={currentSize.height}
        onResize={handleResize}
        minConstraints={[200, 150]}
        maxConstraints={[800, 600]}
      >
        <div
          ref={containerRef}
          className={`plugin-container ${className}`}
          style={containerStyle}
        >
          <Card 
            size="small"
            bodyStyle={{ padding: 0 }}
            style={{ height: '100%', border: '1px solid #d9d9d9' }}
          >
            {renderHeader()}
            {renderContent()}
          </Card>
        </div>
      </Resizable>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`plugin-container ${className}`}
      style={containerStyle}
    >
      <Card 
        size="small"
        bodyStyle={{ padding: 0 }}
        style={{ height: '100%', border: '1px solid #d9d9d9' }}
      >
        {renderHeader()}
        {renderContent()}
      </Card>
    </div>
  );
};