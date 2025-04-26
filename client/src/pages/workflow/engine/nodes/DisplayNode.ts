/**
 * 展示节点处理器
 * 用于显示文本内容，支持变量替换
 */

import { DisplayNodeOutput, ExecutionNode, ExecutionTimestamps } from '../../types';
import { BaseNodeHandler, NodeExecutionContext } from './BaseNode';
import { parseRawText, extractV3Identifiers } from '../utils/VariableParser';
import { variableService } from '../../../../services/variableService';

// V3.0标识符格式正则表达式
const V3_IDENTIFIER_EXACT_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=$/;

export class DisplayNodeHandler extends BaseNodeHandler {
  /**
   * 执行展示节点
   * @param node 节点数据
   * @param context 执行上下文
   */
  async execute(node: ExecutionNode, context: NodeExecutionContext): Promise<void> {
    try {
      // 记录开始执行时间
      const startTime = Date.now();
      
      // 不使用基类的方法，直接更新节点状态
      context.updateNode(node.id, { status: 'executing' });
      
      // 直接从配置获取rawText，这是从VEX编辑器保存的原始文本
      const rawText = node.config?.rawText;
      
      // 用于变量解析的文本可以回退到content，但不影响原始rawText的保存
      const textToProcess = rawText || node.config?.content || '';
      
      if (!textToProcess) {
        console.warn('[DisplayNode] 展示节点没有内容:', node.id);
      }
      
      // 调试输出原始文本
      console.log(`[DisplayNode][${node.id}] 原始文本:`, {
        hasRawText: !!rawText,
        rawTextLength: rawText?.length || 0,
        rawTextSample: rawText ? rawText.substring(0, 50) + (rawText.length > 50 ? '...' : '') : '无'
      });
      
      // 获取解析后的内容
      let finalContent;
      
      // 简化变量解析逻辑，不再使用全局缓存
      // 如果已经有解析好的内容，直接使用（比如来自WorkflowEngine的预解析）
      if (node.config?.parsedContent) {
        finalContent = node.config.parsedContent;
        console.log(`[DisplayNode][${node.id}] 使用节点配置中的预解析内容`);
      } else {
        // 检查文本中是否包含变量标识符
        const identifiers = extractV3Identifiers(textToProcess);
        
        // 如果包含变量标识符，需要解析变量
        if (identifiers.length > 0) {
          console.log(`[DisplayNode][${node.id}] 需要解析变量，开始处理`);
          try {
            // 使用变量解析逻辑
            finalContent = parseRawText(textToProcess, context.variables);
          } catch (error) {
            console.error('[DisplayNode] 解析变量失败:', error);
            finalContent = textToProcess; // 最后的后备：原始文本
          }
        } else {
          // 没有变量标识符，直接使用原始文本
          finalContent = textToProcess;
        }
      }
      
      // 记录所有时间戳 - 提前计算所有值，不依赖异步回调
      const renderStartTime = Date.now();
      const renderCompleteTime = Date.now() + 100; // 模拟渲染时间
      const statusCompleteTime = renderCompleteTime + 50; // 模拟状态更新时间
      const nextNodeTime = statusCompleteTime + 50; // 模拟通知下一节点时间
      
      // 创建完整的时间戳数据
      const timestamps: ExecutionTimestamps = {
        startTime,
        renderStartTime,
        renderCompleteTime,
        statusCompleteTime,
        nextNodeTime
      };
      
      // 输出 - 包含完整时间戳信息和原始文本
      const output: DisplayNodeOutput = {
        content: finalContent,
        rawText: rawText,  // 直接使用配置中的原始文本
        animationComplete: false,
        timestamps: timestamps
      };
      
      // 输出日志，确认rawText被正确保存
      console.log(`[DisplayNode][${node.id}] 创建output对象:`, {
        hasOutput: true,
        hasRawText: !!output.rawText,
        rawTextLength: output.rawText?.length || 0,
        contentLength: output.content?.length || 0
      });
      
      // 标记完成 - 直接更新节点状态和输出
      const endTime = Date.now();
      const executionTime = startTime ? endTime - startTime : 0;
      
      context.updateNode(node.id, {
        status: 'completed',
        output: output,
        executionData: {
          ...node.executionData,
          endTime,
          executionTime
        }
      });
      
      // 模拟内容显示动画
      setTimeout(() => {
        // 获取当前节点状态，确保使用最新数据
        const currentNode = window.workflowEngine?.getNode?.(node.id);
        const currentOutput = currentNode?.output as DisplayNodeOutput || output;
        
        // 对回调中获取的output进行调试输出，以便排查问题
        console.log(`[DisplayNode][${node.id}] setTimeout回调中获取的output:`, {
          hasOutput: !!currentOutput,
          hasRawText: !!currentOutput?.rawText,
          rawTextLength: currentOutput?.rawText?.length || 0,
          outputFields: currentOutput ? Object.keys(currentOutput) : []
        });
        
        // 设置动画完成标志，保持所有现有输出字段不变
        const newOutput = { 
          ...currentOutput, 
          animationComplete: true
        };
          
        context.updateNode(node.id, {
          output: newOutput
        });
        
        // 内容展示完成后继续下一个节点
        context.moveToNextNode(node.nextNodeId);
      }, 500);  // 模拟500ms的展示动画
      
    } catch (error) {
      console.error('[DisplayNode] 执行错误:', error);
      context.updateNode(node.id, {
        status: 'error',
        executionData: {
          ...node.executionData,
          error: error instanceof Error ? error.message : String(error),
          endTime: Date.now()
        }
      });
      
      context.onError(node.id, error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  /**
   * 辅助函数：转义正则表达式特殊字符
   * @param string 需要被转义的字符串
   * @returns 转义后的字符串
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * 解析变量标识符，提取类型、ID和字段
   * 直接从DisplayNodeContent.tsx复制的方法
   */
  private parseVariableIdentifier(identifier: string): { type: string; id: string; field: string; fullId: string } | null {
    if (!identifier) return null;
    
    console.log(`[DisplayNode] 解析变量标识符: ${identifier}`);
    
    // 解析系统标识符
    if (identifier.startsWith('@gv_') && identifier.endsWith('-=')) {
      // 使用正则表达式解析
      const match = identifier.match(V3_IDENTIFIER_EXACT_REGEX);
      if (!match) return null;
      
      const [_, type, id, field] = match;
      const fullId = `${type}_${id}_${field}`;
      
      console.log(`[DisplayNode] 解析结果: type=${type}, id=${id}, field=${field}, fullId=${fullId}`);
      
      return { type, id, field, fullId };
    }
    
    return null;
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
