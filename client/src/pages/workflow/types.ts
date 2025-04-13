/**
 * 执行节点状态
 */
export type ExecutionNodeStatus = 'waiting' | 'executing' | 'completed' | 'error';

/**
 * 执行节点类型
 * 注意: 统一使用前端命名习惯 - 'assign'代替'assignment', 'worktask'代替'workTask'
 */
export type ExecutionNodeType = 'start' | 'worktask' | 'display' | 'assign' | 'loop';

/**
 * 执行节点接口
 */
export interface ExecutionNode {
  id: string;
  type: ExecutionNodeType;
  name: string;
  icon: React.ReactNode;
  config: any;
  status: ExecutionNodeStatus;
  output?: any;
  nextNodeId?: string;
  executionData?: any;
}

/**
 * 工作流节点配置
 */
export interface WorkflowNodeConfig {
  [key: string]: any;
}

/**
 * 工作流连接
 */
export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

/**
 * 工作流结构
 */
export interface WorkflowStructure {
  nodes: {
    id: string;
    type: string;
    name: string;
    config: WorkflowNodeConfig;
  }[];
  connections: WorkflowConnection[];
  metadata?: {
    edges?: string | any[];
    [key: string]: any;
  };
}

/**
 * 工作任务节点输出
 */
export interface WorkTaskNodeOutput {
  npc?: string;
  taskName: string;
  status?: {
    progress: number;
    state: 'running' | 'completed' | 'error';
  };
}

/**
 * 展示节点输出
 */
export interface DisplayNodeOutput {
  content: string;
  animationComplete: boolean;
}

/**
 * 赋值节点输出
 */
export interface AssignmentNodeOutput {
  assignments: {
    sourceDisplayId: string;
    targetDisplayId: string;
    value: string;
    rawValue?: string; // 原始值字段，用于调试和检查解析过程
    variableContext?: {
      // 完整的变量上下文，用于后续解析
      sourceRaw?: string;     // 源变量标识符原始值
      targetRaw?: string;     // 目标变量标识符原始值
      variables: Record<string, any>; // 变量上下文
    }
  }[];
  // 添加完整变量上下文信息
  variableContext?: {
    variables: Record<string, any>; // 所有变量的键值映射
    displayIdMap?: Record<string, string>; // 系统标识符到显示标识符的映射
    variableTypes?: Record<string, string>; // 变量标识符到变量类型的映射
  };
}

/**
 * 循环节点输出
 */
export interface LoopNodeOutput {
  conditionType: 'runCount' | 'variableValue';
  runCount?: number;
  maxRuns?: number;
  variablePath?: string;
  expectedValue?: string;
  actualValue?: string;
  result: 'yes' | 'no';
}
