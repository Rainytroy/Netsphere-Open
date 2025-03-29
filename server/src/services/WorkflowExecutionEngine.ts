import { WorkflowService } from "./WorkflowService";
import { VariableResolver } from "./VariableResolver";
import { VariableServiceAdapter } from "./adapters/VariableServiceAdapter";
import { WorkTaskServiceAdapter } from "./adapters/WorkTaskServiceAdapter";
import { Workflow } from "../models/Workflow";
import { WorkflowNode } from "../models/WorkflowNode";
import { WorkflowConnection } from "../models/WorkflowConnection";
import { WorkflowExecution, ExecutionStatus } from "../models/WorkflowExecution";
import { NodeType } from "../models/WorkflowNode";
import { 
  NodeExecutorFactory, 
  ExecutionContext, 
  NodeState 
} from "./nodeExecutors";


/**
 * 工作流执行引擎
 * 负责解析和执行工作流定义
 */
export class WorkflowExecutionEngine {
  private workflowService: WorkflowService;
  private variableResolver: VariableResolver;
  private variableAdapter: VariableServiceAdapter;
  private workTaskAdapter: WorkTaskServiceAdapter;
  private nodeExecutorFactory: NodeExecutorFactory;
  
  constructor(
    workflowService: WorkflowService,
    variableResolver: VariableResolver,
    variableAdapter: VariableServiceAdapter,
    workTaskAdapter: WorkTaskServiceAdapter
  ) {
    this.workflowService = workflowService;
    this.variableResolver = variableResolver;
    this.variableAdapter = variableAdapter;
    this.workTaskAdapter = workTaskAdapter;
    
    // 创建节点执行器工厂，并传入执行节点的回调方法
    // 这里使用bind确保回调函数中的this指向当前实例
    this.nodeExecutorFactory = new NodeExecutorFactory(
      variableAdapter,
      variableResolver,
      workTaskAdapter,
      this.executeNode.bind(this)
    );
  }
  
  /**
   * 执行工作流
   * @param workflowId 工作流ID
   * @param input 输入数据
   * @returns 执行记录
   */
  async executeWorkflow(workflowId: string, input?: any): Promise<WorkflowExecution> {
    console.log(`[执行引擎] 开始执行工作流 ${workflowId}`);
    
    // 1. 创建执行记录
    const execution = await this.workflowService.createExecutionRecord(workflowId, input);
    const executionId = execution.id;
    
    try {
      // 2. 加载工作流定义
      console.log(`[执行引擎] 加载工作流定义`);
      const workflow = await this.workflowService.getWorkflowWithNodesAndEdges(workflowId);
      
      // 3. 找到起点节点
      console.log(`[执行引擎] 查找起点节点`);
      const startNode = workflow.nodes.find(node => node.type === NodeType.START);
      if (!startNode) {
        throw new Error('工作流缺少起点节点');
      }
      
      // 创建执行上下文
      const context: ExecutionContext = {
        executionId,
        workflowId,
        input: input || {},
        variables: {},
        nodeStates: {}
      };
      
      // 注册工作流输入变量
      context.variables[`${workflow.name}.start`] = input;
      
      // 4. 从起点开始执行
      console.log(`[执行引擎] 开始执行起点节点`);
      await this.executeNode(startNode, context, workflow);
      
      // 5. 更新执行状态
      execution.status = ExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      execution.nodeStates = context.nodeStates;
      
      console.log(`[执行引擎] 工作流执行完成`);
      return await this.workflowService.updateExecution(execution);
    } catch (error: any) {
      // 处理执行错误
      console.error(`[执行引擎] 工作流执行失败:`, error);
      
      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      return await this.workflowService.updateExecution(execution);
    }
  }
  
  /**
   * 执行单个节点
   * 使用节点执行器工厂获取相应的执行器并执行节点
   * @param node 要执行的节点
   * @param context 执行上下文
   * @param workflow 工作流定义
   * @returns 节点执行结果
   */
  private async executeNode(
    node: WorkflowNode, 
    context: ExecutionContext,
    workflow: Workflow
  ): Promise<any> {
    console.log(`[执行引擎] 执行节点: ${node.type}, ID: ${node.id}`);
    
    // 更新节点状态为运行中
    this.updateNodeStatus(context, node.id, ExecutionStatus.RUNNING);
    
    try {
      // 使用节点执行器工厂获取对应类型的执行器
      const executor = this.nodeExecutorFactory.getExecutor(node.type);
      
      // 执行节点
      const result = await executor.execute(node, context, workflow);
      
      // 更新节点状态为完成
      this.updateNodeStatus(
        context, 
        node.id, 
        ExecutionStatus.COMPLETED, 
        { output: result }
      );
      
      // 记录结果到上下文变量中
      if (result !== undefined) {
        const variableName = `${workflow.name}.${node.id}.output`;
        context.variables[variableName] = result;
      }
      
      // 查找并执行下一个节点
      if (node.type !== NodeType.LOOP) {  // 循环节点内部已经处理了流转
        await this.executeNextNodes(node, context, workflow);
      }
      
      return result;
    } catch (error: any) {
      // 更新节点状态为失败
      console.error(`[执行引擎] 节点执行失败:`, error);
      this.updateNodeStatus(
        context, 
        node.id, 
        ExecutionStatus.FAILED,
        { error: error.message }
      );
      throw error;
    }
  }
  
  /**
   * 更新节点执行状态
   * @param context 执行上下文
   * @param nodeId 节点ID
   * @param status 新状态
   * @param additionalData 额外数据
   */
  private updateNodeStatus(
    context: ExecutionContext,
    nodeId: string,
    status: ExecutionStatus,
    additionalData: Record<string, any> = {}
  ): void {
    // 获取现有节点状态，如果不存在则创建
    const prevState = context.nodeStates[nodeId] || {
      status: ExecutionStatus.IDLE,
      runCount: 0
    };
    
    // 更新状态
    const newState: NodeState = {
      ...prevState,
      status,
      runCount: prevState.runCount + (status === ExecutionStatus.RUNNING ? 1 : 0),
      ...additionalData
    };
    
    // 设置时间戳
    if (status === ExecutionStatus.RUNNING) {
      newState.startTime = new Date();
    } else if (status === ExecutionStatus.COMPLETED || status === ExecutionStatus.FAILED) {
      newState.endTime = new Date();
    }
    
    // 更新上下文中的节点状态
    context.nodeStates[nodeId] = newState;
    
    console.log(`[执行引擎] 更新节点 ${nodeId} 状态: ${status}`);
  }
  
  
  /**
   * 查找并执行下一个节点
   * @param currentNode 当前节点
   * @param context 执行上下文
   * @param workflow 工作流定义
   */
  private async executeNextNodes(
    currentNode: WorkflowNode,
    context: ExecutionContext,
    workflow: Workflow
  ): Promise<void> {
    // 查找从当前节点出发的所有连接
    const outgoingEdges = workflow.connections.filter(
      edge => edge.sourceNodeId === currentNode.id
    );
    
    console.log(`[执行引擎] 查找到 ${outgoingEdges.length} 个后继节点`);
    
    // 对于所有卡片类型，执行所有下游节点
    for (const edge of outgoingEdges) {
      const targetNode = workflow.nodes.find(node => node.id === edge.targetNodeId);
      if (targetNode) {
        await this.executeNode(targetNode, context, workflow);
      }
    }
  }
}
