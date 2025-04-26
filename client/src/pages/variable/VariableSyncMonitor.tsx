import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Space, Table, Tag, Alert, Divider, Badge, Tooltip, Empty, Switch } from 'antd';
import { ArrowLeftOutlined, SyncOutlined, ThunderboltOutlined, ClearOutlined, DisconnectOutlined, ApiOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useVariableSyncEvents, VariableSyncEvent } from '../../hooks/useVariableSyncEvents';
import VariableThemeService from '../../services/VariableThemeService';

const { Title, Text } = Typography;

/**
 * 变量同步监控页面
 * 用于监控和展示变量同步事件
 */
const VariableSyncMonitor: React.FC = () => {
  const navigate = useNavigate();
  const { connected, events, error, connect, disconnect, clearEvents } = useVariableSyncEvents();
  const [autoScroll, setAutoScroll] = useState(true);
  
  // 连接状态标签
  const connectionStatusTag = connected ? (
    <Badge status="success" text={<Text strong>已连接</Text>} />
  ) : (
    <Badge status="error" text={<Text type="danger" strong>未连接</Text>} />
  );
  
  // 自动连接
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  // 格式化事件时间
  const formatEventTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      let formatted = '';
      if (diffSeconds < 60) {
        formatted = `${diffSeconds}秒前`;
      } else if (diffSeconds < 3600) {
        formatted = `${Math.floor(diffSeconds / 60)}分钟前`;
      } else if (diffSeconds < 86400) {
        formatted = `${Math.floor(diffSeconds / 3600)}小时前`;
      } else {
        formatted = `${Math.floor(diffSeconds / 86400)}天前`;
      }
      
      return (
        <Tooltip title={date.toLocaleString()}>
          {formatted}
        </Tooltip>
      );
    } catch (err) {
      return timeString;
    }
  };
  
  // 获取变量类型
  const getVariableType = (variableId?: string): string => {
    if (!variableId) return '未知';
    
    if (variableId.startsWith('npc_')) {
      return 'NPC';
    } else if (variableId.startsWith('task_')) {
      return '工作任务';
    } else if (variableId.startsWith('workflow_')) {
      return '工作流';
    } else if (variableId.startsWith('file_')) {
      return '文件';
    } else if (variableId.includes('.')) {
      // 旧格式ID，通过点号分隔
      const parts = variableId.split('.');
      if (parts[0].includes('npc')) {
        return 'NPC';
      } else if (parts[0].includes('task')) {
        return '工作任务';
      } else if (parts[0].includes('workflow')) {
        return '工作流';
      } else if (parts[0].includes('file')) {
        return '文件';
      }
    }
    
    return '自定义';
  };
  
  // 获取变量类型颜色
  const getVariableTypeColor = (type: string) => {
    switch (type) {
      case 'NPC':
        return VariableThemeService.getMainColor('npc');
      case '工作任务':
        return VariableThemeService.getMainColor('task');
      case '工作流':
        return VariableThemeService.getMainColor('workflow');
      case '文件':
        return VariableThemeService.getMainColor('file');
      case '自定义':
        return VariableThemeService.getMainColor('custom');
      default:
        return '#999';
    }
  };
  
  // 表格列定义
  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => formatEventTime(timestamp),
      width: 150
    },
    {
      title: '类型',
      key: 'variableType',
      render: (_: any, record: VariableSyncEvent) => {
        const type = getVariableType(record.v3Id || record.variableId);
        return (
          <Tag color={getVariableTypeColor(type)} style={{ color: '#fff' }}>
            {type}
          </Tag>
        );
      },
      width: 100
    },
    {
      title: '标识符',
      key: 'identifier',
      render: (_: any, record: VariableSyncEvent) => {
        // 标识符优先使用V3格式
        const id = record.v3Id || record.variableId || '未知';
        return (
          <Typography.Text copyable style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>
            {id}
          </Typography.Text>
        );
      }
    },
    {
      title: '状态',
      key: 'status',
      render: () => (
        <Tag color="green" icon={<CheckCircleOutlined />}>
          已同步
        </Tag>
      ),
      width: 100
    }
  ];
  
  return (
    <div className="variable-sync-monitor">
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Space align="center">
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={() => navigate('/variable')}
                  style={{ marginRight: 8 }}
                >
                  返回变量列表
                </Button>
                <Title level={4} style={{ margin: 0 }}>
                  变量同步监控
                  <ThunderboltOutlined style={{ marginLeft: 8, color: '#faad14' }} />
                </Title>
              </Space>
              <Text type="secondary" style={{ marginLeft: 32 }}>
                实时监控变量同步事件
              </Text>
            </div>
            
            <div>
              <Space>
                <Text>自动滚动:</Text>
                <Switch 
                  checked={autoScroll} 
                  onChange={setAutoScroll}
                  checkedChildren="开启" 
                  unCheckedChildren="关闭"
                  size="small"
                />
                
                <Text>连接状态:</Text>
                {connectionStatusTag}
                
                {connected ? (
                  <Button 
                    danger
                    icon={<DisconnectOutlined />} 
                    onClick={disconnect}
                  >
                    断开连接
                  </Button>
                ) : (
                  <Button 
                    type="primary"
                    icon={<ApiOutlined />} 
                    onClick={connect}
                  >
                    重新连接
                  </Button>
                )}
                
                <Button 
                  icon={<ClearOutlined />} 
                  onClick={clearEvents}
                >
                  清空事件
                </Button>
              </Space>
            </div>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      {/* 连接错误提示 */}
      {error && (
        <Alert
          message="连接错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" type="primary" onClick={connect}>
              重试
            </Button>
          }
        />
      )}
      
      {/* 状态指示器 */}
      <div style={{ marginBottom: 16 }}>
        <Card size="small">
          <Space>
            <Text>实时监控状态:</Text>
            {connected ? (
              <Badge status="processing" text={<Text type="success">正在接收变量同步事件</Text>} />
            ) : (
              <Badge status="error" text={<Text type="danger">未连接到事件流</Text>} />
            )}
            <Divider type="vertical" />
            <Text>累计收到事件:</Text>
            <Text strong>{events.length}</Text>
            <Divider type="vertical" />
            <Text>上次事件时间:</Text>
            {events.length > 0 ? (
              <Text>{formatEventTime(events[0]?.timestamp)}</Text>
            ) : (
              <Text type="secondary"><ClockCircleOutlined /> 尚未收到事件</Text>
            )}
          </Space>
        </Card>
      </div>
      
      {/* 事件表格 */}
      <Card 
        title={
          <Space>
            <SyncOutlined spin={connected} style={{ color: connected ? '#52c41a' : '#f5222d' }} />
            <span>变量同步事件流</span>
          </Space>
        }
        extra={
          <Text type="secondary">
            实时接收服务器发送的变量同步通知
          </Text>
        }
      >
        <Table
          columns={columns}
          dataSource={events}
          rowKey={(record, index) => `${record.variableId || record.v3Id || ''}-${index}`}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total) => `共 ${total} 条事件`
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  connected ? "尚未收到任何变量同步事件" : "未连接到事件流，请点击重新连接"
                }
              />
            )
          }}
        />
      </Card>
    </div>
  );
};

export default VariableSyncMonitor;
