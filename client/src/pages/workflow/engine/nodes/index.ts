/**
 * 节点执行器模块入口
 */

// 导出所有节点处理器
export * from './BaseNode';
export * from './StartNode';
export * from './WorkTaskNode';
export * from './DisplayNode';
export * from './AssignmentNode';
export * from './LoopNode';

// 导出节点处理器类型映射
import { StartNodeHandler } from './StartNode';
import { WorkTaskNodeHandler } from './WorkTaskNode';
import { DisplayNodeHandler } from './DisplayNode';
import { AssignmentNodeHandler } from './AssignmentNode';
import { LoopNodeHandler } from './LoopNode';
import { NodeHandler } from './BaseNode';
import { ExecutionNodeType } from '../../types';

/**
 * 节点处理器映射表
 * 用于根据节点类型获取对应的处理器
 */
export const nodeHandlers: Record<ExecutionNodeType, NodeHandler> = {
  start: new StartNodeHandler(),
  worktask: new WorkTaskNodeHandler(),
  display: new DisplayNodeHandler(),
  assign: new AssignmentNodeHandler(),
  loop: new LoopNodeHandler()
};
