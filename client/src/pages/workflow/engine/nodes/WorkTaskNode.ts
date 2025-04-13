/**
 * 工作任务节点处理器
 * 用于处理工作任务的执行
 */

import { ExecutionNode, WorkTaskNodeOutput } from '../../types';
import { BaseNodeHandler, NodeExecutionContext } from './BaseNode';
import { parseRawText } from '../utils/VariableParser';

export class WorkTaskNodeHandler extends BaseNodeHandler {
  /**
   * 执行工作任务节点
   * @param node 节点数据
   * @param context 执行上下文
   */
  async execute(node: ExecutionNode, context: NodeExecutionContext): Promise<void> {
    try {
      this.markExecuting(node, context);
      
      // 获取任务配置
      const { taskName, npc, taskTitle, taskDescription } = node.config || {};
      
      if (!taskName) {
        console.warn('[WorkTaskNode] 工作任务节点没有任务名称:', node.id);
      }
      
      // 解析任务标题和描述中的变量 (V3.0格式)
      const parsedTitle = parseRawText(taskTitle || taskName || '', context.variables);
      const parsedDescription = parseRawText(taskDescription || '', context.variables);
      
      console.log(`[WorkTaskNode] 解析后标题: ${parsedTitle}`);
      console.log(`[WorkTaskNode] 解析后描述: ${parsedDescription.substring(0, 100)}${parsedDescription.length > 100 ? '...' : ''}`);
      
      // 创建任务输出
      const output: WorkTaskNodeOutput = {
        taskName: parsedTitle,
        npc,
        status: {
          progress: 0,
          state: 'running'
        }
      };
      
      console.log(`[WorkTaskNode] 开始执行任务: ${parsedTitle}`);
      
      // 标记任务开始
      this.markCompleted(node, context, output);
      
      // 模拟任务进度更新
      this.simulateTaskProgress(node, context);
      
      // 在实际应用中，这里会调用API启动工作任务
      // 由于是模拟，我们直接完成当前节点并继续下一个节点
      setTimeout(() => {
        // 任务执行完成后继续流程
        context.moveToNextNode(node.nextNodeId);
      }, 1000);
      
    } catch (error) {
      console.error('[WorkTaskNode] 执行错误:', error);
      this.markError(node, context, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 模拟任务进度更新
   * 在实际应用中，这里会由服务端推送任务进度
   */
  private simulateTaskProgress(node: ExecutionNode, context: NodeExecutionContext): void {
    let progress = 0;
    
    const progressInterval = setInterval(() => {
      progress += 20;
      
      if (progress <= 100) {
        // 更新任务进度
        const output = node.output as WorkTaskNodeOutput;
        const state = progress >= 100 ? 'completed' : 'running';
        
        context.updateNode(node.id, {
          output: {
            ...output,
            status: {
              progress,
              state
            }
          }
        });
        
        console.log(`[WorkTaskNode] 任务进度更新: ${progress}%, 状态: ${state}`);
      }
      
      if (progress >= 100) {
        clearInterval(progressInterval);
      }
    }, 500);
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

    // 工作任务节点必须有任务名称
    if (!node.config?.taskName) {
      console.warn('[WorkTaskNode] 工作任务节点没有任务名称');
      return false;
    }

    return true;
  }
}
