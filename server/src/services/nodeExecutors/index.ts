import { WorkflowNode, NodeType } from "../../models/WorkflowNode";
import { VariableResolver } from "../VariableResolver";
import { VariableServiceAdapter } from "../adapters/VariableServiceAdapter";
import { WorkTaskServiceAdapter } from "../adapters/WorkTaskServiceAdapter";
import { Workflow } from "../../models/Workflow";
import { ExecutionStatus } from "../../models/WorkflowExecution";

/**
 * 执行上下文接口
 * 包含节点执行所需的上下文数据
 */
export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  input: any;
  variables: Record<string, any>;
  nodeStates: Record<string, NodeState>;
}

/**
 * 节点状态接口
 * 记录节点的执行状态和相关数据
 */
export interface NodeState {
  status: ExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  runCount: number;
  output?: any;
  error?: string;
}

/**
 * 节点执行器接口
 * 定义节点执行的通用接口
 */
export interface NodeExecutor {
  /**
   * 执行节点
   * @param node 要执行的节点
   * @param context 执行上下文
   * @param workflow 工作流定义
   * @returns 执行结果
   */
  execute(node: WorkflowNode, context: ExecutionContext, workflow: Workflow): Promise<any>;
}

/**
 * 起点节点执行器
 * 处理工作流的起点节点
 */
export class StartNodeExecutor implements NodeExecutor {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    console.log(`[StartNodeExecutor] 执行起点节点 ${node.id}`);
    
    // 起点节点直接返回输入数据
    return context.input;
  }
}

/**
 * 工作任务节点执行器
 * 处理调用工作任务的节点
 */
export class WorkTaskNodeExecutor implements NodeExecutor {
  private workTaskAdapter: WorkTaskServiceAdapter;
  private variableResolver: VariableResolver;
  
  constructor(workTaskAdapter: WorkTaskServiceAdapter, variableResolver: VariableResolver) {
    this.workTaskAdapter = workTaskAdapter;
    this.variableResolver = variableResolver;
  }
  
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    console.log(`[WorkTaskNodeExecutor] 执行工作任务节点 ${node.id}`);
    
    // 获取节点配置
    const config = node.config || {};
    const { workTaskId, input } = config;
    
    if (!workTaskId) {
      throw new Error('工作任务节点缺少工作任务ID');
    }
    
    // 解析输入中的变量引用
    let resolvedInput: string;
    if (input) {
      resolvedInput = await this.variableResolver.resolveText(input);
    } else {
      // 如果未指定输入，则使用工作任务自身的输入
      resolvedInput = await this.workTaskAdapter.getWorkTaskInput(workTaskId);
    }
    
    // 执行工作任务
    console.log(`[WorkTaskNodeExecutor] 执行工作任务 ${workTaskId}，输入:`, resolvedInput);
    const result = await this.workTaskAdapter.executeWorkTask(workTaskId, resolvedInput);
    
    if (!result.success) {
      throw new Error(`工作任务执行失败: ${result.error || '未知错误'}`);
    }
    
    console.log(`[WorkTaskNodeExecutor] 工作任务执行成功，输出:`, result.output);
    return result.output;
  }
}

/**
 * 赋值节点执行器
 * 处理变量赋值操作的节点
 */
export class AssignmentNodeExecutor implements NodeExecutor {
  private variableAdapter: VariableServiceAdapter;
  
  constructor(variableAdapter: VariableServiceAdapter) {
    this.variableAdapter = variableAdapter;
  }
  
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    console.log(`[AssignmentNodeExecutor] 执行赋值节点 ${node.id}`);
    
    // 获取节点配置
    const config = node.config || {};
    const assignments = config.assignments || [];
    
    if (!assignments.length) {
      console.warn(`[AssignmentNodeExecutor] 赋值节点没有定义赋值规则`);
      return { message: '没有执行赋值操作' };
    }
    
    // 执行所有赋值规则
    const results: Array<{ from: string; to: string; value: any }> = [];
    
