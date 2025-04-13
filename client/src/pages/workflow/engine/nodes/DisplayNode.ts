/**
 * 展示节点处理器
 * 用于显示文本内容，支持变量替换
 */

import { DisplayNodeOutput, ExecutionNode } from '../../types';
import { BaseNodeHandler, NodeExecutionContext } from './BaseNode';
import { parseRawText } from '../utils/VariableParser';

export class DisplayNodeHandler extends BaseNodeHandler {
  /**
   * 执行展示节点
   * @param node 节点数据
   * @param context 执行上下文
   */
  async execute(node: ExecutionNode, context: NodeExecutionContext): Promise<void> {
    try {
      this.markExecuting(node, context);
      
      // 首先检查配置字段
      console.log(`[DisplayNode] 节点${node.id}配置: ${JSON.stringify({
        hasRawText: !!node.config?.rawText,
        rawTextLength: node.config?.rawText?.length || 0,
        hasParsedContent: !!node.config?.parsedContent,
        hasContent: !!node.config?.content,
        variablePath: node.config?.variablePath
      })}`);
      
      // 获取显示内容 - 优先使用rawText，其次使用content
      const rawText = node.config?.rawText || node.config?.content || '';
      
      if (!rawText) {
        console.warn('[DisplayNode] 展示节点没有内容:', node.id);
      }
      
      // 获取解析后的内容
      let finalContent;
      
      // 如果已经有解析好的内容，直接使用（比如来自WorkflowEngine的预解析）
      if (node.config?.parsedContent) {
        console.log(`[DisplayNode] 使用预解析内容: ${node.config.parsedContent.substring(0, 100)}${node.config.parsedContent.length > 100 ? '...' : ''}`);
        finalContent = node.config.parsedContent;
      } else {
        // 否则自己解析变量
        console.log(`[DisplayNode] 解析原始内容: ${rawText.substring(0, 100)}${rawText.length > 100 ? '...' : ''}`);
        finalContent = parseRawText(rawText, context.variables);
        console.log(`[DisplayNode] 解析后内容: ${finalContent.substring(0, 100)}${finalContent.length > 100 ? '...' : ''}`);
      }
      
      // 打印即将存入output的内容，便于调试
      console.log(`[DisplayNode] 将要写入output.content的内容: ${finalContent.substring(0, 100)}${finalContent.length > 100 ? '...' : ''}`);
      console.log(`[DisplayNode] 是否包含@gv标识符: ${finalContent.includes('@gv_')}`);
      
      // 输出 - 确保output.content包含最终要显示的内容
      const output: DisplayNodeOutput = {
        content: finalContent,
        animationComplete: false
      };
      
      // 标记完成
      this.markCompleted(node, context, output);
      
      // 模拟内容显示动画
      setTimeout(() => {
        context.updateNode(node.id, {
          output: { ...output, animationComplete: true }
        });
        
        // 内容展示完成后继续下一个节点
        context.moveToNextNode(node.nextNodeId);
      }, 500);  // 模拟500ms的展示动画
      
    } catch (error) {
      console.error('[DisplayNode] 执行错误:', error);
      this.markError(node, context, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 验证展示节点配置
   * @param node 要验证的节点
   * @returns 是否验证通过
   */
  validate(node: ExecutionNode): boolean {
    if (!super.validate(node)) return false;

    // 展示节点必须是display类型
    if (node.type !== 'display') {
      console.warn('[DisplayNode] 节点类型不是display:', node.type);
      return false;
    }

    // 展示节点应该有下一个节点ID（除非是结束节点）
    if (!node.nextNodeId && !node.config?.isEndNode) {
      console.warn('[DisplayNode] 展示节点没有下一个节点ID且不是结束节点');
      return false;
    }

    return true;
  }
}
