/**
 * 执行阶段枚举，用于跟踪任务执行到哪一步
 */
export enum ExecutionPhase {
  IDLE = '空闲',
  PREPARING = '准备数据',    // 收集编辑器内容和表单数据
  STATE_TRANSITION = '状态转换', // 设置UI为执行中状态  
  API_CALLING = 'API调用中',    // 调用AI服务生成结果
  PROCESSING_RESPONSE = '处理响应', // 解析响应
  UPDATING_STATE = '更新状态',   // 更新状态
  COMPLETED = '已完成',       // 显示生成结果
  ERROR = '发生错误'
}

/**
 * 获取执行阶段对应的颜色
 * @param phase 执行阶段
 * @returns 对应的主题色
 */
export const getPhaseColor = (phase: ExecutionPhase): string => {
  switch (phase) {
    case ExecutionPhase.IDLE:
      return '#d9d9d9'; // 浅灰色
    case ExecutionPhase.PREPARING:
    case ExecutionPhase.STATE_TRANSITION:
      return '#1890ff'; // 蓝色
    case ExecutionPhase.API_CALLING:
      return '#722ed1'; // 紫色
    case ExecutionPhase.PROCESSING_RESPONSE:
    case ExecutionPhase.UPDATING_STATE:
      return '#13c2c2'; // 青色
    case ExecutionPhase.COMPLETED:
      return '#52c41a'; // 绿色
    case ExecutionPhase.ERROR:
      return '#f5222d'; // 红色
    default:
      return '#d9d9d9';
  }
};

/**
 * 获取执行阶段对应的图标名称
 * @param phase 执行阶段
 * @returns 对应的图标名称
 */
export const getPhaseIcon = (phase: ExecutionPhase): string => {
  switch (phase) {
    case ExecutionPhase.IDLE:
      return 'pause-circle';
    case ExecutionPhase.PREPARING:
      return 'form';
    case ExecutionPhase.STATE_TRANSITION:
      return 'swap';
    case ExecutionPhase.API_CALLING:
      return 'cloud-server';
    case ExecutionPhase.PROCESSING_RESPONSE:
      return 'file-sync';
    case ExecutionPhase.UPDATING_STATE:
      return 'reload';
    case ExecutionPhase.COMPLETED:
      return 'check-circle';
    case ExecutionPhase.ERROR:
      return 'close-circle';
    default:
      return 'question-circle';
  }
};

/**
 * 获取执行阶段对应的简短描述
 * @param phase 执行阶段
 * @returns 简短描述文本
 */
export const getPhaseShortDescription = (phase: ExecutionPhase): string => {
  switch (phase) {
    case ExecutionPhase.IDLE:
      return '等待执行';
    case ExecutionPhase.PREPARING:
      return '准备数据';
    case ExecutionPhase.STATE_TRANSITION:
      return '状态转换';
    case ExecutionPhase.API_CALLING:
      return 'API调用中';
    case ExecutionPhase.PROCESSING_RESPONSE:
      return '处理响应';
    case ExecutionPhase.UPDATING_STATE:
      return '更新状态';
    case ExecutionPhase.COMPLETED:
      return '执行完成';
    case ExecutionPhase.ERROR:
      return '执行出错';
    default:
      return '未知状态';
  }
};

/**
 * 获取执行阶段对应的详细描述
 * @param phase 执行阶段
 * @returns 详细描述文本
 */
export const getPhaseDescription = (phase: ExecutionPhase): string => {
  switch (phase) {
    case ExecutionPhase.IDLE:
      return '任务空闲中，等待执行';
    case ExecutionPhase.PREPARING:
      return '正在收集编辑器内容和表单数据';
    case ExecutionPhase.STATE_TRANSITION:
      return '正在设置UI为执行中状态';
    case ExecutionPhase.API_CALLING:
      return '正在调用AI服务生成结果';
    case ExecutionPhase.PROCESSING_RESPONSE:
      return '正在解析响应数据';
    case ExecutionPhase.UPDATING_STATE:
      return '正在更新状态数据';
    case ExecutionPhase.COMPLETED:
      return '已完成任务并显示生成结果';
    case ExecutionPhase.ERROR:
      return '执行过程中发生错误';
    default:
      return '未知执行状态';
  }
};

/**
 * 执行信息跟踪接口
 */
export interface ExecutionTrackInfo {
  startTime: number;
  endTime?: number;
  duration?: number;
  apiCallDuration?: number;
  result?: any;
  error?: any;
}
