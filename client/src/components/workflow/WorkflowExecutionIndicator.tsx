import React, { useState, useEffect } from 'react';
import { Tooltip, Badge, Space, Typography } from 'antd';
import { ExecutionStatusIndicator, getPhaseColor } from '../common/ExecutionStatusIndicator';
import { ExecutionPhase } from '../common/ExecutionStatusIndicator/executionTypes';
import type { Workflow } from '../../services/workflowService';

const { Text } = Typography;

interface WorkflowExecutionIndicatorProps {
  workflow: Workflow;
  executing?: boolean;
  phase?: ExecutionPhase;
  onComplete?: () => void;
  duration?: number; // 毫秒
  style?: React.CSSProperties;
}

/**
 * 工作流执行状态指示器组件
 * 专为工作流卡片设计的轻量级执行状态指示器
 */
const WorkflowExecutionIndicator: React.FC<WorkflowExecutionIndicatorProps> = ({
  workflow,
  executing = false,
  phase = ExecutionPhase.IDLE,
  onComplete,
  duration,
  style
}) => {
  // 记录开始执行的时间
  const [startTime, setStartTime] = useState<number | null>(null);
  // 本地计算的执行时长
  const [localDuration, setLocalDuration] = useState<number | null>(null);
  
  // 当开始执行时，记录开始时间
  useEffect(() => {
    if (executing && phase !== ExecutionPhase.COMPLETED && phase !== ExecutionPhase.ERROR) {
      if (!startTime) {
        setStartTime(Date.now());
      }
    } else if (!executing) {
      setStartTime(null);
      setLocalDuration(null);
    }
  }, [executing, phase, startTime]);
  
  // 当执行完成时，计算总时长
  useEffect(() => {
    if (startTime && (phase === ExecutionPhase.COMPLETED || phase === ExecutionPhase.ERROR)) {
      const endTime = Date.now();
      setLocalDuration(endTime - startTime);
      
      // 如果提供了完成回调，则调用
      if (phase === ExecutionPhase.COMPLETED && onComplete) {
        onComplete();
      }
    }
  }, [phase, startTime, onComplete]);
  
  // 如果不是执行状态，不显示任何内容或仅显示图标
  if (!executing && phase === ExecutionPhase.IDLE) {
    return null;
  }
  
  // 使用简化版的执行状态指示器
  return (
    <ExecutionStatusIndicator
      phase={phase}
      simplified={true}
      size="small"
      showPhaseDescription={false}
      duration={duration || localDuration || undefined}
      onComplete={onComplete}
      style={style}
    />
  );
};

export default WorkflowExecutionIndicator;
