/**
 * 工作任务节点处理器
 * 用于处理工作任务的执行
 */

import { ExecutionNode, WorkTaskNodeOutput } from '../../types';
import { BaseNodeHandler, NodeExecutionContext } from './BaseNode';
import { parseRawText } from '../utils/VariableParser';
import workTaskService from '../../../../services/workTaskService';
import { VariableSyncNotifier, ensureGlobalVariableSyncNotifierExists } from '../../../../services/VariableSyncNotifier';

// 执行时间戳接口 
interface ExecutionTimestamps {
  startTime?: number;           // 开始执行时间
  apiCallStartTime?: number;    // API调用开始时间
  apiCallEndTime?: number;      // API调用完成时间
  renderCompleteTime?: number;  // 渲染完成时间
  statusCompleteTime?: number;  // 状态变为completed的时间
  nextNodeTime?: number;        // 通知下一节点时间
}

// 同步信息接口
interface SyncInfo {
  syncStartTime: string;       // 同步开始时间
  completionTime: string;      // 完成时间
  syncWaitTime: string;        // 同步等待时间
}

// 扩展WorkTaskNodeOutput类型以包含时间戳和同步信息
interface ExtendedWorkTaskNodeOutput extends WorkTaskNodeOutput {
  timestamps?: ExecutionTimestamps; 
  syncInfo?: SyncInfo;         // 变量同步信息
  syncStartTime?: string;      // 同步开始时间戳（字符串格式）
}

// 扩展ExecutionData接口，添加手动完成所需的属性
interface ExtendedExecutionData {
  variables: Record<string, any>;  // 基本变量集合
  finalOutput?: ExtendedWorkTaskNodeOutput;  // 保存最终输出，用于手动完成
  syncStartTime?: number;         // 变量同步开始时间
  startTime?: number;             // 兼容原有的属性
}

// 添加至全局命名空间，支持手动完成
declare global {
  interface Window {
    // 添加手动完成函数
    manualCompleteWorkTaskNode?: (nodeId: string) => void;
  }
}

// 声明全局workflowEngine类型和任务完成通知器
declare global {
  interface Window {
    workflowEngine?: {
      updateNode: (nodeId: string, updates: Partial<ExecutionNode>) => void;
      getNode?: (nodeId: string) => ExecutionNode | undefined;
      getVariables?: () => Record<string, any>;
    };
    // 新增全局任务完成通知器，用于节点间通信
    workTaskCompletionNotifier?: {
      // 回调函数映射 nodeId -> callback
      callbacks?: Map<string, () => void>;
      // 注册一个任务完成的回调
      registerTaskCompletion: (nodeId: string, callback: () => void) => void;
      // 触发任务完成通知
      notifyTaskCompletion: (nodeId: string) => void;
    };
    // 变量同步通知器
    variableSyncNotifier?: VariableSyncNotifier;
  }
}

// 确保全局通知器存在
function ensureGlobalNotifierExists() {
  if (typeof window !== 'undefined' && !window.workTaskCompletionNotifier) {
    const callbacks: Record<string, Array<() => void>> = {};
    
    window.workTaskCompletionNotifier = {
      registerTaskCompletion: (nodeId: string, callback: () => void) => {
        if (!callbacks[nodeId]) {
          callbacks[nodeId] = [];
        }
        callbacks[nodeId].push(callback);
        console.log(`[WorkTaskCompletionNotifier] 已注册节点完成回调: ${nodeId}`);
      },
      
      notifyTaskCompletion: (nodeId: string) => {
        console.log(`[WorkTaskCompletionNotifier] 收到节点完成通知: ${nodeId}`);
        if (callbacks[nodeId] && callbacks[nodeId].length > 0) {
          // 使用所有注册的回调
          callbacks[nodeId].forEach(callback => {
            try {
              callback();
            } catch (err) {
              console.error(`[WorkTaskCompletionNotifier] 执行回调出错:`, err);
            }
          });
          // 清除回调，防止多次触发
          delete callbacks[nodeId];
        }
      }
    };
  }
}