    for (const assignment of assignments) {
      const { sourceVariable, targetVariable } = assignment;
      
      if (!sourceVariable || !targetVariable) {
        console.warn(`[AssignmentNodeExecutor] 赋值规则不完整，跳过`);
        continue;
      }
      
      // 从上下文或变量系统获取源变量值
      let value;
      
      // 首先检查上下文变量
      if (sourceVariable in context.variables) {
        value = context.variables[sourceVariable];
      } else {
        // 然后从变量系统获取
        const [source, field] = sourceVariable.replace(/^@/, '').split('.');
        if (source && field) {
          value = await this.variableAdapter.getVariableValue(source, field);
        }
      }
      
      if (value !== undefined) {
        // 设置到目标变量
        const [targetSource, targetField] = targetVariable.replace(/^@/, '').split('.');
        
        // 更新上下文变量
        const targetKey = targetSource && targetField ? `${targetSource}.${targetField}` : targetVariable;
        context.variables[targetKey] = value;
        
        // 记录赋值结果
        results.push({
          from: sourceVariable,
          to: targetVariable,
          value
        });
        
        console.log(`[AssignmentNodeExecutor] 赋值: ${sourceVariable} => ${targetVariable} = ${value}`);
      } else {
        console.warn(`[AssignmentNodeExecutor] 源变量 ${sourceVariable} 不存在或值为undefined`);
      }
    }
    
    return {
      message: `完成 ${results.length} 项赋值操作`,
      assignments: results
    };
  }
}

/**
 * 循环节点执行器
 * 处理循环和条件判断的节点
 */
export class LoopNodeExecutor implements NodeExecutor {
  private variableAdapter: VariableServiceAdapter;
  private executeNode: (node: WorkflowNode, context: ExecutionContext, workflow: Workflow) => Promise<any>;
  
  constructor(
    variableAdapter: VariableServiceAdapter,
    executeNodeCallback: (node: WorkflowNode, context: ExecutionContext, workflow: Workflow) => Promise<any>
  ) {
    this.variableAdapter = variableAdapter;
    this.executeNode = executeNodeCallback;
  }
  
  async execute(node: WorkflowNode, context: ExecutionContext, workflow: Workflow): Promise<any> {
    console.log(`[LoopNodeExecutor] 执行循环节点 ${node.id}`);
    
    // 获取节点配置
    const config = node.config || {};
    const { conditionType, conditionConfig } = config;
    
    if (!conditionType || !conditionConfig) {
      throw new Error('循环节点配置不完整');
    }
    
    // 获取节点当前运行次数
    const nodeState = context.nodeStates[node.id] || { runCount: 0 };
    const runCount = nodeState.runCount || 0;
    
    console.log(`[LoopNodeExecutor] 循环节点当前运行次数: ${runCount}`);
    
    // 判断条件是否满足
    let conditionMet = false;
    
    if (conditionType === 'runCount') {
      // 运行次数条件
      const maxRuns = conditionConfig.maxRuns || 1;
      conditionMet = runCount < maxRuns;
      console.log(`[LoopNodeExecutor] 循环条件(运行次数): ${runCount} < ${maxRuns} = ${conditionMet}`);
    } else if (conditionType === 'variableValue') {
      // 变量值条件
      const { variablePath, expectedValue } = conditionConfig;
      
      // 首先检查上下文变量
      let value;
      if (variablePath in context.variables) {
        value = context.variables[variablePath];
      } else {
        // 否则从变量系统获取
        const [source, field] = variablePath.replace(/^@/, '').split('.');
        if (source && field) {
          value = await this.variableAdapter.getVariableValue(source, field);
        }
      }
      
      conditionMet = value === expectedValue;
      console.log(`[LoopNodeExecutor] 循环条件(变量值): ${value} === ${expectedValue} = ${conditionMet}`);
    }
    
    // 查找并执行下一个节点
    const outgoingEdges = workflow.connections.filter(edge => edge.sourceNodeId === node.id);
    console.log(`[LoopNodeExecutor] 循环节点找到 ${outgoingEdges.length} 条出边`);
    
    for (const edge of outgoingEdges) {
      const isYesBranch = edge.label === 'Yes';
      const isNoBranch = edge.label === 'No';
      
      // 根据条件和分支标签决定是否执行
      const shouldExecute = 
        (conditionMet && isYesBranch) || 
        (!conditionMet && isNoBranch) ||
        (!isYesBranch && !isNoBranch);  // 未标记的边始终执行
      
      if (shouldExecute) {
        const targetNode = workflow.nodes.find(n => n.id === edge.targetNodeId);
        if (targetNode) {
          console.log(`[LoopNodeExecutor] 循环节点执行分支: ${edge.label || '未标记'}`);
          await this.executeNode(targetNode, context, workflow);
        }
      }
    }
    
    return { 
      conditionMet,
      runCount,
      nextBranch: conditionMet ? 'Yes' : 'No'
    };
  }
}

