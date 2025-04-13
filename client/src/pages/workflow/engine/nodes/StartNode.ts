/**
 * 起始节点处理器
 * 工作流的起点，负责初始化变量和启动流程
 */

import { ExecutionNode } from '../../types';
import { BaseNodeHandler, NodeExecutionContext } from './BaseNode';
import { parseRawText } from '../utils/VariableParser';

export class StartNodeHandler extends BaseNodeHandler {
  /**
   * 执行起始节点
   * @param node 节点数据
   * @param context 执行上下文
   */
  async execute(node: ExecutionNode, context: NodeExecutionContext): Promise<void> {
    try {
      this.markExecuting(node, context);
      
      // 获取初始输入
      const startInput = node.config?.startInput || '';
      
      // 处理并保存输入到变量中
      if (startInput) {
        console.log('[StartNode] 初始输入:', startInput);
        context.variables.startinput = startInput;
      }
      
      // 如果配置了欢迎消息，解析其中的变量
      if (node.config?.welcomeMessage) {
        const parsedWelcomeMessage = parseRawText(
          node.config.welcomeMessage,
          context.variables
        );
        
        // 输出处理结果
        this.markCompleted(node, context, {
          welcomeMessage: parsedWelcomeMessage
        });
      } else {
        // 无欢迎消息，直接标记完成
        this.markCompleted(node, context, { welcomeMessage: '' });
      }
      
      // 继续执行下一个节点
      context.moveToNextNode(node.nextNodeId);
    } catch (error) {
      console.error('[StartNode] 执行错误:', error);
      this.markError(node, context, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 验证起始节点配置
   * @param node 要验证的节点
   * @returns 是否验证通过
   */
  validate(node: ExecutionNode): boolean {
    if (!super.validate(node)) return false;

    // 起始节点必须是start类型
    if (node.type !== 'start') {
      console.warn('[StartNode] 节点类型不是start:', node.type);
      return false;
    }

    // 起始节点必须有下一个节点ID
    if (!node.nextNodeId) {
      console.warn('[StartNode] 起始节点没有下一个节点ID');
      return false;
    }

    return true;
  }
}
