/**
 * 工作流引擎模块入口
 * 负责导出工作流引擎的核心组件和API
 */

// 导出工作流引擎
export { WorkflowEngine } from './WorkflowEngine';

// 导出工具函数
export { parseRawText, parseTemplate } from './utils/VariableParser';
export { buildExecutionFlow } from './utils/FlowBuilder';
export { getNodeIcon, getStatusColor, formatTime } from './utils/UIHelper';

// 导出节点处理器
export * from './nodes';
