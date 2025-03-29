import { TestExecuteDebugInfo, ExecutionStatus } from './workTaskService';

// 存储的结果接口（保留接口定义，但不再使用）
export interface StoredTaskOutput {
  taskId: string;
  output: string;
  executionTime: string;
  executionStatus: string;
  debugInfo?: TestExecuteDebugInfo | null;
  timestamp: number;
}

/**
 * 输出持久化服务（已禁用）
 * 
 * 注意：此服务的所有功能已被禁用，作为修复输出面板显示问题的一部分。
 * 所有方法仍保留相同的签名以保持API兼容性，但不再执行实际的存储操作。
 */
const outputPersistenceService = {
  /**
   * 保存任务输出（已禁用）
   */
  saveTaskOutput(
    taskId: string, 
    output: string, 
    executionStatus: string, 
    executionTime: string, 
    debugInfo?: TestExecuteDebugInfo | null
  ): void {
    console.log(`[已禁用] 输出持久化功能已禁用，不再保存任务[${taskId}]的输出结果`);
  },

  /**
   * 获取任务输出（已禁用）
   * 始终返回null，表示没有持久化数据
   */
  getTaskOutput(taskId: string): StoredTaskOutput | null {
    console.log(`[已禁用] 输出持久化功能已禁用，任务[${taskId}]无持久化输出结果`);
    return null;
  },

  /**
   * 清除任务输出（已禁用）
   */
  clearTaskOutput(taskId: string): void {
    console.log(`[已禁用] 输出持久化功能已禁用，无需清除任务[${taskId}]的输出结果`);
  },

  /**
   * 清除所有任务输出（已禁用）
   */
  clearAllTaskOutputs(): void {
    console.log('[已禁用] 输出持久化功能已禁用，无需清除任务输出');
  },
  
  /**
   * 检查任务是否有持久化的输出（已禁用）
   * 始终返回false，表示没有持久化数据
   */
  hasTaskOutput(taskId: string): boolean {
    return false;
  }
};

export default outputPersistenceService;
