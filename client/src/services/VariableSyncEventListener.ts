/**
 * 变量同步事件监听器
 * 
 * 用于监听SSE事件并通知变量同步通知器
 * 这是连接服务端变量更新事件和客户端变量同步通知器的桥梁
 */

import { variableSyncNotifier } from './VariableSyncNotifier';

/**
 * SSE事件消息类型
 */
interface SseEventMessage {
  type: 'sync' | 'keepalive' | 'connected' | 'unknown';
  eventType?: string;
  variableId?: string;
  variableType?: string;
  v3Id?: string;
  timestamp?: string;
}

/**
 * 变量同步事件监听器
 * 单例类，负责监听SSE事件并通知变量同步通知器
 */
export class VariableSyncEventListener {
  private static instance: VariableSyncEventListener;
  private eventSource: EventSource | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000; // 初始重连延迟，2秒
  
  // SSE服务URL - 直接使用变量同步服务
  private SSE_URL = 'http://localhost:3001/api/variables/sync/events';
  
  /**
   * 获取单例实例
   */
  public static getInstance(): VariableSyncEventListener {
    if (!VariableSyncEventListener.instance) {
      VariableSyncEventListener.instance = new VariableSyncEventListener();
    }
    return VariableSyncEventListener.instance;
  }
  
  /**
   * 私有构造函数
   */
  private constructor() {
    // 自动连接
    this.connect();
    
    // 在窗口关闭前清理资源
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.disconnect();
      });
    }
  }
  
  /**
   * 连接到SSE服务
   */
  public connect(): void {
    // 如果已经连接，则不再重复连接
    if (this.isConnected || this.eventSource) {
      console.log('[VariableSyncEventListener] 已经连接，跳过');
      return;
    }
    
    try {
      // 添加时间戳防止缓存
      const url = `${this.SSE_URL}?t=${Date.now()}`;
      console.log(`[VariableSyncEventListener] 正在连接到变量同步服务: ${url}`);
      
      // 创建新的SSE连接
      this.eventSource = new EventSource(url);
      
      // 设置事件处理器
      this.setupEventHandlers();
      
    } catch (error) {
      console.error('[VariableSyncEventListener] 创建SSE连接失败:', error);
      this.handleConnectionError();
    }
  }
  
  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.eventSource) return;
    
    // 连接打开事件
    this.eventSource.onopen = (event) => {
      console.log('[VariableSyncEventListener] 连接到变量同步服务成功');
      this.isConnected = true;
      this.reconnectAttempts = 0; // 重置重连计数
    };
    
    // 接收消息事件
    this.eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as SseEventMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('[VariableSyncEventListener] 解析消息失败:', error, event.data);
      }
    };
    
    // 错误处理
    this.eventSource.onerror = (event) => {
      console.error('[VariableSyncEventListener] SSE连接错误:', event);
      this.handleConnectionError();
    };
  }
  
  /**
   * 处理SSE消息
   */
  private handleMessage(message: SseEventMessage): void {
    // 忽略心跳和连接消息
    if (message.type === 'keepalive' || message.type === 'connected') {
      return;
    }
    
    // 只处理变量同步事件
    if (message.type === 'sync') {
      console.log(`[VariableSyncEventListener] 收到变量更新事件: ${message.eventType}, 变量ID: ${message.variableId}`);
      
      // 只处理更新事件
      if (message.eventType === 'updated') {
        this.notifyVariableUpdate(message);
      }
    }
  }
  
  /**
   * 通知变量更新
   */
  private notifyVariableUpdate(message: SseEventMessage): void {
    // 检查是否有变量ID
    if (!message.variableId && !message.v3Id) {
      console.warn('[VariableSyncEventListener] 变量更新事件没有变量ID，跳过');
      return;
    }
    
    const timestamp = new Date().toISOString();
    console.log(`[VariableSyncEventListener] [${timestamp}] 准备通知变量同步完成:`);
    console.log(`  > 系统变量ID: "${message.variableId}"`);
    console.log(`  > V3格式ID:   "${message.v3Id}"`);
    console.log(`  > 变量类型:   "${message.variableType}"`);
    console.log(`  > 事件类型:   "${message.eventType}"`);
    
    // 如果有V3 ID，优先使用它（这是更标准的格式）
    if (message.v3Id) {
      console.log(`[VariableSyncEventListener] 使用V3格式ID通知：${message.v3Id}`);
      variableSyncNotifier.notifySyncComplete(message.v3Id);
    }
    
    // 同时也通知原始变量ID
    if (message.variableId) {
      console.log(`[VariableSyncEventListener] 使用系统变量ID通知：${message.variableId}`);
      variableSyncNotifier.notifySyncComplete(message.variableId);
    }
    
    // 记录变量同步通知状态
    const waitRecords = window.variableSyncNotifier ? 
      Array.from((window.variableSyncNotifier as any)['waitRecords'].values()) : [];
    
    console.log(`[VariableSyncEventListener] 发送通知后，变量同步通知器中还有 ${waitRecords.length} 条等待记录`);
    if (waitRecords.length > 0) {
      console.log(`[VariableSyncEventListener] 剩余等待变量ID列表: ${waitRecords.map((r: any) => `"${r.variableId}"`).join(', ')}`);
    }
  }
  
  /**
   * 处理连接错误
   */
  private handleConnectionError(): void {
    // 标记为未连接
    this.isConnected = false;
    
    // 清理现有连接
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // 尝试重连，但有最大次数限制
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      // 使用指数退避策略增加延迟
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      console.log(`[VariableSyncEventListener] 将在 ${delay}ms 后尝试第 ${this.reconnectAttempts} 次重连`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error(`[VariableSyncEventListener] 达到最大重连次数 (${this.maxReconnectAttempts})，停止重连`);
    }
  }
  
  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.eventSource) {
      console.log('[VariableSyncEventListener] 断开SSE连接');
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }
  
  /**
   * 获取连接状态
   */
  public isConnectedToServer(): boolean {
    return this.isConnected;
  }
}

// 创建全局单例
const variableSyncEventListener = VariableSyncEventListener.getInstance();

// 确保全局变量同步事件监听器存在
export function ensureGlobalVariableSyncEventListenerExists(): void {
  if (typeof window !== 'undefined' && !window.variableSyncEventListener) {
    window.variableSyncEventListener = variableSyncEventListener;
    console.log('[VariableSyncEventListener] 全局变量同步事件监听器已初始化');
  }
}

// 声明全局变量
declare global {
  interface Window {
    variableSyncEventListener?: VariableSyncEventListener;
  }
}

// 导出单例实例
export { variableSyncEventListener };