/**
 * 展示节点执行器
 * 处理显示和输出内容的节点
 */
export class DisplayNodeExecutor implements NodeExecutor {
  private variableAdapter: VariableServiceAdapter;
  
  constructor(variableAdapter: VariableServiceAdapter) {
    this.variableAdapter = variableAdapter;
  }
  
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    console.log(`[DisplayNodeExecutor] 执行展示节点 ${node.id}`);
    
    // 获取节点配置
    const config = node.config || {};
    const { variablePath, displayMode } = config;
    
    if (!variablePath) {
      throw new Error('展示节点缺少变量路径');
    }
    
    // 获取要显示的变量值
    let content;
    
    // 首先检查上下文变量
    if (variablePath in context.variables) {
      content = context.variables[variablePath];
    } else {
      // 否则从变量系统获取
      const [source, field] = variablePath.replace(/^@/, '').split('.');
      if (source && field) {
        content = await this.variableAdapter.getVariableValue(source, field);
      }
    }
    
    // 如果找不到变量，返回友好提示
    if (content === undefined) {
      content = `[未找到变量: ${variablePath}]`;
    }
    
    // 根据显示模式处理
    console.log(`[DisplayNodeExecutor] 展示内容: ${content}`);
    
    // 这里只是记录显示内容，实际显示由前端处理
    return {
      content,
      displayMode: displayMode || 'direct',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 节点执行器工厂
 * 根据节点类型创建相应的执行器
 */
export class NodeExecutorFactory {
  private variableAdapter: VariableServiceAdapter;
  private variableResolver: VariableResolver;
  private workTaskAdapter: WorkTaskServiceAdapter;
  private executeNodeCallback: (node: WorkflowNode, context: ExecutionContext, workflow: Workflow) => Promise<any>;
  
  // 缓存创建的执行器实例
  private executors: Record<NodeType, NodeExecutor> = {} as Record<NodeType, NodeExecutor>;
  
  constructor(
    variableAdapter: VariableServiceAdapter,
    variableResolver: VariableResolver,
    workTaskAdapter: WorkTaskServiceAdapter,
    executeNodeCallback: (node: WorkflowNode, context: ExecutionContext, workflow: Workflow) => Promise<any>
  ) {
    this.variableAdapter = variableAdapter;
    this.variableResolver = variableResolver;
    this.workTaskAdapter = workTaskAdapter;
    this.executeNodeCallback = executeNodeCallback;
    
    // 初始化各种执行器
    this.executors[NodeType.START] = new StartNodeExecutor();
    this.executors[NodeType.WORK_TASK] = new WorkTaskNodeExecutor(workTaskAdapter, variableResolver);
    this.executors[NodeType.ASSIGNMENT] = new AssignmentNodeExecutor(variableAdapter);
    this.executors[NodeType.DISPLAY] = new DisplayNodeExecutor(variableAdapter);
    // LoopNodeExecutor在获取时创建，因为它需要执行引擎的回调
  }
  
  /**
   * 获取节点执行器
   * @param nodeType 节点类型
   * @returns 节点执行器实例
   */
  getExecutor(nodeType: NodeType): NodeExecutor {
    // 循环节点需要特殊处理，因为它依赖执行引擎的executeNode方法
    if (nodeType === NodeType.LOOP) {
      return new LoopNodeExecutor(this.variableAdapter, this.executeNodeCallback);
    }
    
    // 获取缓存的执行器实例
    const executor = this.executors[nodeType];
    
    if (!executor) {
      throw new Error(`不支持的节点类型: ${nodeType}`);
    }
    
    return executor;
  }
}
