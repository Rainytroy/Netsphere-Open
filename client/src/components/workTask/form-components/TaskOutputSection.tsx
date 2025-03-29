import React from 'react';
import { Button, Typography, FormInstance, Alert, Steps } from 'antd';
import { LoadingOutlined, ThunderboltOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ExecutionStatus, TestExecuteDebugInfo } from '../../../services/workTaskService';
import OutputDisplayPanel from '../OutputDisplayPanel';

const { Title, Text } = Typography;
const { Step } = Steps;

// 执行阶段枚举 - 必须与 useTestExecution 中的定义匹配
enum ExecutionPhase {
  IDLE = '空闲',
  PREPARING = '准备数据',
  STATE_TRANSITION = '状态转换',
  API_CALLING = 'API调用中',
  PROCESSING_RESPONSE = '处理响应',
  UPDATING_STATE = '更新状态',
  COMPLETED = '已完成',
  ERROR = '发生错误'
}

interface TaskOutputSectionProps {
  form: FormInstance;
  taskId?: string;
  testOutput: string;
  executionTime: string;
  executionStatus: ExecutionStatus;
  debugInfo: TestExecuteDebugInfo | null;
  testExecuting: boolean;
  handleTestExecute: () => void; // 修改为只返回void，因为我们使用Promise链
  formatExecutionTime: () => string;
  serverLogs?: string[]; // 仍然接收参数以保持API兼容性，但不再显示
  executionPhase?: string; // 可选的执行阶段显示
}

/**
 * 工作任务输出区域组件
 * 包含测试按钮、执行状态和输出展示
 * 支持显示详细的执行阶段信息
 */
const TaskOutputSection: React.FC<TaskOutputSectionProps> = ({
  form,
  taskId,
  testOutput,
  executionTime,
  executionStatus,
  debugInfo,
  testExecuting,
  handleTestExecute,
  formatExecutionTime,
  serverLogs,
  executionPhase
}) => {
  // 将执行状态映射到步骤
  const getExecutionStepStatus = (currentStatus: ExecutionStatus) => {
    switch (currentStatus) {
      case ExecutionStatus.RUNNING:
        return 'process';
      case ExecutionStatus.COMPLETED:
        return 'finish';
      case ExecutionStatus.FAILED:
        return 'error';
      default:
        return 'wait';
    }
  };
  
  // 根据执行阶段和状态计算当前步骤
  const getCurrentStep = () => {
    if (executionStatus === ExecutionStatus.IDLE) return 0;
    if (executionStatus === ExecutionStatus.FAILED) return 4; // 失败步骤
    
    // 根据执行阶段返回相应步骤
    if (executionPhase === ExecutionPhase.PREPARING) return 0;
    if (executionPhase === ExecutionPhase.STATE_TRANSITION) return 1;
    if (executionPhase === ExecutionPhase.API_CALLING) return 2;
    if (executionPhase === ExecutionPhase.PROCESSING_RESPONSE || 
        executionPhase === ExecutionPhase.UPDATING_STATE) return 3;
    if (executionPhase === ExecutionPhase.COMPLETED) return 4;
    if (executionPhase === ExecutionPhase.ERROR) return 4;
    
    return 0; // 默认
  };
  // 执行步骤定义
  const executionSteps = [
    { title: '准备数据', description: '收集编辑器内容和表单数据' },
    { title: '状态转换', description: '设置UI为执行中状态' },
    { title: 'API调用', description: '调用AI服务生成结果' },
    { title: '处理结果', description: '解析响应和更新状态' },
    { title: '完成', description: '显示生成结果' }
  ];

  return (
    <>
      {/* 输出区域标题和测试按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Title level={5} style={{ margin: 0 }}>输出 / OUTPUT</Title>
        <Button 
          type="primary"
          icon={testExecuting ? <LoadingOutlined /> : <ThunderboltOutlined />}
          onClick={handleTestExecute}
          loading={testExecuting}
          disabled={!form.getFieldValue('aiServiceId')} // 只检查AI服务，不检查npcId
        >
          输出测试
        </Button>
      </div>
      
      {/* 执行状态步骤条 - 当正在执行或完成时显示 */}
      {(executionStatus === ExecutionStatus.RUNNING || 
        executionStatus === ExecutionStatus.COMPLETED || 
        executionStatus === ExecutionStatus.FAILED) && (
        <div className="execution-status-steps" style={{ marginBottom: 16 }}>
          <Steps 
            size="small" 
            current={getCurrentStep()}
            status={getExecutionStepStatus(executionStatus)}
            style={{ marginBottom: 8 }}
            responsive
          >
            {executionSteps.map((step, index) => (
              <Step key={index} title={step.title} description={step.description} />
            ))}
          </Steps>
          
          {/* 执行阶段信息 - 如果可用 */}
          {executionStatus === ExecutionStatus.RUNNING && (
            <Alert
              message={
                <Text strong>
                  当前阶段: {executionPhase || '处理中...'}
                </Text>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          {/* 错误状态提示 */}
          {executionStatus === ExecutionStatus.FAILED && (
            <Alert
              message="执行失败"
              description="测试执行过程中出现错误，请查看控制台日志获取详细信息。"
              type="error"
              showIcon
              icon={<ExclamationCircleOutlined />}
              style={{ marginBottom: 16 }}
            />
          )}
        </div>
      )}
      
      {/* 输出显示面板 - 始终显示，无论是否有输出内容 */}
      <OutputDisplayPanel
        taskId={taskId}
        output={testOutput}
        executionTime={formatExecutionTime()}
        executionStatus={executionStatus}
        debugInfo={debugInfo}
        onRerun={handleTestExecute}
        serverLogs={debugInfo?.serverLogs || serverLogs || []} // 优先使用debugInfo中的服务端日志
      />
    </>
  );
};

export default TaskOutputSection;
