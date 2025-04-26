/**
 * 工作流引擎类型定义
 */

// 工作流基本信息
export interface Workflow {
  id: string;           // 工作流唯一ID
  name: string;         // 工作流名称
  description?: string; // 工作流描述
  nodes: Node[];        // 节点列表
  edges: Edge[];        // 边列表
  createTime?: string;  // 创建时间
  updateTime?: string;  // 更新时间
}

// 节点基本类型
export interface Node {
  id: string;           // 节点唯一ID
  type: string;         // 节点类型
  name: string;         // 节点名称
  position: Position;   // 节点位置
  config?: any;         // 节点配置
  style?: any;          // 节点样式
}

// 执行节点类型
export interface ExecutionNode extends Node {
  status: 'waiting' | 'executing' | 'completed' | 'error' | 'syncing'; // 添加'syncing'状态
  output?: NodeOutput;  // 节点输出
  error?: Error;        // 错误信息
  executionData?: ExecutionData; // 执行数据
}

// 位置类型
export interface Position {
  x: number;
  y: number;
}

// 边类型
export interface Edge {
  id: string;           // 边唯一ID
  source: string;       // 源节点ID
  target: string;       // 目标节点ID
  type?: string;        // 边类型
  label?: string;       // 边标签
  animated?: boolean;   // 是否动画
  style?: any;          // 边样式
  markerEnd?: any;      // 边结束标记
}

// 节点状态类型
export type NodeStatus = 'waiting' | 'executing' | 'completed' | 'error' | 'syncing';

// 节点输出基类
export interface NodeOutput {
  [key: string]: any;   // 节点输出可以是任意类型
}

// 工作任务节点输出
export interface WorkTaskNodeOutput extends NodeOutput {
  taskId: string;       // 任务ID
  workTaskId?: string;  // 工作任务ID（兼容旧版）
  taskName: string;     // 任务名称
  npc?: string;         // NPC名称
  status: {             // 任务状态
    progress: number;   // 进度（0-100）
    state: 'running' | 'completed' | 'error' | 'syncing'; // 添加'syncing'状态
  };
}

// 显示节点输出
export interface DisplayNodeOutput extends NodeOutput {
  title?: string;       // 标题
  content?: string;     // 内容
  html?: string;        // HTML内容
  theme?: 'light' | 'dark'; // 主题
}

// 赋值节点输出
export interface AssignmentNodeOutput extends NodeOutput {
  assignments?: Array<{  // 赋值列表
    sourceDisplayId: string; // 源变量显示ID
    targetDisplayId: string; // 目标变量显示ID
    value: any;         // 值
  }>;
  variableContext?: {   // 变量上下文
    variables: Record<string, any>;  // 变量映射
    displayIdMap: Record<string, string>; // 显示ID映射
    variableTypes: Record<string, string>; // 变量类型映射
  };
}

// 循环节点输出
export interface LoopNodeOutput extends NodeOutput {
  conditionType: 'runCount' | 'variableValue'; // 条件类型
  runCount?: number;    // 当前运行次数
  maxRuns?: number;     // 最大运行次数
  variablePath?: string; // 变量路径
  variableValue?: any;  // 变量值
  result?: 'yes' | 'no'; // 条件结果
  loopStatus?: 'continue' | 'break'; // 循环状态
}

// 执行数据
export interface ExecutionData {
  variables: Record<string, any>; // 变量集合
  startTime?: number;   // 开始时间
  endTime?: number;     // 结束时间
  runCount?: number;    // 循环节点运行次数 - 添加循环计数支持
}

// 变量类型
export interface Variable {
  id: string;           // 变量ID
  name: string;         // 变量名称
  value: any;           // 变量值
  type: string;         // 变量类型
}
