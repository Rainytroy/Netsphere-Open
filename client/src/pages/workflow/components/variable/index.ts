/**
 * 变量管理组件导出文件
 * 将所有变量相关组件集中导出
 */

// 变量值显示组件
export { default as VariableValueDisplay } from './VariableValueDisplay';

// 变量详情面板组件
export { default as VariableDetailPanel } from './VariableDetailPanel';

// 变量传递组件
export { default as ExecutionVariableTransfer } from './ExecutionVariableTransfer';

// 变量操作hook
export { default as useExecutionVariable } from './useExecutionVariable';

// 类型导出
export type { VariableOperationResult } from './useExecutionVariable';
