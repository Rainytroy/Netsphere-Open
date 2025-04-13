/**
 * 循环节点处理器
 * 用于条件判断和循环控制
 */

import { ExecutionNode, LoopNodeOutput } from '../../types';
import { BaseNodeHandler, NodeExecutionContext } from './BaseNode';
import { parseRawText } from '../utils/VariableParser';

export class LoopNodeHandler extends BaseNodeHandler {
  /**
   * 执行循环节点
   * @param node 节点数据
   * @param context 执行上下文
   */
  async execute(node: ExecutionNode, context: NodeExecutionContext): Promise<void> {
    try {
      this.markExecuting(node, context);
      
      // 获取循环配置
      const conditionType = node.config?.conditionType || 'variableValue';
      
      // 初始化输出
      const output: LoopNodeOutput = {
        conditionType,
        result: 'no'  // 默认为不满足条件
      };
      
      // 根据条件类型执行判断
      if (conditionType === 'runCount') {
        await this.handleRunCountCondition(node, context, output);
      } else {
        await this.handleVariableCondition(node, context, output);
      }
      
      // 标记完成
      this.markCompleted(node, context, output);
      
      // 根据结果选择下一个节点
      const nextNodeId = output.result === 'yes' 
        ? node.config?.yesNodeId 
        : node.config?.noNodeId;
      
      console.log(`[LoopNode] 条件判断结果: ${output.result}, 下一个节点: ${nextNodeId || '无'}`);
      
      // 继续执行下一个节点
      context.moveToNextNode(nextNodeId);
    } catch (error) {
      console.error('[LoopNode] 执行错误:', error);
      this.markError(node, context, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 处理运行次数条件
   */
  private async handleRunCountCondition(
    node: ExecutionNode, 
    context: NodeExecutionContext,
    output: LoopNodeOutput
  ): Promise<void> {
    // 获取运行次数配置
    const maxRuns = node.config?.maxRuns || 1;
    
    // 获取当前运行次数
    const runCount = node.executionData?.runCount || 0;
    const newRunCount = runCount + 1;
    
    // 更新运行次数
    context.updateNode(node.id, {
      executionData: {
        ...node.executionData,
        runCount: newRunCount
      }
    });
    
    // 判断是否继续循环
    output.runCount = newRunCount;
    output.maxRuns = maxRuns;
    output.result = newRunCount < maxRuns ? 'yes' : 'no';
    
    console.log(`[LoopNode] 运行次数: ${newRunCount}/${maxRuns}, 结果: ${output.result}`);
  }

  /**
   * 处理变量值条件
   */
  private async handleVariableCondition(
    node: ExecutionNode, 
    context: NodeExecutionContext,
    output: LoopNodeOutput
  ): Promise<void> {
    // 获取变量配置
    const variablePath = node.config?.variablePath || '';
    const expectedValue = node.config?.expectedValue || '';
    
    if (!variablePath) {
      console.warn('[LoopNode] 未配置变量路径');
      output.result = 'no';
      return;
    }
    
    // 获取变量实际值
    let actualValue = '';
    
    if (variablePath.includes('.')) {
      // 形如 source.field 的变量路径
      actualValue = String(context.variables[variablePath] || '');
    } else {
      // 简单变量名，默认从workflow中获取
      actualValue = String(context.variables[variablePath] || '');
    }
    
    // 解析预期值中的变量
    const parsedExpectedValue = parseRawText(expectedValue, context.variables);
    
    // 记录到输出
    output.variablePath = variablePath;
    output.expectedValue = parsedExpectedValue;
    output.actualValue = actualValue;
    
    // 比较值并决定结果
    output.result = this.compareValues(actualValue, parsedExpectedValue, node.config?.compareMode) 
      ? 'yes' 
      : 'no';
    
    console.log(`[LoopNode] 变量对比: ${actualValue} ${node.config?.compareMode || '=='} ${parsedExpectedValue}, 结果: ${output.result}`);
  }

  /**
   * 比较两个值
   */
  private compareValues(actual: string, expected: string, mode: string = 'equals'): boolean {
    switch (mode) {
      case 'notEquals':
        return actual !== expected;
      case 'contains':
        return actual.includes(expected);
      case 'notContains':
        return !actual.includes(expected);
      case 'startsWith':
        return actual.startsWith(expected);
      case 'endsWith':
        return actual.endsWith(expected);
      case 'greaterThan':
        return Number(actual) > Number(expected);
      case 'lessThan':
        return Number(actual) < Number(expected);
      case 'empty':
        return actual === '';
      case 'notEmpty':
        return actual !== '';
      case 'equals':
      default:
        return actual === expected;
    }
  }

  /**
   * 获取下一个节点ID
   * 覆盖基类方法，根据条件结果决定下一个节点
   */
  getNextNodeId(node: ExecutionNode, context: NodeExecutionContext): string | undefined {
    // 已经执行过，根据结果决定
    if (node.output?.result) {
      return node.output.result === 'yes' 
        ? node.config?.yesNodeId 
        : node.config?.noNodeId;
    }
    
    // 默认使用no路径
    return node.config?.noNodeId;
  }

  /**
   * 验证循环节点配置
   * @param node 要验证的节点
   * @returns 是否验证通过
   */
  validate(node: ExecutionNode): boolean {
    if (!super.validate(node)) return false;

    // 循环节点必须是loop类型
    if (node.type !== 'loop') {
      console.warn('[LoopNode] 节点类型不是loop:', node.type);
      return false;
    }

    // 循环节点必须有是/否两个后续节点ID
    if (!node.config?.yesNodeId && !node.config?.noNodeId) {
      console.warn('[LoopNode] 循环节点缺少yes和no路径');
      return false;
    }

    return true;
  }
}
