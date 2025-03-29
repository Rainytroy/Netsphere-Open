import * as React from 'react';
import WorkTaskFormRefactored from './WorkTaskForm.refactored';

/**
 * 工作任务表单组件 - 代理版本
 * 这个组件仅作为代理，转发props到重构后的WorkTaskForm组件
 */
const WorkTaskForm: React.FC<any> = (props) => {
  return <WorkTaskFormRefactored {...props} />;
};

export default WorkTaskForm;
