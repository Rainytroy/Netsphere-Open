/**
 * 变量事件服务
 * 提供变量变更的发布/订阅机制，确保系统中的组件能即时响应变量变更
 */
export class VariableEventService {
  // 存储所有注册的监听器
  private static listeners: Set<() => void> = new Set();
  
  /**
   * 注册变量变更监听器
   * @param listener 变更事件回调函数
   * @returns 取消订阅的函数
   */
  static subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener); // 返回取消订阅函数
  }
  
  /**
   * 移除变量变更监听器
   * @param listener 要移除的监听器
   */
  static unsubscribe(listener: () => void) {
    this.listeners.delete(listener);
  }
  
  /**
   * 发布变量变更事件
   * 当变量发生创建、更新或删除时调用此方法
   */
  static notifyVariableChange() {
    console.log('[VariableEventService] 变量变更，通知所有监听器');
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[VariableEventService] 监听器执行错误:', error);
      }
    });
  }
  
  /**
   * 当前监听器数量
   * 用于调试和监控
   */
  static get listenerCount() {
    return this.listeners.size;
  }
}

export default VariableEventService;
