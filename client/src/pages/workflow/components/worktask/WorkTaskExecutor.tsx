import React, { useState, useEffect } from 'react';
import { Typography, Space, Progress } from 'antd';
import axios from 'axios';
import workTaskService from '../../../../services/workTaskService';

const { Text, Paragraph } = Typography;

// 执行阶段枚举
export enum ExecutionPhase {
  IDLE = 'idle',
  PREPARING = 'preparing',
  STATE_TRANSITION = 'stateTransition',
  API_CALLING = 'apiCalling',
  PROCESSING_RESPONSE = 'processingResponse',
  UPDATING_STATE = 'updatingState',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// 接口定义
export interface WorkTaskExecutorProps {
  workTaskId: string;           // 工作任务ID，用于API调用
  taskName: string;             // 工作任务名称，显示用
  npc?: string;                 // 关联的NPC名称（可选）
  autoExecute?: boolean;        // 是否自动执行，默认true
  simplified?: boolean;         // 是否使用简化模式，默认true
  onStatusChange?: (status: {   // 状态变更回调
    phase: ExecutionPhase;
    progress: number;
    message?: string;
  }) => void;
  onComplete?: (output: string) => void; // 完成回调
}

// 工作任务执行器组件
const WorkTaskExecutor: React.FC<WorkTaskExecutorProps> = ({
  workTaskId,
  taskName,
  npc,
  autoExecute = true,
  simplified = true,
  onStatusChange,
  onComplete
}) => {
  // 执行阶段
  const [phase, setPhase] = useState<ExecutionPhase>(ExecutionPhase.IDLE);
  
  // 进度百分比
  const [progress, setProgress] = useState<number>(0);
  
  // 结果输出
  const [output, setOutput] = useState<string>('');
  
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  
  // 执行耗时（毫秒）
  const [duration, setDuration] = useState<number | undefined>(undefined);
  
  // 是否正在执行
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // 更新状态并触发回调
  const updateStatus = (newPhase: ExecutionPhase, newProgress: number, message?: string) => {
    setPhase(newPhase);
    setProgress(newProgress);
    
    if (onStatusChange) {
      onStatusChange({
        phase: newPhase,
        progress: newProgress,
        message
      });
    }
  };

  // 执行工作任务
  const executeTask = async () => {
    if (isExecuting || !workTaskId) return;
    
    // 声明在函数作用域的顶部，使其在整个函数中可见，并立即初始化
    let startTime: number = 0;
    
    try {
      setIsExecuting(true);
      setError(null);
      setDuration(undefined);
      
      startTime = Date.now();
      
      // 更新状态为准备中
      updateStatus(ExecutionPhase.PREPARING, 10);
      
      // 添加小延迟以便UI更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 更新状态为API调用中
      updateStatus(ExecutionPhase.API_CALLING, 30);
      
      // 调用后端API执行工作任务
      const updatedTask = await workTaskService.executeWorkTask(workTaskId);
      
      if (updatedTask) {
        // 更新状态为处理响应
        updateStatus(ExecutionPhase.PROCESSING_RESPONSE, 70);
        
        // 添加小延迟以便UI更新
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 提取任务输出
        const taskOutput = updatedTask.output || '';
        setOutput(taskOutput);
        
        // 计算执行耗时
        const endTime = Date.now();
        setDuration(endTime - startTime);
        
        // 更新状态为已完成
        updateStatus(ExecutionPhase.COMPLETED, 100);
        
        // 触发完成回调
        if (onComplete) {
          onComplete(taskOutput);
        }
      } else {
        throw new Error('未返回有效的工作任务数据');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '执行工作任务时发生错误';
      setError(errorMessage);
      
      // 更新状态为错误
      updateStatus(ExecutionPhase.ERROR, 0, errorMessage);
      
      // 计算执行耗时（即使失败也记录）
      const endTime = Date.now();
      setDuration(endTime - startTime);
    } finally {
      setIsExecuting(false);
    }
  };
  
  // 自动执行
  useEffect(() => {
    if (autoExecute && workTaskId && !isExecuting && phase === ExecutionPhase.IDLE) {
      executeTask();
    }
  }, [workTaskId, autoExecute]);
  
  // 简化模式UI
  if (simplified) {
    return (
      <div className="work-task-executor-simplified">
        {/* 任务信息 */}
        {npc ? (
          <Paragraph>
            <Text strong>{npc}</Text> 负责的 <Text strong>{taskName}</Text> 正在运行
          </Paragraph>
        ) : (
          <Paragraph>
            <Text strong>{taskName}</Text> 正在运行
          </Paragraph>
        )}
        
        {/* 进度条 */}
        <div style={{ marginTop: 8 }}>
          <Progress 
            percent={progress} 
            status={
              phase === ExecutionPhase.COMPLETED ? 'success' : 
              phase === ExecutionPhase.ERROR ? 'exception' : 'active'
            } 
            size="small" 
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
            {phase === ExecutionPhase.COMPLETED ? '任务已完成' : 
             phase === ExecutionPhase.ERROR ? `任务执行出错: ${error || '未知错误'}` : 
             getPhaseDescription(phase)}
          </div>
        </div>
      </div>
    );
  }
  
  // 完整模式UI（更详细的状态显示）
  return (
    <div className="work-task-executor-full">
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 任务信息 */}
        <div>
          {npc ? (
            <Paragraph>
              <Text strong>{npc}</Text> 负责的 <Text strong>{taskName}</Text>
            </Paragraph>
          ) : (
            <Paragraph>
              <Text strong>{taskName}</Text>
            </Paragraph>
          )}
        </div>
        
          {/* 执行进度 */}
        <div className="execution-progress">
          <Progress 
            percent={progress} 
            status={
              phase === ExecutionPhase.COMPLETED ? 'success' : 
              phase === ExecutionPhase.ERROR ? 'exception' : 'active'
            }
          />
          
          <div className="phase-description">
            {getPhaseDescription(phase)}
            {duration && phase === ExecutionPhase.COMPLETED && (
              <span> (用时 {Math.round(duration / 100) / 10} 秒)</span>
            )}
          </div>
        </div>
        
        {/* 错误信息（如果有） */}
        {error && (
          <div style={{ color: '#f5222d', marginTop: 8 }}>
            错误: {error}
          </div>
        )}
        
        {/* 输出结果（如果已完成） */}
        {phase === ExecutionPhase.COMPLETED && output && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">执行结果:</Text>
            <div style={{ 
              background: '#f5f5f5', 
              padding: 8, 
              borderRadius: 4,
              maxHeight: 100,
              overflow: 'auto'
            }}>
              {output}
            </div>
          </div>
        )}
      </Space>
    </div>
  );
};

// 获取阶段描述
const getPhaseDescription = (phase: ExecutionPhase): string => {
  switch (phase) {
    case ExecutionPhase.IDLE:
      return '准备执行';
    case ExecutionPhase.PREPARING:
      return '准备数据中...';
    case ExecutionPhase.STATE_TRANSITION:
      return '状态转换中...';
    case ExecutionPhase.API_CALLING:
      return 'API调用中...';
    case ExecutionPhase.PROCESSING_RESPONSE:
      return '处理响应中...';
    case ExecutionPhase.UPDATING_STATE:
      return '更新状态中...';
    case ExecutionPhase.COMPLETED:
      return '任务已完成';
    case ExecutionPhase.ERROR:
      return '执行出错';
    default:
      return '未知状态';
  }
};

export default WorkTaskExecutor;
