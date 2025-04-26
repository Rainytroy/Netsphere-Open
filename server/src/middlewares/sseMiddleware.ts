/**
 * SSE (Server-Sent Events) 中间件
 * 用于处理SSE连接，确保内容类型正确设置
 */

import { Request, Response, NextFunction } from 'express';

/**
 * 启用SSE连接的中间件
 */
export const sseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 设置SSE所需的标头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
  
  // 允许跨域
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 禁用响应缓冲
  res.flushHeaders();
  
  // 保持连接打开
  const keepAliveTimer = setInterval(() => {
    // 发送注释行作为心跳，保持连接活跃
    if (!res.finished) {
      res.write(': keepalive\n\n');
    }
  }, 15000); // 每15秒发送一次心跳
  
  // 当连接关闭时清理定时器
  req.on('close', () => {
    clearInterval(keepAliveTimer);
  });
  
  next();
};
