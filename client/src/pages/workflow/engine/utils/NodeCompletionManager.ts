/**
 * 节点完成规则管理器
 * 为不同类型的节点定义各自的完成逻辑
 */

import { ExecutionNode } from '../../types';

// 节点状态更新函数类型
type UpdateNodeStatusFn = (nodeId: string, status: string, output?: any) => void;

/**
 * 节点完成管理器
 * 根据节点类型应用不同的完成规则
 */
export class NodeCompletionManager {
  /**
   * 处理起点卡完成规则
   * 规则：在点击运行按钮后立即完成
   */
  static handleStartNodeCompletion(
    node: ExecutionNode, 
    output: any, 
    updateNodeStatus: UpdateNodeStatusFn
  ): boolean {
    console.log(`[NodeCompletionManager] 应用起点卡完成规则: ${node.id}`);
    
    // 直接标记为完成
    updateNodeStatus(node.id, 'completed', output);
    return true; // 表示可以继续执行下一个节点
  }
  
  /**
   * 处理工作任务卡片完成规则
   * 规则：手动完成，保持在syncing状态等待用户手动确认
   */
  static handleWorkTaskNodeCompletion(
    node: ExecutionNode, 
    output: any, 
    updateNodeStatus: UpdateNodeStatusFn
  ): boolean {
    // 检查节点状态，如果已经是completed，说明用户已经手动完成了此节点
    if (node.status === 'completed') {
      console.log(`[NodeCompletionManager] 节点 ${node.id} 已被手动标记为完成，允许继续执行下一个节点`);
      
      // 不需要调用updateNodeStatus，因为节点已经被标记为completed
      // 返回true表示应该继续执行下一个节点
      return true;
    }
    
    // 检查输出中是否存在手动完成的标记
    if (output && output.manualCompletion) {
      console.log(`[NodeCompletionManager] 节点 ${node.id} 包含手动完成标记，标记为completed并继续执行`);
      
      // 更新为completed状态
      updateNodeStatus(node.id, 'completed', output);
      
      // 返回true表示应该继续执行下一个节点
      return true;
    }
    
    console.log(`[NodeCompletionManager] 应用工作任务卡完成规则: ${node.id}, 保持在syncing状态等待手动完成`);
    
    // 常规情况：更新输出，但保持syncing状态
    // 只有当用户通过手动完成按钮触发时才会标记为completed
    updateNodeStatus(node.id, 'syncing', output);
    
    // 返回false表示不应自动继续到下一个节点
    return false;
  }
  
  /**
   * 处理赋值卡完成规则
   * 规则：在赋值完成且所有目标变量更新后
   */
  static handleAssignmentNodeCompletion(
    node: ExecutionNode, 
    output: any, 
    updateNodeStatus: UpdateNodeStatusFn
  ): boolean {
    console.log(`[NodeCompletionManager] 应用赋值卡完成规则: ${node.id}`);
    
    // 确保已有赋值结果
    if (output && output.assignments && output.assignments.length > 0) {
      console.log(`[NodeCompletionManager] 赋值卡有${output.assignments.length}个赋值操作，标记为完成`);
      updateNodeStatus(node.id, 'completed', output);
      return true; // 表示可以继续执行下一个节点
    }
    
    // 如果没有赋值操作，标记为错误
    console.error(`[NodeCompletionManager] 赋值卡没有有效的赋值操作，标记为错误`);
    updateNodeStatus(node.id, 'error', { 
      ...output,
      error: '赋值操作未定义任何变量更新'
    });
    return false; // 不继续执行下一个节点
  }
  
