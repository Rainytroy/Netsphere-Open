/**
 * 节点处理器基类
 * 定义了所有节点处理器的通用接口和基本功能
 */

import { ExecutionNode, ExecutionNodeStatus } from '../../types';

export interface NodeExecutionContext {
  variables: Record<string, any>;
  updateNode: (nodeId: string, updates: Partial<ExecutionNode>) => void;
  moveToNextNode: (nodeId?: string) => void;
  onError: (nodeId: string, error: Error) => void;
}

export interface NodeHandler {
  execute: (node: ExecutionNode, context: NodeExecutionContext) => Promise<void>;
  validate?: (node: ExecutionNode) => boolean | Promise<boolean>;
  getNextNodeId?: (node: ExecutionNode, context: NodeExecutionContext) => string | undefined;
}

/**
 * 节点处理器抽象基类
 */
export abstract class BaseNodeHandler implements NodeHandler {
  /**
   * 节点执行方法 - 所有派生类必须实现
   */
  abstract execute(node: ExecutionNode, context: NodeExecutionContext): Promise<void>;

  /**
   * 验证节点配置
   * @param node 要验证的节点
   * @returns 验证是否通过
   */
  validate(node: ExecutionNode): boolean {
    // 默认实现只验证节点必须有ID和类型
    return !!node && !!node.id && !!node.type;
  }

  /**
   * 获取下一个节点ID
   * @param node 当前节点
   * @param context 执行上下文
   * @returns 下一个节点ID
   */
  getNextNodeId(node: ExecutionNode, context: NodeExecutionContext): string | undefined {
    return node.nextNodeId;
  }

  /**
   * 更新节点状态
   * @param node 节点ID
   * @param status 新状态
   * @param context 执行上下文
   */
  protected updateNodeStatus(
    node: ExecutionNode,
    status: ExecutionNodeStatus,
    context: NodeExecutionContext
  ): void {
    context.updateNode(node.id, { status });
  }

  /**
   * 标记节点执行开始
   */
  protected markExecuting(node: ExecutionNode, context: NodeExecutionContext): void {
    this.updateNodeStatus(node, 'executing', context);
    
    // 记录执行开始时间
    context.updateNode(node.id, {
      executionData: {
        ...node.executionData,
        startTime: Date.now()
      }
    });
    
    console.log(`[${node.type}] 开始执行节点: ${node.id}`);
  }

  /**
   * 标记节点执行完成
   */
  protected markCompleted(node: ExecutionNode, context: NodeExecutionContext, output?: any): void {
    const endTime = Date.now();
    const executionTime = (node.executionData?.startTime) 
      ? endTime - node.executionData.startTime 
      : 0;
    
    context.updateNode(node.id, {
      status: 'completed',
      output,
      executionData: {
        ...node.executionData,
        endTime,
        executionTime
      }
    });
    
    console.log(`[${node.type}] 节点执行完成: ${node.id}, 耗时: ${executionTime}ms`);
  }

  /**
   * 标记节点执行错误
   */
  protected markError(node: ExecutionNode, context: NodeExecutionContext, error: Error): void {
    context.updateNode(node.id, {
      status: 'error',
      executionData: {
        ...node.executionData,
        error: error.message,
        endTime: Date.now()
      }
    });
    
    console.error(`[${node.type}] 节点执行错误: ${node.id}`, error);
    context.onError(node.id, error);
  }
}
