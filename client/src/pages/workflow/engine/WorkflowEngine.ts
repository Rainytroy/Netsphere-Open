/**
 * 工作流引擎
 * 负责执行工作流和管理节点状态
 */

import { ExecutionNode, WorkflowStructure } from '../types';
import { buildExecutionFlow } from './utils/FlowBuilder';
import { nodeHandlers } from './nodes';
import { NodeExecutionContext } from './nodes/BaseNode';

export interface WorkflowEngineOptions {
  onNodeUpdate?: (node: ExecutionNode) => void;
  onError?: (nodeId: string, error: Error) => void;
  onComplete?: () => void;
}

/**
 * 工作流引擎类
 */
export class WorkflowEngine {
  private nodes: ExecutionNode[] = [];
  private variables: Record<string, any> = {};
  private currentNodeId: string | null = null;
  private options: WorkflowEngineOptions;
  private isRunning: boolean = false;
  private nodeMap: Map<string, ExecutionNode> = new Map();

  /**
   * 构造函数
   * @param options 引擎选项
   */
  constructor(options: WorkflowEngineOptions = {}) {
    this.options = {
      onNodeUpdate: () => {},
      onError: () => {},
      onComplete: () => {},
      ...options
    };
  }

  /**
   * 加载工作流
   * @param workflow 工作流结构
   */
  loadWorkflow(workflow: WorkflowStructure): void {
    // 构建执行流程图
    const executionNodes = buildExecutionFlow(workflow);
    this.nodes = executionNodes;
    
    // 重置状态
    this.variables = {};
    this.currentNodeId = null;
    this.isRunning = false;
    
    // 构建节点映射，便于通过ID快速查找
    this.nodeMap.clear();
    this.nodes.forEach(node => {
      this.nodeMap.set(node.id, node);
    });
    
    console.log('[WorkflowEngine] 工作流加载完成，节点数:', this.nodes.length);
    console.log('[WorkflowEngine] 工作流节点:', this.nodes);
  }

  /**
   * 获取所有执行节点
   */
  getNodes(): ExecutionNode[] {
    return this.nodes;
  }

  /**
   * 获取指定ID的节点
   * @param nodeId 节点ID
   */
  getNode(nodeId: string): ExecutionNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  /**
   * 获取当前执行的节点
   */
  getCurrentNode(): ExecutionNode | null {
    return this.currentNodeId ? this.nodeMap.get(this.currentNodeId) || null : null;
  }

  /**
   * 获取所有变量
   */
  getVariables(): Record<string, any> {
    return { ...this.variables };
  }

  /**
   * 设置变量
   * @param key 变量名
   * @param value 变量值
   */
  setVariable(key: string, value: any): void {
    this.variables[key] = value;
  }

  /**
   * 批量设置变量
   * @param variables 变量对象
   */
  setVariables(variables: Record<string, any>): void {
    this.variables = {
      ...this.variables,
      ...variables
    };
  }

  /**
   * 开始执行工作流
   * @param startInput 初始输入
   */
  async start(startInput?: string): Promise<void> {
    if (this.isRunning) {
      console.warn('[WorkflowEngine] 工作流已在执行中');
      return;
    }
    
    if (this.nodes.length === 0) {
      console.error('[WorkflowEngine] 工作流为空，请先加载工作流');
      return;
    }
    
    // 找到开始节点
    const startNode = this.nodes.find(node => node.type === 'start');
    if (!startNode) {
      console.error('[WorkflowEngine] 找不到开始节点');
      return;
    }
    
    // 设置初始输入
    if (startInput) {
      startNode.config.startInput = startInput;
    }
    
    // 重置所有节点状态
    this.resetAllNodes();
    
    // 设置运行状态
    this.isRunning = true;
    this.currentNodeId = startNode.id;
    
    console.log('[WorkflowEngine] 开始执行工作流');
    
    // 执行开始节点
    await this.executeNode(startNode.id);
  }

  /**
   * 停止执行工作流
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    this.currentNodeId = null;
    console.log('[WorkflowEngine] 工作流执行已停止');
  }

  /**
   * 重置工作流
   */
  reset(): void {
    this.stop();
    this.resetAllNodes();
    this.variables = {};
  }

