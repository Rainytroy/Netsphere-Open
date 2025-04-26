/**
 * 变量同步通知控制器
 * 提供HTTP端点，允许客户端获取变量同步状态通知
 */

import { Request, Response } from 'express';
import { Variable } from '../models/Variable';
import { VariableEventPublisher, VariableEventType } from '../services/VariableEventPublisher';
import { sseClientManager } from '../services/SseClientManager';

/**
 * 变量同步通知控制器类
 * 用于向客户端提供变量同步状态的通知
 */
export class VariableSyncNotificationController {
  private static instance: VariableSyncNotificationController;
  private eventPublisher: VariableEventPublisher;
  private eventListeners: Map<string, ((variable: Variable) => void)[]> = new Map();
  
  /**
   * 获取控制器单例
   */
  public static getInstance(): VariableSyncNotificationController {
    if (!VariableSyncNotificationController.instance) {
      VariableSyncNotificationController.instance = new VariableSyncNotificationController();
    }
    return VariableSyncNotificationController.instance;
  }
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    this.eventPublisher = VariableEventPublisher.getInstance();
    this.registerEventHandler();
    console.log('[VariableSyncNotificationController] 初始化完成');
  }
  
  /**
   * 注册事件处理器，监听变量事件
   */
  private unsubscribeFunctions: Array<() => void> = [];
  
  private registerEventHandler(): void {
    // 使用单参数处理器并保存取消订阅函数
    const createdHandler = (variable: Variable) => this.handleVariableEvent(variable, VariableEventType.CREATED);
    const updatedHandler = (variable: Variable) => this.handleVariableEvent(variable, VariableEventType.UPDATED);
    const deletedHandler = (variable: Variable) => this.handleVariableEvent(variable, VariableEventType.DELETED);
    
    this.unsubscribeFunctions.push(
      this.eventPublisher.subscribe(VariableEventType.CREATED, createdHandler),
      this.eventPublisher.subscribe(VariableEventType.UPDATED, updatedHandler),
      this.eventPublisher.subscribe(VariableEventType.DELETED, deletedHandler)
    );
    
    console.log('[VariableSyncNotificationController] 已注册变量事件处理器');
  }
  
  /**
   * 清理事件处理器
   */
  public cleanup(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    console.log('[VariableSyncNotificationController] 已清理所有事件处理器');
  }
  
  /**
   * 处理变量事件
   * @param variable 变量对象
   * @param eventType 事件类型
   */
  private handleVariableEvent(variable: Variable, eventType: VariableEventType): void {
    console.log(`[VariableSyncNotificationController] 收到${eventType}事件: ${variable.identifier}, 类型: ${variable.type}`);
    
    // 通知所有等待此变量同步的客户端，不再过滤变量类型
    this.notifyVariableSynced(variable, eventType);
  }
  
  /**
   * 通知客户端变量已同步
   * @param variable 变量对象
   * @param eventType 事件类型
   */
  private notifyVariableSynced(variable: Variable, eventType: VariableEventType): void {
    console.log(`[VariableSyncNotificationController] 通知变量同步完成 - 类型: ${variable.type}, 标识符: ${variable.identifier}`);
    
    // 使用SseClientManager广播变量事件到所有连接的客户端
    sseClientManager.broadcastVariableEvent(variable, eventType);
  }
  
  /**
   * 检查变量同步状态API
   * 允许客户端查询变量是否已同步
   */
  public checkVariableSyncStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { variableId } = req.params;
      
      if (!variableId) {
        res.status(400).json({ success: false, message: '缺少变量ID' });
        return;
      }
      
      console.log(`[VariableSyncNotificationController] 收到同步状态查询: ${variableId}`);
      
      // 这里我们直接返回成功状态，因为如果变量存在，它一定是已同步的
      // 在实际实现中，可能需要查询数据库确认变量最新状态
      res.status(200).json({
        success: true,
        synced: true,
        variableId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[VariableSyncNotificationController] 检查变量同步状态出错:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * 发送变量同步完成的SSE事件
   * 使用Server-Sent Events (SSE) 向客户端推送变量同步状态
   */
  public subscribeToVariableSyncEvents = async (req: Request, res: Response): Promise<void> => {
    try {
      // 使用SseClientManager管理SSE连接
      const clientId = sseClientManager.addClient(res);
      
      // 发送初始连接成功消息 - 不要再次设置响应头
      const connectMessage = JSON.stringify({ 
        type: 'connected', 
        message: '已连接到变量同步通知服务',
        clientId,
        activeClients: sseClientManager.getActiveClientsCount(),
        timestamp: new Date().toISOString()
      });

      // 仅发送数据，不再设置头部
      if (res.writable) {
        res.write(`data: ${connectMessage}\n\n`);
      }
      
      // 保持连接活跃 - 心跳由SseClientManager统一管理
      const keepAlive = setInterval(() => {
        // 发送一个专门给这个客户端的心跳
        if (res.writable) {
          res.write(`data: ${JSON.stringify({ 
            type: 'keepalive', 
            clientId,
            timestamp: new Date().toISOString() 
          })}\n\n`);
        }
      }, 30000); // 每30秒发送一次心跳
      
      // 监听客户端断开连接
      req.on('close', () => {
        clearInterval(keepAlive);
        sseClientManager.removeClient(clientId);
        console.log(`[VariableSyncNotificationController] 客户端断开SSE连接 (ID: ${clientId})`);
      });
    } catch (error) {
      console.error('[VariableSyncNotificationController] SSE处理出错:', error);
      // 只有在响应头还没发送时才设置状态
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        // 否则只是结束响应
        res.end();
      }
    }
  };
  
  /**
   * 注册路由
   * @param app Express应用实例
   */
  public registerRoutes(app: any): void {
    // 订阅变量同步事件 - 需要放在带参数路由之前，避免被误匹配
    // 直接处理SSE请求，不依赖中间件
    app.get('/api/variables/sync/events', (req: Request, res: Response) => {
      // 强制设置SSE所需的响应头
      // 清除任何现有的头部，避免冲突
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Encoding');
      res.removeHeader('Content-Length');
      
      // 明确设置状态码和SSE所需的响应头
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
      res.setHeader('Access-Control-Allow-Origin', '*'); // 允许跨域访问
      
      // 立即刷新头部，确保先发送
      res.flushHeaders();
      
      console.log('[VariableSyncNotificationController] SSE连接已建立，Content-Type:', res.getHeader('Content-Type'));
      
      // 调用控制器方法处理事件流
      this.subscribeToVariableSyncEvents(req, res);
    });
    
    // 检查变量同步状态
    app.get('/api/variables/sync/:variableId', this.checkVariableSyncStatus);
    
    console.log('[VariableSyncNotificationController] 已注册路由');
  }
}

// 导出控制器单例
export const variableSyncNotificationController = VariableSyncNotificationController.getInstance();
