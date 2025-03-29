import { Router } from 'express';
import { VariableEventPublisher, VariableEventType } from '../services/VariableEventPublisher';

const router = Router();

/**
 * 变量事件推送端点
 * 使用Server-Sent Events (SSE) 推送变量事件
 */
router.get('/stream', (req, res) => {
  // 设置SSE头部
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 客户端连接标识
  const clientId = Date.now();
  console.log(`Client ${clientId} connected to variable events stream`);
  
  // 保持连接活跃
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);
  
  // 获取事件发布器
  const eventPublisher = VariableEventPublisher.getInstance();
  
  // 事件处理函数
  const handlers: Record<VariableEventType, (payload: any) => void> = {
    [VariableEventType.CREATED]: (payload) => {
      const data = JSON.stringify(payload);
      res.write(`event: created\n`);
      res.write(`data: ${data}\n\n`);
    },
    
    [VariableEventType.UPDATED]: (payload) => {
      const data = JSON.stringify(payload);
      res.write(`event: updated\n`);
      res.write(`data: ${data}\n\n`);
    },
    
    [VariableEventType.DELETED]: (payload) => {
      const data = JSON.stringify(payload);
      res.write(`event: deleted\n`);
      res.write(`data: ${data}\n\n`);
    },
    
    [VariableEventType.INVALIDATED]: (payload) => {
      const data = JSON.stringify(payload);
      res.write(`event: invalidated\n`);
      res.write(`data: ${data}\n\n`);
    },
    
    [VariableEventType.SOURCE_RENAMED]: (payload) => {
      const data = JSON.stringify(payload);
      res.write(`event: source_renamed\n`);
      res.write(`data: ${data}\n\n`);
    }
  };
  
  // 注册事件处理器
  const unsubscribeFunctions = Object.entries(handlers).map(([eventType, handler]) => {
    return eventPublisher.subscribe(eventType as VariableEventType, handler);
  });
  
  // 处理连接关闭
  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    console.log(`Client ${clientId} disconnected from variable events stream`);
  });
});

export default router;