  /**
   * 处理展示卡完成规则
   * 规则：只要有内容，立即标记为完成
   */
  static handleDisplayNodeCompletion(
    node: ExecutionNode, 
    output: any, 
    updateNodeStatus: UpdateNodeStatusFn
  ): boolean {
    console.log(`[NodeCompletionManager] 应用展示卡完成规则: ${node.id}`);
    
    // 修改为：只要内容成功解析，就立即标记为完成，不再等待动画
    if (output && output.content) {
      console.log(`[NodeCompletionManager] 展示卡内容解析完成，立即标记为completed`);
      
      // 确保设置animationComplete=true，使UI层代码能够正确处理
      const enhancedOutput = {
        ...output,
        animationComplete: true
      };
      
      updateNodeStatus(node.id, 'completed', enhancedOutput);
      return true; // 继续执行下一个节点
    }
    
    // 仅当没有内容时才保持executing状态
    console.log(`[NodeCompletionManager] 展示卡内容为空，保持executing状态`);
    updateNodeStatus(node.id, 'executing', output);
    return false; // 不继续执行下一个节点
  }
  
  /**
   * 处理循环卡完成规则
   * 规则：在完成yes/no判断后
   */
  static handleLoopNodeCompletion(
    node: ExecutionNode, 
    output: any, 
    updateNodeStatus: UpdateNodeStatusFn
  ): boolean {
    console.log(`[NodeCompletionManager] 应用循环卡完成规则: ${node.id}`);
    
    // 详细日志，输出完整的节点和输出状态
    console.log(`【DEBUG循环】循环卡节点完成处理，详情：`, {
      节点ID: node.id,
      节点类型: node.type,
      输出: output,
      输出结果: output?.result,
      循环次数: output?.runCount,
      最大次数: output?.maxRuns,
      配置分支: {
        是分支: node.config?.yesNodeId,
        否分支: node.config?.noNodeId
      }
    });
    
    // 确保已完成yes/no判断
    if (output && output.result) {
      console.log(`【DEBUG循环】循环卡判断结果: ${output.result}，标记为completed`);
      
      // 检查是否有对应的分支目标节点
      const targetNodeId = output.result === 'yes' 
        ? node.config?.yesNodeId 
        : node.config?.noNodeId;
      
      console.log(`【DEBUG循环】结果${output.result}对应目标节点: ${targetNodeId || '无'}`);
      
      // 更新节点状态为completed
      updateNodeStatus(node.id, 'completed', output);
      
      return true; // 继续执行下一个节点
    }
    
    // 未完成判断，标记为错误
    console.error(`[NodeCompletionManager] 循环卡未产生判断结果，标记为错误`);
    updateNodeStatus(node.id, 'error', {
      ...output,
      error: '循环卡未完成条件判断'
    });
    return false; // 不继续执行下一个节点
  }
  
  /**
   * 根据节点类型应用相应的完成规则
   * @param node 执行节点
   * @param output 节点输出
   * @param updateNodeStatus 更新节点状态的函数
   * @returns 是否应该继续执行下一个节点
   */
  static handleNodeCompletion(
    node: ExecutionNode, 
    output: any, 
    updateNodeStatus: UpdateNodeStatusFn
  ): boolean {
    if (!node || !node.type) {
      console.error(`[NodeCompletionManager] 无效的节点或节点类型`);
      return false;
    }
    
    console.log(`[NodeCompletionManager] 处理节点完成: ${node.id}, 类型: ${node.type}`);
    
    // 根据节点类型调用相应的完成处理函数
    switch (node.type) {
      case 'start':
        return this.handleStartNodeCompletion(node, output, updateNodeStatus);
      case 'worktask':
        return this.handleWorkTaskNodeCompletion(node, output, updateNodeStatus);
      case 'assign':
        return this.handleAssignmentNodeCompletion(node, output, updateNodeStatus);
      case 'display':
        return this.handleDisplayNodeCompletion(node, output, updateNodeStatus);
      case 'loop':
        return this.handleLoopNodeCompletion(node, output, updateNodeStatus);
      default:
        // 默认行为 - 直接标记为完成
        console.warn(`[NodeCompletionManager] 未定义的节点类型: ${node.type}，使用默认完成规则`);
        updateNodeStatus(node.id, 'completed', output);
        return true;
    }
  }
}
