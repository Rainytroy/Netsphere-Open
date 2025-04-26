/**
 * SSE客户端管理器
 * 用于跟踪所有活跃的SSE连接并向它们广播事件
 */

import { Response } from 'express';
import { Variable } from '../models/Variable';
import { VariableEventType } from './VariableEventPublisher';

/**
 * SSE客户端类型
 */
interface SseClient {
  id: string;                    // 客户端唯一标识
  res: Response;                 // 响应对象，用于发送数据
  connectedAt: Date;             // 连接时间
  lastActivityAt: Date;          // 最后活动时间
  isActive: boolean;             // 连接是否活跃
}

/**
 * SSE客户端管理器类
 * 管理所有连接的SSE客户端
 */
export class SseClientManager {
  private static instance: SseClientManager;
  private clients: Map<string, SseClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  /**
   * 获取单例实例
   */
  public static getInstance(): SseClientManager {
    if (!SseClientManager.instance) {
      SseClientManager.instance = new SseClientManager();
    }
    return SseClientManager.instance;
  }
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    // 设置定期清理的定时器
    setInterval(() => this.cleanupInactiveClients(), 60000); // 每分钟清理一次
    
    // 设置定期心跳
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 15000); // 每15秒发送一次全局心跳
    
    console.log('[SseClientManager] 初始化完成，已启动心跳定时器');
  }
  
  /**
   * 添加新的客户端
   * @param res 响应对象
   * @returns 客户端ID
   */
  public addClient(res: Response): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date();
    
    this.clients.set(clientId, {
      id: clientId,
      res,
      connectedAt: now,
      lastActivityAt: now,
      isActive: true
    });
    
    console.log(`[SseClientManager] 新客户端连接 (ID: ${clientId})，当前连接数: ${this.clients.size}`);
    return clientId;
  }
  
  /**
   * 移除客户端
   * @param clientId 客户端ID
   */
  public removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      this.clients.delete(clientId);
      console.log(`[SseClientManager] 客户端断开连接 (ID: ${clientId})，当前连接数: ${this.clients.size}`);
    }
  }
  
  /**
   * 从系统标识符中提取字段名
   * 格式：@gv_{type}_{entityId}_{field}-=
   * @param identifier 系统标识符
   * @returns 提取的字段名，如果无法解析则返回'output'
   */
  private extractFieldFromIdentifier(identifier: string): string {
    // 检查是否是V3.0格式的标识符
    if (identifier.startsWith('@gv_') && identifier.endsWith('-=')) {
      // 移除前缀和后缀
      const core = identifier.substring(4, identifier.length - 2);
      
      // 使用最后一个下划线分隔
      const parts = core.split('_');
      if (parts.length >= 3) {
        // 返回最后一部分作为字段名
        return parts[parts.length - 1];
      }
      
      console.warn(`[SseClientManager] 无法从标识符提取字段名: ${identifier}`);
    }
    
    // 对于task类型，默认返回'output'，这是工作流中最常见的情况
    return 'output';
  }

  /**
   * 向所有客户端广播变量事件
   * @param variable 变量对象
   * @param eventType 事件类型
   */
  public broadcastVariableEvent(variable: Variable, eventType: VariableEventType): void {
    const activeClients = this.getActiveClientsCount();
    if (activeClients === 0) {
      console.log('[SseClientManager] 没有活跃客户端，跳过广播变量事件');
      return;
    }
    
    console.log(`[SseClientManager] 广播变量事件 ${eventType} 到 ${activeClients} 个客户端 - 变量: ${variable.identifier}`);
    
    // 构建V3.0格式变量ID
    let v3Id = '';
    if (variable.source && variable.source.id && variable.source.type) {
      // 修正源类型
      const sourceType = variable.source.type.replace('work_', '');
      
      // 从标识符中提取字段名
      const field = this.extractFieldFromIdentifier(variable.identifier);
      
      // 构建标准格式的V3 ID
      v3Id = `${sourceType}_${variable.source.id}_${field}`;
      
      console.log(`[SseClientManager] 生成V3 ID: ${v3Id} (源类型=${sourceType}, 源ID=${variable.source.id}, 字段=${field})`);
    }
    
    // 构建事件消息
    const message = JSON.stringify({
      type: 'sync',
      eventType: eventType,
      variableId: variable.identifier,
      variableType: variable.type,
      v3Id,
      timestamp: new Date().toISOString()
    });
    
    // 向所有活跃客户端发送消息
    let successCount = 0;
    for (const client of this.clients.values()) {
      if (client.isActive) {
        try {
          client.res.write(`data: ${message}\n\n`);
          client.lastActivityAt = new Date(); // 更新活动时间
          successCount++;
        } catch (error) {
          console.error(`[SseClientManager] 向客户端 ${client.id} 发送消息失败:`, error);
          client.isActive = false; // 标记为非活跃，将在下次清理中移除
        }
      }
    }
    
    console.log(`[SseClientManager] 成功发送变量事件到 ${successCount}/${activeClients} 个活跃客户端`);
  }
  
  /**
   * 向所有客户端发送心跳
   */
  public sendHeartbeat(): void {
    const activeClients = this.getActiveClientsCount();
    if (activeClients === 0) {
      return; // 没有客户端，不需要发送心跳
    }
    
    const now = new Date();
    const message = JSON.stringify({
      type: 'keepalive',
      timestamp: now.toISOString(),
      activeClients: activeClients
    });
    
    let successCount = 0;
    for (const client of this.clients.values()) {
      if (client.isActive) {
        try {
          client.res.write(`data: ${message}\n\n`);
          client.lastActivityAt = now;
          successCount++;
        } catch (error) {
          console.error(`[SseClientManager] 向客户端 ${client.id} 发送心跳失败:`, error);
          client.isActive = false;
        }
      }
    }
    
    console.log(`[SseClientManager] 发送心跳到 ${successCount}/${activeClients} 个客户端`);
  }
  
  /**
   * 获取活跃客户端数量
   */
  public getActiveClientsCount(): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.isActive) {
        count++;
      }
    }
    return count;
  }
  
  /**
   * 清理非活跃客户端
   */
  private cleanupInactiveClients(): void {
    const initialCount = this.clients.size;
    if (initialCount === 0) {
      return; // 没有客户端，不需要清理
    }
    
    const now = new Date();
    const inactiveThreshold = 3 * 60 * 1000; // 3分钟
    
    // 找出需要清理的客户端
    const clientsToRemove: string[] = [];
    for (const [clientId, client] of this.clients.entries()) {
      const inactiveDuration = now.getTime() - client.lastActivityAt.getTime();
      if (!client.isActive || inactiveDuration > inactiveThreshold) {
        clientsToRemove.push(clientId);
      }
    }
    
    // 清理非活跃客户端
    for (const clientId of clientsToRemove) {
      this.clients.delete(clientId);
    }
    
    // 如果有清理，则记录日志
    if (clientsToRemove.length > 0) {
      console.log(`[SseClientManager] 清理了 ${clientsToRemove.length} 个非活跃客户端，当前连接数: ${this.clients.size}`);
    }
  }
  
  /**
   * 清理资源，在进程退出前调用
   */
  public cleanup(): void {
    // 清除心跳定时器
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // 关闭所有客户端连接
    for (const client of this.clients.values()) {
      try {
        client.res.end();
      } catch (error) {
        console.error(`[SseClientManager] 关闭客户端 ${client.id} 连接失败:`, error);
      }
    }
    
    // 清空客户端列表
    this.clients.clear();
    console.log('[SseClientManager] 已清理所有资源');
  }
}

// 导出单例实例
export const sseClientManager = SseClientManager.getInstance();
