/**
 * 变量同步通知器
 * 用于在变量同步完成后发送通知，使工作流能够等待变量同步完成后再继续执行
 */

import { v4 as uuidv4 } from 'uuid';

// 回调函数类型
export type SyncCompletionCallback = () => void;

// 变量标识符类型（用于判断哪个变量已同步）
export type VariableIdentifier = string;

// 等待回调记录类型
interface WaitRecord {
  id: string;
  variableId: VariableIdentifier;
  callback: SyncCompletionCallback;
  timeoutId?: number; // 超时计时器ID
  timestamp: number; // 注册时间戳
}

/**
 * 变量同步通知器
 * 用于在变量同步完成后发送通知，支持等待特定变量同步完成
 */
export class VariableSyncNotifier {
  private static instance: VariableSyncNotifier;
  private waitRecords: Map<string, WaitRecord> = new Map();
  
  // 默认超时时间（毫秒）
  private defaultTimeout = 120000; // 2分钟
  
  /**
   * 获取单例实例
   */
  public static getInstance(): VariableSyncNotifier {
    if (!VariableSyncNotifier.instance) {
      VariableSyncNotifier.instance = new VariableSyncNotifier();
    }
    return VariableSyncNotifier.instance;
  }
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {
    console.log('[VariableSyncNotifier] 初始化变量同步通知器');
  }
  
  /**
   * 等待变量同步完成
   * @param variableId 变量标识符（例如：task_123_output）
   * @param callback 同步完成后的回调函数
   * @param timeout 可选的超时时间（毫秒），默认10秒
   * @returns 等待记录ID，可用于取消等待
   */
  public waitForSync(
    variableId: VariableIdentifier,
    callback: SyncCompletionCallback,
    timeout?: number
  ): string {
    // 生成唯一等待记录ID
    const waitId = uuidv4();
    const actualTimeout = timeout || this.defaultTimeout;
    
    console.log(`[VariableSyncNotifier] 注册等待变量同步: ${variableId}, 超时: ${actualTimeout}ms`);
    console.log(`[VariableSyncNotifier] 当前所有等待记录: ${Array.from(this.waitRecords.values()).map(r => r.variableId).join(', ')}`);
    
    // 创建超时处理器
    const timeoutId = window.setTimeout(() => {
      console.warn(`[VariableSyncNotifier] 等待变量同步超时: ${variableId}`);
      this.handleTimeout(waitId);
    }, actualTimeout);
    
    // 创建等待记录
    const record: WaitRecord = {
      id: waitId,
      variableId,
      callback,
      timeoutId,
      timestamp: Date.now()
    };
    
    // 存储等待记录
    this.waitRecords.set(waitId, record);
    
    return waitId;
  }
  
  /**
   * 取消等待变量同步
   * @param waitId 等待记录ID
   * @returns 是否成功取消
   */
  public cancelWait(waitId: string): boolean {
    const record = this.waitRecords.get(waitId);
    if (!record) {
      return false;
    }
    
    // 清除超时计时器
    if (record.timeoutId) {
      window.clearTimeout(record.timeoutId);
    }
    
    // 移除等待记录
    this.waitRecords.delete(waitId);
    
    console.log(`[VariableSyncNotifier] 取消等待变量同步: ${record.variableId}`);
    return true;
  }
  
  /**
   * 通知变量同步完成
   * @param variableId 变量标识符
   */
  public notifySyncComplete(variableId: VariableIdentifier): void {
    console.log(`[VariableSyncNotifier] 收到变量同步完成通知: ${variableId}`);
    
    // 找到所有等待该变量的记录
    const matchingRecords = Array.from(this.waitRecords.values())
      .filter(record => this.matchVariableId(record.variableId, variableId));
    
    console.log(`[VariableSyncNotifier] 找到${matchingRecords.length}个匹配的等待记录`);
    
    // 对每个匹配的记录执行回调
    matchingRecords.forEach(record => {
      // 清除超时计时器
      if (record.timeoutId) {
        window.clearTimeout(record.timeoutId);
      }
      
      // 移除等待记录
      this.waitRecords.delete(record.id);
      
      // 调用回调函数
      try {
        console.log(`[VariableSyncNotifier] 执行变量同步完成回调: ${record.variableId}`);
        record.callback();
      } catch (error) {
        console.error(`[VariableSyncNotifier] 执行回调出错:`, error);
      }
    });
  }
  
