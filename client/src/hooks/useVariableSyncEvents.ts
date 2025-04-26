import { useState, useEffect, useCallback, useRef } from 'react';

// 定义变量同步事件类型
export interface VariableSyncEvent {
  type: 'sync' | 'connected' | 'keepalive';
  timestamp: string;
  variableId?: string;
  v3Id?: string;
  message?: string;
}

/**
 * 使用变量同步事件hook
 * 用于监听变量同步事件流
 */
export function useVariableSyncEvents() {
  // 状态管理
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<VariableSyncEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // 清理事件
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // 连接到事件流
  const connect = useCallback(() => {
    try {
      // 清理旧连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // 创建新的SSE连接
      console.log('[useVariableSyncEvents] 正在连接到变量同步事件流...');
      // 使用完整URL包含端口号和时间戳，防止缓存问题
      const eventSource = new EventSource(`http://localhost:3001/api/variables/sync/events?t=${Date.now()}`);
      console.log('[useVariableSyncEvents] EventSource连接创建：', `http://localhost:3001/api/variables/sync/events?t=${Date.now()}`);
      eventSourceRef.current = eventSource;
      
      // 设置事件监听器
      eventSource.onopen = () => {
        console.log('[useVariableSyncEvents] SSE连接已打开');
        setConnected(true);
        setError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as VariableSyncEvent;
          
          // 只处理sync类型事件，忽略keepalive
          if (data.type === 'sync') {
            console.log(`[useVariableSyncEvents] 收到变量同步事件: ${data.variableId || data.v3Id}`);
            setEvents(prev => [data, ...prev].slice(0, 100)); // 最多保存100条
          } else if (data.type === 'connected') {
            console.log(`[useVariableSyncEvents] ${data.message}`);
            setConnected(true);
          }
        } catch (err) {
          console.error('[useVariableSyncEvents] 解析事件数据失败:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('[useVariableSyncEvents] SSE连接错误:', err);
        setError('事件流连接错误，请尝试重新连接');
        setConnected(false);
        
        // 尝试关闭连接
        eventSource.close();
        eventSourceRef.current = null;
      };
      
    } catch (err) {
      console.error('[useVariableSyncEvents] 创建SSE连接失败:', err);
      setError(`创建事件流连接失败: ${err instanceof Error ? err.message : String(err)}`);
      setConnected(false);
    }
  }, []);
  
  // 断开连接
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[useVariableSyncEvents] 正在断开SSE连接...');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setConnected(false);
    }
  }, []);
  
  // 组件卸载时自动断开连接
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
  
  return {
    connected,
    events,
    error,
    connect,
    disconnect,
    clearEvents
  };
}
