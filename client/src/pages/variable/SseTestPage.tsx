import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Card, 
  Space, 
  Typography, 
  Tag, 
  Input, 
  Row, 
  Col, 
  message, 
  Divider,
  Badge
} from 'antd';
import { 
  ReloadOutlined, 
  DisconnectOutlined, 
  ClearOutlined,
  SyncOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

/**
 * 消息类型
 */
interface Message {
  id: string;
  type: 'keepalive' | 'sync' | 'connected' | 'unknown';
  eventType?: string;
  variableId?: string;
  variableType?: string;
  raw: string;
  timestamp: string;
  v3Id?: string;
}

/**
 * SSE测试页面
 * 提供简单的UI来测试SSE连接和监控变量同步
 */
const SseTestPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 状态管理
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // 返回列表页
  const goBack = () => {
    navigate('/variable/list');
  };
  
  // SSE服务URL - 直接使用变量同步服务
  const SSE_URL = 'http://localhost:3001/api/variables/sync/events';
  
  // 连接到事件流
  const connect = () => {
    try {
      // 清理旧连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // 添加时间戳防止缓存
      const testUrl = `${SSE_URL}?t=${Date.now()}`;
      console.log(`[SseTestPage] 正在连接到 ${testUrl}`);
      
      // 创建新的SSE连接
      const eventSource = new EventSource(testUrl);
      eventSourceRef.current = eventSource;
      
      message.loading('正在连接到变量同步服务...');
      
      // 设置事件监听器
      eventSource.onopen = () => {
        console.log('[SseTestPage] SSE连接已打开');
        setConnected(true);
        setError(null);
        message.success('连接成功！');
      };
      
      eventSource.onmessage = (event) => {
        try {
          console.log(`[SseTestPage] 收到消息: ${event.data}`);
          const data = JSON.parse(event.data);
          
          // 生成唯一ID
          const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // 解析消息类型
          let msgType: 'keepalive' | 'sync' | 'connected' | 'unknown' = 'unknown';
          if (data.type === 'keepalive') msgType = 'keepalive';
          else if (data.type === 'sync') msgType = 'sync';
          else if (data.type === 'connected') msgType = 'connected';
          
          // 创建消息对象
          const msg: Message = {
            id: msgId,
            type: msgType,
            eventType: data.eventType,
            variableId: data.variableId,
            variableType: data.variableType,
            v3Id: data.v3Id,
            raw: JSON.stringify(data, null, 2),
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          // 更新消息列表 - 限制保留最新的50条消息
          setMessages(prev => [msg, ...prev].slice(0, 50));
          
        } catch (err) {
          console.error('[SseTestPage] 解析事件数据失败:', err);
          
          // 添加未能解析的消息
          const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const unknownMsg: Message = {
            id: msgId,
            type: 'unknown',
            raw: event.data,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [unknownMsg, ...prev].slice(0, 50));
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('[SseTestPage] SSE连接错误:', err);
        setError('事件流连接错误，请尝试重新连接');
        setConnected(false);
        message.error('连接错误！');
        
        // 尝试关闭连接
        eventSource.close();
        eventSourceRef.current = null;
      };
      
    } catch (err) {
      console.error('[SseTestPage] 创建SSE连接失败:', err);
      setError(`创建事件流连接失败: ${err instanceof Error ? err.message : String(err)}`);
      setConnected(false);
      message.error('无法创建连接');
    }
  };
  
  // 断开连接
  const disconnect = () => {
    if (eventSourceRef.current) {
      console.log('[SseTestPage] 正在断开SSE连接...');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
      message.info('已断开连接');
    }
  };
  
  // 清空消息列表
  const clearMessages = () => {
    setMessages([]);
    message.success('已清空消息列表');
  };
  
  // 组件卸载时自动断开连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  // 格式化时间
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // 渲染心跳消息
  const renderHeartbeatMessage = (msg: Message) => {
    return (
      <div style={{ fontSize: '14px', color: '#666' }}>
        {formatTime(msg.timestamp)}: 心跳
      </div>
    );
  };
  
  // 渲染变量事件消息
  const renderSyncMessage = (msg: Message) => {
    let eventContent = '';
    let eventColor = '';
    
    // 设置事件类型文本和颜色
    switch (msg.eventType) {
      case 'created':
        eventContent = '创建';
        eventColor = 'green';
        break;
      case 'updated':
        eventContent = '更新';
        eventColor = 'orange';
        break;
      case 'deleted':
        eventContent = '删除';
        eventColor = 'red';
        break;
      case 'invalidated':
        eventContent = '无效';
        eventColor = 'volcano';
        break;
      case 'source_renamed':
        eventContent = '重命名';
        eventColor = 'geekblue';
        break;
      default:
        eventContent = msg.eventType || '未知';
        eventColor = 'default';
    }
    
    return (
      <div style={{ fontSize: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <Text style={{ fontWeight: 'bold' }}>{formatTime(msg.timestamp)}: 变量{eventContent}</Text>
          <Tag color={eventColor}>{eventContent}</Tag>
        </div>
        {msg.variableId && (
          <div>
            <Text strong>变量ID: </Text>
            <Text>{msg.variableId}</Text>
          </div>
        )}
        {msg.variableType && (
          <div>
            <Text strong>变量类型: </Text>
            <Tag color="cyan">{msg.variableType}</Tag>
          </div>
        )}
        {msg.v3Id && (
          <div>
            <Text strong>V3 ID: </Text>
            <Text>{msg.v3Id}</Text>
          </div>
        )}
      </div>
    );
  };
  
  // 渲染连接消息
  const renderConnectedMessage = (msg: Message) => {
    return (
      <div style={{ fontSize: '14px', color: '#722ed1' }}>
        {formatTime(msg.timestamp)}: 已连接到变量同步服务
      </div>
    );
  };
  
  // 渲染未知消息
  const renderUnknownMessage = (msg: Message) => {
    return (
      <div style={{ fontSize: '14px', color: '#f5222d' }}>
        {formatTime(msg.timestamp)}: 未知消息格式
        <div style={{ color: '#666', marginTop: '4px' }}>
          <code>{msg.raw}</code>
        </div>
      </div>
    );
  };
  
  // 根据消息类型渲染不同的消息内容
  const renderMessage = (msg: Message) => {
    switch (msg.type) {
      case 'keepalive':
        return renderHeartbeatMessage(msg);
      case 'sync':
        return renderSyncMessage(msg);
      case 'connected':
        return renderConnectedMessage(msg);
      default:
        return renderUnknownMessage(msg);
    }
  };
  
  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              变量同步监控
            </Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button 
              type="primary" 
              onClick={connect} 
              icon={<ReloadOutlined />}
              disabled={connected}
            >
              连接
            </Button>
            <Button 
              danger 
              onClick={disconnect} 
              icon={<DisconnectOutlined />}
              disabled={!connected}
            >
              断开
            </Button>
            <Button 
              onClick={clearMessages} 
              icon={<ClearOutlined />}
            >
              清空
            </Button>
          </Space>
          
          <Space>
            {connected ? (
              <Badge status="success" text={<Text strong style={{ color: 'green' }}>已连接</Text>} />
            ) : (
              <Badge status="error" text={<Text strong style={{ color: 'red' }}>未连接</Text>} />
            )}
            {connected && <SyncOutlined spin style={{ color: 'green' }} />}
          </Space>
        </Space>
        
        {error && <div style={{ color: 'red', marginTop: 8, fontSize: 13 }}>{error}</div>}
      </Card>
      
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>接收到的消息</span>
            <Badge 
              count={messages.filter(m => m.type === 'sync').length} 
              style={{ backgroundColor: '#52c41a' }} 
              title="变量事件数量"
              showZero
            />
          </div>
        }
      >
        {messages.length === 0 ? (
          <Text type="secondary">还没有接收到任何消息。请先连接到服务器。</Text>
        ) : (
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                  marginBottom: 12,
                  padding: 8,
                  borderLeft: msg.type === 'sync' ? '4px solid #52c41a' : 
                             msg.type === 'keepalive' ? '4px solid #e6f7ff' : 
                             msg.type === 'connected' ? '4px solid #722ed1' :
                             '4px solid #f5222d',
                  backgroundColor: msg.type === 'sync' ? '#f6ffed' : 
                                   msg.type === 'keepalive' ? '#f5f5f5' : 
                                   msg.type === 'connected' ? '#f9f0ff' :
                                   '#fff1f0',
                  borderRadius: 4
                }}
              >
                {renderMessage(msg)}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SseTestPage;
