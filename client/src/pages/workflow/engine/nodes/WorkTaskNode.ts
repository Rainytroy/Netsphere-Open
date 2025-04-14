/**
 * 工作任务节点处理器
 * 用于处理工作任务的执行
 */

import { ExecutionNode, WorkTaskNodeOutput } from '../../types';
import { BaseNodeHandler, NodeExecutionContext } from './BaseNode';
import { parseRawText } from '../utils/VariableParser';
import workTaskService from '../../../../services/workTaskService';

// 声明全局workflowEngine类型和任务完成通知器
declare global {
  interface Window {
    workflowEngine?: {
      updateNode: (nodeId: string, updates: Partial<ExecutionNode>) => void;
      getNode?: (nodeId: string) => ExecutionNode | undefined;
    };
    // 新增全局任务完成通知器，用于节点间通信
    workTaskCompletionNotifier?: {
      // 注册一个任务完成的回调
      registerTaskCompletion: (nodeId: string, callback: () => void) => void;
      // 触发任务完成通知
      notifyTaskCompletion: (nodeId: string) => void;
    };
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
          
          // 更新节点输出，设置为API调用已完成但UI尚未完全更新状态
          context.updateNode(node.id, {
            output: {
              ...output,
              status: {
                progress: 70, // 设置为70%，表示API调用已完成但UI动画还在进行中
                state: 'running'
              },
              result: taskOutput // 保存API返回的结果
            }
          });
          
          console.log(`[WorkTaskNode] API调用完成: ${parsedTitle}, ID: ${effectiveTaskId}`);
          
          // 注册节点完成的回调，仅当UI组件触发完成通知时才继续
          if (window.workTaskCompletionNotifier) {
            console.log(`[WorkTaskNode] 注册节点完成回调: ${node.id}`);
            
            window.workTaskCompletionNotifier.registerTaskCompletion(node.id, () => {
              console.log(`[WorkTaskNode] 收到组件完成通知，准备触发下一节点: ${node.nextNodeId}`);
              
              // 确保最终状态被设置为完成
              const finalOutput: WorkTaskNodeOutput = {
                ...output,
                status: {
                  progress: 100,
                  state: 'completed'
                },
                result: taskOutput
              };
              
              // 标记任务已完成
              this.markCompleted(node, context, finalOutput);
              
              // 最终更新节点状态
              context.updateNode(node.id, { 
                output: finalOutput,
                status: 'completed'
              });
              
              // 直到此时才触发下一个节点
              context.moveToNextNode(node.nextNodeId);
            });
            
            // 注意: 此处不再直接调用moveToNextNode，
            // 而是等待UI组件的回调通知
          } else {
            console.warn('[WorkTaskNode] 全局通知器未初始化，回退到直接触发下一节点');
            
            // 作为备选方案，如果通知器未初始化，仍直接触发下一节点
            const finalOutput: WorkTaskNodeOutput = {
              ...output,
              status: {
                progress: 100,
                state: 'completed'
              },
              result: taskOutput
            };
            
            this.markCompleted(node, context, finalOutput);
            context.updateNode(node.id, { 
              output: finalOutput,
              status: 'completed'
            });
            context.moveToNextNode(node.nextNodeId);
          }
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