  /**
   * 处理超时
   * @param waitId 等待记录ID
   */
  private handleTimeout(waitId: string): void {
    const record = this.waitRecords.get(waitId);
    if (!record) {
      return;
    }
    
    // 标记记录已超时，但不删除记录
    // 这样后续的变量更新仍然可以匹配到此记录
    record.timeoutId = undefined; // 清除超时计时器ID，表示已超时
    
    // 计算等待时长
    const waitTime = Date.now() - record.timestamp;
    
    console.warn(`[VariableSyncNotifier] 变量同步等待超时，但继续保留记录: ${record.variableId}, 等待时长: ${waitTime}ms`);
    console.warn(`[VariableSyncNotifier] 如果后续收到此变量的更新，仍将执行回调`);
    
    // 注意：我们不调用回调函数，而是等待实际的变量同步通知
    // 在超时后，让用户手动完成节点而不是自动完成
  }
  
  /**
   * 检查变量ID是否匹配
   * 支持多种格式:
   * 1. 完全匹配
   * 2. 标准变量ID (@gv_type_id_field-=) 与格式化ID (type_id_field) 的匹配
   */
  private matchVariableId(pattern: string, targetId: string): boolean {
    // 添加额外日志用于调试 - 使用引号包裹ID，确保能看到前后空格等隐藏字符
    console.log(`[VariableSyncNotifier] 匹配变量ID:
    > 等待ID(pattern) = "${pattern}"
    > 通知ID(target)  = "${targetId}"`);
    
    // 完全匹配
    if (pattern === targetId) {
      console.log(`[VariableSyncNotifier] ✅ 完全匹配成功`);
      return true;
    }
    
    // 尝试将任何一种格式转换为另一种格式进行匹配
    const patternNormalized = this.normalizeVariableId(pattern);
    const targetNormalized = this.normalizeVariableId(targetId);
    
    const matched = patternNormalized === targetNormalized;
    console.log(`[VariableSyncNotifier] 标准化匹配: 
    > 标准化等待ID = "${patternNormalized}" 
    > 标准化通知ID = "${targetNormalized}"
    > 匹配结果: ${matched ? '✅ 成功' : '❌ 失败'}`);
    
    // 尝试额外的宽松匹配方式
    if (!matched) {
      // 提取ID部分进行匹配
      const patternIdPart = this.extractEntityId(pattern);
      const targetIdPart = this.extractEntityId(targetId);
      
      const idMatched = patternIdPart && targetIdPart && patternIdPart === targetIdPart;
      console.log(`[VariableSyncNotifier] 实体ID部分匹配: 
      > 等待ID的实体部分 = "${patternIdPart}" 
      > 通知ID的实体部分 = "${targetIdPart}"
      > 匹配结果: ${idMatched ? '✅ 成功' : '❌ 失败'}`);
      
      if (idMatched) {
        return true;
      }
    }
    
    return matched;
  }
  
  /**
   * 标准化变量ID为V3格式 (type_id_field)
   */
  private normalizeVariableId(id: string): string {
    // 如果是@gv_格式，转换为V3格式
    if (id.startsWith('@gv_') && id.endsWith('-=')) {
      // 从 @gv_task_123_output-= 提取为 task_123_output
      return id.substring(4, id.length - 2);
    }
    return id;
  }
  
  
  /**
   * 从变量ID中提取实体ID部分
   * 例如从 task_c05d073b-081e-4337-a249-fe13e03ca7d4_output 中提取 c05d073b-081e-4337-a249-fe13e03ca7d4
   * 或从 @gv_task_c05d073b-081e-4337-a249-fe13e03ca7d4_output-= 中提取 c05d073b-081e-4337-a249-fe13e03ca7d4
   */
  private extractEntityId(id: string): string | null {
    // 处理V3格式
    const v3Match = id.match(/^(?:@gv_)?([a-z]+)_([a-f0-9-]+)_([a-z]+)(?:-=)?$/i);
    if (v3Match && v3Match[2]) {
      return v3Match[2];
    }
    return null;
  }
}

// 确保全局变量同步通知器存在
export function ensureGlobalVariableSyncNotifierExists(): void {
  if (typeof window !== 'undefined' && !window.variableSyncNotifier) {
    // 在全局范围创建变量同步通知器
    window.variableSyncNotifier = VariableSyncNotifier.getInstance();
    console.log('[VariableSyncNotifier] 全局变量同步通知器已初始化');
  }
}

// 声明全局变量同步通知器类型
declare global {
  interface Window {
    variableSyncNotifier?: VariableSyncNotifier;
  }
}

// 导出单例实例
export const variableSyncNotifier = VariableSyncNotifier.getInstance();
