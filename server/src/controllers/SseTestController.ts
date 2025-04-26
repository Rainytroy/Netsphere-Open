/**
 * SSE测试控制器
 * 专门用于测试SSE连接，无业务逻辑，简单实现
 */

import { Request, Response } from 'express';

/**
 * SSE测试控制器类
 * 提供简单的SSE测试端点，用于调试前端连接问题
 */
export class SseTestController {
  private static instance: SseTestController;
  
  /**
   * 获取控制器单例
   */
  public static getInstance(): SseTestController {
    if (!SseTestController.instance) {
      SseTestController.instance = new SseTestController();
    }
    return SseTestController.instance;
  }
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    console.log('[SseTestController] 初始化完成');
  }
  
  /**
   * 纯粹的SSE测试端点
   * 简单发送事件，用于测试连接
   */
  public testSseConnection = (req: Request, res: Response): void => {
    // 非常简单的SSE实现，没有任何复杂处理
    console.log('[SseTestController] 收到SSE测试请求，设置响应头');
    
    // 设置基本SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // 发送初始连接消息
    res.write('data: {"message":"测试SSE连接成功","timestamp":"' + new Date().toISOString() + '"}\n\n');
    
    // 每3秒发送一次心跳
    const heartbeat = setInterval(() => {
      if (!res.finished) {
        res.write('data: {"message":"心跳","timestamp":"' + new Date().toISOString() + '"}\n\n');
        console.log('[SseTestController] 发送心跳消息');
      }
    }, 3000);
    
    // 处理客户端断开连接
    req.on('close', () => {
      clearInterval(heartbeat);
      console.log('[SseTestController] 客户端断开连接');
    });
  };
  
  /**
   * 注册路由
   * @param app Express应用实例
   */
  public registerRoutes(app: any): void {
    app.get('/api/test/sse', this.testSseConnection);
    console.log('[SseTestController] 已注册SSE测试路由：/api/test/sse');
  }
}

// 导出单例实例
export const sseTestController = SseTestController.getInstance();