export class WorkTaskNodeHandler extends BaseNodeHandler {
  /**
   * 执行工作任务节点
   * @param node 节点数据
   * @param context 执行上下文
   */
  async execute(node: ExecutionNode, context: NodeExecutionContext): Promise<void> {
    try {
      // 确保全局通知器已初始化
      ensureGlobalNotifierExists();
      
      this.markExecuting(node, context);
      
      // 获取任务配置，同时支持新旧两种ID命名
      const { workTaskId, taskId, taskName, npc, taskTitle, taskDescription } = node.config || {};
      
      // 优先使用workTaskId，其次使用taskId
      const effectiveTaskId = workTaskId || taskId;
      
      if (!effectiveTaskId) {
        console.warn('[WorkTaskNode] 工作任务节点没有指定任务ID (无workTaskId或taskId):', node.id);
        this.markError(node, context, new Error('工作任务节点没有指定任务ID'));
        return;
      }
      
      // 解析任务标题和描述中的变量 (V3.0格式)
      const parsedTitle = parseRawText(taskTitle || taskName || '', context.variables);
      const parsedDescription = parseRawText(taskDescription || '', context.variables);
      
      console.log(`[WorkTaskNode] 解析后标题: ${parsedTitle}`);
      console.log(`[WorkTaskNode] 解析后描述: ${parsedDescription.substring(0, 100)}${parsedDescription.length > 100 ? '...' : ''}`);
      
      // 创建任务输出
      const output: WorkTaskNodeOutput = {
        // 同时保存两种ID格式，确保前后兼容
        taskId: effectiveTaskId,
        workTaskId: effectiveTaskId,
        taskName: parsedTitle,
        npc,
        status: {
          progress: 0,
          state: 'running'
        }
      };
      
      console.log(`[WorkTaskNode] 开始执行任务: ${parsedTitle}, ID: ${effectiveTaskId}`);
      
      // 更新节点输出
      context.updateNode(node.id, { output });
      
      try {
        // 实际调用API执行任务
        const updatedTask = await workTaskService.executeWorkTask(effectiveTaskId);
        
        if (updatedTask) {
          // 获取任务输出
          const taskOutput = updatedTask.output || '';
          
          // 更新节点输出，设置为API调用已完成但结果尚未完全渲染状态
          context.updateNode(node.id, {
            output: {
              ...output,
              status: {
                progress: 70, // 设置为70%，表示API调用已完成但结果尚未完全渲染
                state: 'running'
              },
              result: taskOutput // 保存API返回的结果
            }
          });
          
          console.log(`[WorkTaskNode] API调用完成: ${parsedTitle}, ID: ${effectiveTaskId}`);
          
            // 创建等待时间，确保渲染完成
            const waitForRender = async () => {
              return new Promise<void>(resolve => {
                // 给渲染留出足够时间 (一般来说300ms应该足够了)
                setTimeout(() => {
                  console.log(`[WorkTaskNode] 等待300ms，确保渲染完成后再更新状态`);
                  resolve();
                }, 300);
              });
            };
            
            // 等待渲染完成
            await waitForRender();
            
            // 获取节点当前状态，提取其中的时间戳
            let timestamps: ExecutionTimestamps = {};
            if (window.workflowEngine?.getNode) {
              const currentNode = window.workflowEngine.getNode(node.id);
              if (currentNode?.output) {
                timestamps = (currentNode.output as ExtendedWorkTaskNodeOutput).timestamps || {};
              }
            }
            
            // 记录状态完成时间
            const statusCompleteTime = Date.now();
            timestamps.statusCompleteTime = statusCompleteTime;
            console.log(`[WorkTaskNode] 状态变为completed时间: ${new Date(statusCompleteTime).toISOString()}`);
            
            // 确保最终状态被设置为完成
            const finalOutput: ExtendedWorkTaskNodeOutput = {
              ...output,
              status: {
                progress: 100,
                state: 'completed'
              },
              result: taskOutput,
              timestamps: timestamps
            };
            
            // 等待变量同步完成后再继续执行下一个节点
            this.waitForVariableSync(node, context, effectiveTaskId, finalOutput);
        } else {
          throw new Error('未返回有效的工作任务数据');
        }
      } catch (apiError) {
        console.error('[WorkTaskNode] API调用错误:', apiError);
        
        // 更新节点输出为错误状态
        context.updateNode(node.id, {
          output: {
            ...output,
            status: {
              progress: 0,
              state: 'error'
            }
          }
        });
        
        this.markError(node, context, apiError instanceof Error ? apiError : new Error(String(apiError)));
      }
    } catch (error) {
      console.error('[WorkTaskNode] 执行错误:', error);
      this.markError(node, context, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 等待变量同步完成后再继续执行下一个节点
   * @param node 当前节点
   * @param context 执行上下文
   * @param taskId 任务ID
   * @param finalOutput 最终输出
   */
  /**
   * 生成标准的V3变量ID
   * 符合数据库格式: type_entityId_field
   * @param type 变量类型 (如'task', 'workflow')
   * @param entityId 实体ID
   * @param field 字段名
   * @returns 格式化的V3变量ID
   */
  generateV3VariableId(type: string, entityId: string, field: string): string {
    return `${type.toLowerCase()}_${entityId}_${field}`;
  }

  /**
   * 等待变量同步完成
   * 使用标准V3 ID等待变量同步事件
   */
  waitForVariableSync(
    node: ExecutionNode, 
    context: NodeExecutionContext, 
    taskId: string, 
    finalOutput: ExtendedWorkTaskNodeOutput
  ): void {
    // 确保变量同步通知器存在
    ensureGlobalVariableSyncNotifierExists();
    
    // 记录原始taskId，便于调试
    console.log(`[WorkTaskNode] 原始任务ID: "${taskId}"`);
    
    // 使用工具函数构建标准V3格式的任务输出变量ID
    const variableId = this.generateV3VariableId('task', taskId, 'output');
    
    // 记录生成的变量ID，便于调试
    console.log(`[WorkTaskNode] 生成的变量ID: "${variableId}"`);
    console.log(`[WorkTaskNode] 需要确认此ID与服务端发送的变量ID匹配！`);
    
    // 记录同步开始时间戳
    const syncStartTime = Date.now();
    const syncTimeFormatted = new Date(syncStartTime).toISOString();
    
    console.log(`[WorkTaskNode] [${syncTimeFormatted}] 开始等待变量同步: ${variableId}`);
    
    // 记录变量同步通知器状态
    if (window.variableSyncNotifier) {
      const allRecords = Array.from(window.variableSyncNotifier['waitRecords'].values());
      console.log(`[WorkTaskNode] 当前变量同步通知器中已有 ${allRecords.length} 条等待记录`);
      if (allRecords.length > 0) {
        console.log(`[WorkTaskNode] 已有的等待变量ID: ${allRecords.map(r => r.variableId).join(', ')}`);
      }
    }
    
    // 保存最终输出和同步时间到节点上下文，以便手动完成时使用
    // 重要：我们在节点中保存这些数据，以便稍后手动完成时能够获取
    const execData = node.executionData as ExtendedExecutionData || {};
    
    // 创建或更新扩展的执行数据
    const extendedData: ExtendedExecutionData = {
      variables: execData.variables || {},
      finalOutput: finalOutput,
      syncStartTime: syncStartTime,
      startTime: execData.startTime
    };
    
    // 将扩展数据赋值给节点
    node.executionData = extendedData as any;
    
    // 更新节点状态，显示为正在等待变量同步
    // 重要：此处同时更新节点状态和输出状态，确保UI能正确识别同步状态
    context.updateNode(node.id, { 
      status: 'syncing', // 设置节点整体状态为同步中
      output: {
        ...finalOutput,
        status: {
          ...finalOutput.status,
          state: 'syncing' // 设置输出状态为同步中
        },
        // 添加同步开始时间戳
        syncStartTime: syncTimeFormatted
      },
      executionData: node.executionData
    });
    
    if (!window.variableSyncNotifier) {
      console.warn('[WorkTaskNode] 变量同步通知器不存在，已切换到手动模式');
      // 不再自动完成，而是等待用户手动点击按钮
      console.log(`[WorkTaskNode] 保持节点在同步状态，等待手动完成按钮触发`);
      return;
    }
    
    // 等待变量同步完成，但不自动标记节点为已完成
    window.variableSyncNotifier.waitForSync(
      variableId,
      () => {
        // 变量同步完成后的回调
        const syncCompleteTime = Date.now();
        const syncDuration = syncCompleteTime - syncStartTime;
        const completeTimeFormatted = new Date(syncCompleteTime).toISOString();
        
        console.log(`[WorkTaskNode] [${completeTimeFormatted}] 变量同步完成: ${variableId}, 同步耗时: ${syncDuration}ms`);
        console.log(`[WorkTaskNode] 变量同步已完成，但节点仍处于同步状态，等待手动完成按钮触发`);
        
        // 更新节点数据，记录同步完成时间，但不改变状态
        // 这样用户可以在UI上看到变量已同步但节点仍在等待手动完成
        context.updateNode(node.id, {
          output: {
            ...finalOutput,
            status: {
              ...finalOutput.status,
              progress: 100, // 进度设为100%
              state: 'syncing' // 保持同步状态
            },
            syncStartTime: syncTimeFormatted,
            syncCompleteTime: completeTimeFormatted,
            syncDuration: syncDuration,
            syncInfo: {
              syncStartTime: syncTimeFormatted,
              completionTime: completeTimeFormatted,
              syncWaitTime: `${syncDuration}ms`
            },
            variableSyncStatus: '✅ 服务端变量同步已完成，可以点击下方按钮继续执行'
          }
        });
        
        // 不再自动调用completeNodeExecution，改为等待手动触发
      },
      120000 // 120秒超时，给予更充足的时间
    );
  }
  
  /**
   * 完成节点执行
   * @param node 当前节点
   * @param context 执行上下文
   * @param finalOutput 最终输出
   * @param syncStartTime 变量同步开始时间戳（可选）
   */
  completeNodeExecution(
    node: ExecutionNode, 
    context: NodeExecutionContext, 
    finalOutput: ExtendedWorkTaskNodeOutput,
    syncStartTime?: number
  ): void {
    // 记录节点完成时间
    const completionTime = Date.now();
    const completionTimeFormatted = new Date(completionTime).toISOString();

    // 计算同步等待时间
    let syncWaitTime = '未知';
    if (syncStartTime) {
      syncWaitTime = `${completionTime - syncStartTime}ms`;
    }
    
    console.log(`[WorkTaskNode] [${completionTimeFormatted}] 开始完成节点执行: ${node.id}, 变量同步等待时间: ${syncWaitTime}`);
    
    // 记录继续执行时间
    if (finalOutput.timestamps) {
      finalOutput.timestamps.nextNodeTime = completionTime;
    }
    
    // 添加额外的同步时间信息到输出
    const enhancedOutput: ExtendedWorkTaskNodeOutput = {
      ...finalOutput,
      syncInfo: {
        syncStartTime: syncStartTime ? new Date(syncStartTime).toISOString() : '未知',
        completionTime: completionTimeFormatted,
        syncWaitTime 
      }
    };
    
    // 标记任务已完成
    this.markCompleted(node, context, enhancedOutput);
    
    // 最终更新节点状态，确保时间戳已记录在节点数据中
    context.updateNode(node.id, { 
      output: enhancedOutput as any,
      status: 'completed'
    });
    
    // 通知工作任务完成通知器
    // 这是关键步骤，确保页面上的任务完成Promise能够解析，从而继续执行
    if (window.workTaskCompletionNotifier) {
      console.log(`[WorkTaskNode] 通知工作任务完成: ${node.id}`);
      window.workTaskCompletionNotifier.notifyTaskCompletion(node.id);
    } else {
      console.warn(`[WorkTaskNode] 工作任务完成通知器不存在，页面可能无法继续执行下一个节点`);
    }
    
    // 最后移动到下一个节点
    // 但由于我们在页面中使用了自定义Promise等待机制，这个调用可能无效
    // 保留它是为了兼容性，以防有其他地方依赖这个行为
    context.moveToNextNode();
  }
  
  /**
   * 验证工作任务节点配置
   * @param node 要验证的节点
   * @returns 是否验证通过
   */
  validate(node: ExecutionNode): boolean {
    if (!super.validate(node)) return false;

    // 工作任务节点必须是worktask类型
    if (node.type !== 'worktask') {
      console.warn('[WorkTaskNode] 节点类型不是worktask:', node.type);
      return false;
    }

    // 工作任务节点必须有任务ID (支持两种命名)
    const hasTaskId = node.config?.workTaskId || node.config?.taskId;
    if (!hasTaskId) {
      console.warn('[WorkTaskNode] 工作任务节点没有任务ID (无workTaskId和taskId)');
      return false;
    }

    // 工作任务节点必须有任务名称
    if (!node.config?.taskName) {
      console.warn('[WorkTaskNode] 工作任务节点没有任务名称');
      return false;
    }

    return true;
  }
}
