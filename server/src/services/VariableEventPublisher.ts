/**
 * 变量事件类型枚举
 */
export enum VariableEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  INVALIDATED = 'invalidated', // 变量被标记为无效（软删除）
  SOURCE_RENAMED = 'source_renamed' // 处理源对象重命名引起的标识符变化
}

/**
 * 事件处理器类型
 */
type EventHandler = (payload: any) => void;

/**
 * 变量事件发布器
 * 用于实现变量相关的发布-订阅模式
 */
export class VariableEventPublisher {
  private static instance: VariableEventPublisher;
  private handlers: Map<VariableEventType, EventHandler[]> = new Map();
  
  /**
   * 获取单例实例
   */
  public static getInstance(): VariableEventPublisher {
    if (!VariableEventPublisher.instance) {
      VariableEventPublisher.instance = new VariableEventPublisher();
    }
    return VariableEventPublisher.instance;
  }
  
  /**
   * 发布变量事件
   * @param eventType 事件类型
   * @param payload 事件负载
   */
  public publish(eventType: VariableEventType, payload: any): void {
    const eventHandlers = this.handlers.get(eventType) || [];
    
    // 异步执行所有处理器，避免阻塞
    setTimeout(() => {
      for (const handler of eventHandlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in variable event handler for ${eventType}:`, error);
        }
      }
    }, 0);
    
    console.log(`Published ${eventType} event:`, 
      payload && payload.id ? `ID: ${payload.id}` : 'No ID');
  }
  
  /**
   * 订阅变量事件
   * @param eventType 事件类型
   * @param handler 处理函数
   * @returns 用于取消订阅的函数
   */
  public subscribe(eventType: VariableEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    
    const handlers = this.handlers.get(eventType)!;
    handlers.push(handler);
    
    // 返回取消订阅函数
    return () => {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }
  
  /**
   * 批量订阅多个事件
   * @param events 事件类型和处理器的映射
   * @returns 用于取消所有订阅的函数
   */
  public subscribeToMany(events: Record<VariableEventType, EventHandler>): () => void {
    const unsubscribeFunctions: Array<() => void> = [];
    
    for (const [eventType, handler] of Object.entries(events)) {
      unsubscribeFunctions.push(
        this.subscribe(eventType as VariableEventType, handler)
      );
    }
    
    // 返回取消所有订阅的函数
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }
}
