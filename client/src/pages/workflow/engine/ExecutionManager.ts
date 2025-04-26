import { ExecutionNode, ExecutionData } from '../types';
import { workflowService } from '../../../services/workflowService';
import { WorkflowEngine } from '../WorkflowEngine';

/**
 * 工作流执行管理器
 * 负责工作流执行的底层逻辑和状态管理
 */
export class ExecutionManager {
  /**
   * 准备工作流执行环境
   * 获取最新工作流结构，构建执行节点，重置所有循环计数
   * @param workflowId 工作流ID
   * @returns 构建好的执行节点数组
   */
  static async prepareExecution(workflowId: string): Promise<ExecutionNode[]> {
    console.log('[ExecutionManager] 准备工作流执行环境');
    
    // 从服务器获取最新结构
    const structure = await workflowService.getWorkflowStructure(workflowId);
    
    if (!structure.nodes || structure.nodes.length === 0) {
      throw new Error('工作流结构中没有节点数据');
    }
    
    console.log('[ExecutionManager] 获取到工作流结构，节点数:', structure.nodes.length);
    
    // 构建执行节点
    const nodes = WorkflowEngine.buildExecutionFlow(structure);
    
    // 重置所有循环节点计数
    this.resetLoopCounters(nodes);
    
    return nodes;
  }
  
  /**
   * 重置所有循环节点的计数器
   * @param nodes 执行节点数组
   */
  static resetLoopCounters(nodes: ExecutionNode[]): void {
    nodes.forEach(node => {
      // 确保所有节点都有executionData
      node.executionData = node.executionData || { variables: {} };
      
      // 特别处理循环节点
      if (node.type === 'loop') {
        // 重置循环计数，但保留其他属性
        node.executionData = {
          ...node.executionData,
          runCount: 0,  // 明确重置为0
          variables: node.executionData.variables || {}
        };
        console.log(`[ExecutionManager] 重置循环节点 ${node.id} 计数`);
      }
    });
  }
  
  /**
   * 查找工作流起点节点
   * @param nodes 执行节点数组
   * @returns 起点节点，如果未找到则返回undefined
   */
  static findStartNode(nodes: ExecutionNode[]): ExecutionNode | undefined {
    return nodes.find(n => n.type === 'start');
  }
  
  /**
   * 查找下一个等待执行的节点
   * @param nodes 执行节点数组
   * @returns 找到的等待节点的索引，如果未找到则返回-1
   */
  static findNextWaitingNodeIndex(nodes: ExecutionNode[]): number {
    return nodes.findIndex(n => n.status === 'waiting');
  }
  
  /**
   * 标记暂停中的节点
   * 将所有executing状态的节点改为waiting
   * @param nodes 执行节点数组
   * @returns 更新后的节点数组
   */
  static markNodesAsPaused(nodes: ExecutionNode[]): ExecutionNode[] {
    return nodes.map(node => {
      if (node.status === 'executing') {
        console.log(`[ExecutionManager] 标记节点 ${node.id} 为暂停状态`);
        return { ...node, status: 'waiting' }; 
      }
      return node;
    });
  }
  
  /**
   * 检查是否有可继续执行的节点
   * @param nodes 执行节点数组
   * @param currentNodeIndex 当前节点索引
   * @returns 是否有可继续的节点
   */
  static hasContinuableNodes(nodes: ExecutionNode[], currentNodeIndex: number): boolean {
    // 当前节点未完成或有等待节点
    const currentNode = nodes[currentNodeIndex];
    return (
      (currentNode && currentNode.status !== 'completed' && currentNode.status !== 'error') ||
      this.findNextWaitingNodeIndex(nodes) >= 0
    );
  }
}
