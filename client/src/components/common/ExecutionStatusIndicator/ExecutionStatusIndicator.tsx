import React, { useEffect } from 'react';
import { Tag, Tooltip, Badge, Steps, Card, Typography, Space } from 'antd';
import { 
  LoadingOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  PauseCircleOutlined,
  FormOutlined,
  SwapOutlined,
  CloudServerOutlined,
  SyncOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { ExecutionPhase, getPhaseColor, getPhaseDescription, getPhaseShortDescription } from './executionTypes';

const { Text } = Typography;
const { Step } = Steps;

interface ExecutionStatusIndicatorProps {
  phase: ExecutionPhase;
  simplified?: boolean; // 是否使用简化模式（适用于卡片）
  size?: 'small' | 'default' | 'large';
  showPhaseDescription?: boolean;
  duration?: number; // 执行时长（毫秒）
  onComplete?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 执行状态指示器组件
 * 显示任务执行状态，支持简化模式和详细模式
 */
const ExecutionStatusIndicator: React.FC<ExecutionStatusIndicatorProps> = ({
  phase = ExecutionPhase.IDLE,
  simplified = false,
  size = 'default',
  showPhaseDescription = false,
  duration,
  onComplete,
  style,
  className
}) => {
  // 在完成状态时触发回调
  useEffect(() => {
    if (phase === ExecutionPhase.COMPLETED && onComplete) {
      onComplete();
    }
  }, [phase, onComplete]);

  // 根据执行阶段获取对应的图标
  const getPhaseIconComponent = (phase: ExecutionPhase) => {
    switch (phase) {
      case ExecutionPhase.IDLE:
        return <PauseCircleOutlined />;
      case ExecutionPhase.PREPARING:
        return <FormOutlined />;
      case ExecutionPhase.STATE_TRANSITION:
        return <SwapOutlined />;
      case ExecutionPhase.API_CALLING:
        return <CloudServerOutlined />;
      case ExecutionPhase.PROCESSING_RESPONSE:
        return <SyncOutlined spin />;
      case ExecutionPhase.UPDATING_STATE:
        return <ReloadOutlined spin />;
      case ExecutionPhase.COMPLETED:
        return <CheckCircleOutlined />;
      case ExecutionPhase.ERROR:
        return <CloseCircleOutlined />;
      default:
        return <LoadingOutlined />;
    }
  };

  // 获取步骤状态 - 基于索引而不是枚举值比较
  const getStepStatus = (currentPhase: ExecutionPhase, stepPhase: ExecutionPhase) => {
    // 获取步骤在数组中的索引
    const steps = [
      ExecutionPhase.PREPARING,
      ExecutionPhase.STATE_TRANSITION,
      ExecutionPhase.API_CALLING,
      ExecutionPhase.PROCESSING_RESPONSE,
      ExecutionPhase.UPDATING_STATE, // 添加更新状态阶段
      ExecutionPhase.COMPLETED
    ];
    
    const currentIndex = steps.indexOf(currentPhase);
    const stepIndex = steps.indexOf(stepPhase);
    
    // 处理错误状态
    if (currentPhase === ExecutionPhase.ERROR) {
      // 获取错误发生前最后执行的阶段（从模拟错误函数可知是API_CALLING）
      const errorOccurredAtIndex = steps.indexOf(ExecutionPhase.API_CALLING);
      
      if (stepIndex <= errorOccurredAtIndex) {
        // 错误发生的步骤显示为错误状态，之前的步骤显示为完成状态
        return stepIndex === errorOccurredAtIndex ? 'error' : 'finish';
      } else {
        // 错误之后的步骤显示为等待状态
        return 'wait';
      }
    }
    
    // 基于索引比较
    if (stepIndex < currentIndex) {
      return 'finish';
    } else if (stepIndex === currentIndex) {
      return 'process';
    } else {
      return 'wait';
    }
  };

  // 简化版的执行状态指示器 - 只使用点状进度，无连接线
  if (simplified) {
    // 获取步骤配置和状态
    const steps = [
      ExecutionPhase.PREPARING,
      ExecutionPhase.STATE_TRANSITION,
      ExecutionPhase.API_CALLING,
      ExecutionPhase.PROCESSING_RESPONSE,
      ExecutionPhase.UPDATING_STATE,
      ExecutionPhase.COMPLETED
    ];
    
    return (
      <Tooltip title={getPhaseDescription(phase)}>
        <Space style={{ ...style }} className={className} align="center">
          {/* 只显示点的进度条 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {steps.map((stepPhase, index) => {
              // 获取点的状态和颜色
              const status = getStepStatus(phase, stepPhase);
              let color = '#d9d9d9'; // 默认等待状态灰色
              if (status === 'finish') {
                color = '#1890ff'; // 完成状态蓝色
              } else if (status === 'process') {
                color = '#1890ff'; // 当前状态蓝色
              } else if (status === 'error') {
                color = '#f5222d'; // 错误状态红色
              }
              
              return (
                // 只保留点，移除连接线
                <div 
                  key={index}
                  style={{
                    width: size === 'small' ? 6 : size === 'large' ? 10 : 8,
                    height: size === 'small' ? 6 : size === 'large' ? 10 : 8,
                    borderRadius: '50%',
                    backgroundColor: color,
                    transition: 'background-color 0.3s',
                    margin: '0 3px', // 点之间加点间距
                  }}
                />
              );
            })}
          </div>
          
          {/* 右侧文字和图标 */}
          <Text
            style={{
              color: getPhaseColor(phase),
              fontSize: size === 'small' ? 12 : size === 'large' ? 16 : 14,
              marginLeft: 8,
            }}
          >
            <Space size="small">
              {getPhaseIconComponent(phase)}
              {showPhaseDescription && getPhaseShortDescription(phase)}
              {duration && phase === ExecutionPhase.COMPLETED && (
                <Text type="secondary" style={{ fontSize: 12 }}>{`(${(
                  duration / 1000
                ).toFixed(1)}秒)`}</Text>
              )}
            </Space>
          </Text>
        </Space>
      </Tooltip>
    );
  }

  // 详细版的执行状态指示器 - 使用Steps组件展示完整流程
  const stepsConfig = [
    { phase: ExecutionPhase.PREPARING, title: '准备数据', description: '收集编辑器内容和表单数据' },
    { phase: ExecutionPhase.STATE_TRANSITION, title: '状态转换', description: '设置UI为执行中状态' },
    { phase: ExecutionPhase.API_CALLING, title: 'API调用', description: '调用AI服务生成结果' },
    { phase: ExecutionPhase.PROCESSING_RESPONSE, title: '处理响应', description: '解析响应数据' },
    { phase: ExecutionPhase.UPDATING_STATE, title: '更新状态', description: '更新应用状态数据' }, // 添加更新状态阶段
    { phase: ExecutionPhase.COMPLETED, title: '完成', description: '显示生成结果' },
  ];

  return (
    <Card 
      size="small" 
      title={
        <Space>
          {getPhaseIconComponent(phase)}
          <Text strong>任务执行状态</Text>
          {duration && phase === ExecutionPhase.COMPLETED && (
            <Text type="secondary">{`完成用时: ${(duration / 1000).toFixed(1)}秒`}</Text>
          )}
        </Space>
      }
      style={{ ...style, width: '100%' }}
      className={className}
    >
      <Steps 
        current={stepsConfig.findIndex(step => step.phase === phase)} 
        status={phase === ExecutionPhase.ERROR ? 'error' : 'process'}
        size={size === 'large' ? 'default' : 'small'}
        progressDot
      >
        {stepsConfig.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            description={showPhaseDescription ? step.description : undefined}
            status={getStepStatus(phase, step.phase)}
          />
        ))}
      </Steps>
    </Card>
  );
};

export default ExecutionStatusIndicator;