  /**
   * 执行指定节点
   * @param nodeId 节点ID
   */
  async executeNode(nodeId: string): Promise<void> {
    if (!this.isRunning) {
      console.warn('[WorkflowEngine] 工作流未运行');
      return;
    }
    
    const node = this.nodeMap.get(nodeId);
    
    if (!node) {
      console.error(`[WorkflowEngine] 找不到节点: ${nodeId}`);
      return;
    }
    
    console.log(`[WorkflowEngine] 执行节点: ${nodeId}, 类型: ${node.type}`);
    
    // 获取节点处理器
    const handler = nodeHandlers[node.type];
    
    if (!handler) {
      console.error(`[WorkflowEngine] 找不到节点处理器: ${node.type}`);
      return;
    }
    
    // 验证节点配置
    if (handler.validate && !handler.validate(node)) {
      console.error(`[WorkflowEngine] 节点验证失败: ${nodeId}`);
      return;
    }
    
    // 设置执行上下文
    const context: NodeExecutionContext = {
      variables: this.variables,
      updateNode: this.updateNode.bind(this),
      moveToNextNode: this.moveToNextNode.bind(this),
      onError: this.handleNodeError.bind(this)
    };
    
    try {
      // 更新当前节点ID
      this.currentNodeId = nodeId;
      
      // 执行节点
      await handler.execute(node, context);
    } catch (error) {
      this.handleNodeError(
        nodeId,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 更新节点状态
   * @param nodeId 节点ID
   * @param updates 更新内容
   */
  private updateNode(nodeId: string, updates: Partial<ExecutionNode>): void {
    const node = this.nodeMap.get(nodeId);
    
    if (!node) {
      console.warn(`[WorkflowEngine] 尝试更新不存在的节点: ${nodeId}`);
      return;
    }
    
    // 更新节点
    Object.assign(node, updates);
    
    // 通知更新
    if (this.options.onNodeUpdate) {
      this.options.onNodeUpdate(node);
    }
  }

  /**
   * 移动到下一个节点
   * @param nextNodeId 下一个节点ID，如果未指定则自动决定
   */
  private async moveToNextNode(nextNodeId?: string): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    if (!this.currentNodeId) {
      console.warn('[WorkflowEngine] 没有当前节点');
      return;
    }
    
    const currentNode = this.nodeMap.get(this.currentNodeId);
    
    if (!currentNode) {
      console.warn(`[WorkflowEngine] 当前节点不存在: ${this.currentNodeId}`);
      return;
    }
    
    // 如果未指定下一个节点ID，则使用当前节点的配置
    if (!nextNodeId) {
      const handler = nodeHandlers[currentNode.type];
      
      if (handler && handler.getNextNodeId) {
        nextNodeId = handler.getNextNodeId(currentNode, {
          variables: this.variables,
          updateNode: this.updateNode.bind(this),
          moveToNextNode: this.moveToNextNode.bind(this),
          onError: this.handleNodeError.bind(this)
        });
      } else {
        nextNodeId = currentNode.nextNodeId;
      }
    }
    
    // 如果没有下一个节点，则工作流执行完成
    if (!nextNodeId) {
      this.isRunning = false;
      console.log('[WorkflowEngine] 工作流执行完成');
      
      if (this.options.onComplete) {
        this.options.onComplete();
      }
      
      return;
    }
    
    // 执行下一个节点
    await this.executeNode(nextNodeId);
  }

  /**
   * 处理节点执行错误
   * @param nodeId 节点ID
   * @param error 错误对象
   */
  private handleNodeError(nodeId: string, error: Error): void {
    console.error(`[WorkflowEngine] 节点执行错误: ${nodeId}`, error);
    
    // 更新节点状态为错误
    this.updateNode(nodeId, {
      status: 'error',
      executionData: {
        ...this.nodeMap.get(nodeId)?.executionData,
        error: error.message
      }
    });
    
    // 通知错误
    if (this.options.onError) {
      this.options.onError(nodeId, error);
    }
    
    // 停止工作流执行
    this.isRunning = false;
  }

  /**
   * 重置所有节点状态
   */
  private resetAllNodes(): void {
    this.nodes.forEach(node => {
      this.updateNode(node.id, {
        status: 'waiting',
        output: undefined,
        executionData: {}
      });
    });
  }
}
