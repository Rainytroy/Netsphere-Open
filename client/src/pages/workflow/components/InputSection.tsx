import React from 'react';
import { Typography, Card, Input, Button, Col, Tooltip, Space, Badge } from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  ReloadOutlined,
  CaretRightOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Workflow } from '../../../services/workflowService';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface InputSectionProps {
  workflow: Workflow;
  userInput: string;
  setUserInput: (input: string) => void;
  isRunning: boolean;
  isInitializing: boolean;
  onRun: () => void;
  onStop: () => void;
  onRestart?: () => void; // 重新开始函数
  executionNodes?: any[]; // 执行节点数组
  executionComplete?: boolean; // 执行完成状态
  userStoppedExecution?: boolean; // 用户主动停止状态标记
}

/**
 * 工作流用户输入区域组件
 * 增强版：支持继续执行和重新运行
 */
const InputSection: React.FC<InputSectionProps> = ({
  workflow,
  userInput,
  setUserInput,
  isRunning,
  isInitializing,
  onRun,
  onStop,
  onRestart,
  executionNodes = [],
  executionComplete = false,
  userStoppedExecution = false
}) => {
  // 检查是否有暂停的工作流可以继续执行
  // 关键修改：必须是用户主动停止的才显示继续和重启按钮
  const hasPausedWorkflow = !isRunning && 
                           executionNodes.length > 0 && 
                           !executionComplete && 
                           userStoppedExecution;

  console.log('[InputSection] 状态:', {
    isRunning,
    nodesCount: executionNodes.length,
    executionComplete,
    userStoppedExecution,
    hasPausedWorkflow
  });
  
  // 确定按钮文本和提示
  const getButtonText = () => {
    if (isRunning) return '停止';
    if (isInitializing) return '初始化中...';
    if (hasPausedWorkflow) return '继续';
    return '运行';
  };
  
  // 获取按钮图标
  const getButtonIcon = () => {
    if (isRunning) return <StopOutlined />;
    if (hasPausedWorkflow) return <CaretRightOutlined />;
    return <PlayCircleOutlined />;
  };
  
  // 获取按钮类型和颜色
  const getButtonProps = () => {
    if (isRunning) {
      return { type: 'primary', danger: true };
    }
    if (hasPausedWorkflow) {
      return { type: 'primary', style: { backgroundColor: '#52c41a' } };
    }
    return { type: 'primary' };
  };
  return (
    <Col span={8} style={{ height: '100%', padding: '0 12px 0 0' }}>
      <Card 
        title={<Title level={4} style={{ margin: 0 }}>用户输入</Title>}
        bordered={true}
        style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none'
        }}
        bodyStyle={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'auto'
        }}
      >
        <div style={{ flex: 1 }}>
          <Paragraph>
            {workflow.description || '请在下方输入框中提供您的需求'}
          </Paragraph>
          <TextArea
            placeholder="请输入内容..."
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            autoSize={{ minRows: 6, maxRows: 12 }}
            disabled={isRunning}
          />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              {hasPausedWorkflow && !isRunning && (
                <Tooltip title="有未完成的工作流执行">
                  <Badge status="processing" color="#52c41a" />
                </Tooltip>
              )}
              
              <Button 
                {...getButtonProps() as any}
                onClick={isRunning ? onStop : onRun}
                loading={isInitializing}
                disabled={isInitializing}
                icon={getButtonIcon()}
              >
                {getButtonText()}
              </Button>
              
              {hasPausedWorkflow && !isRunning && (
                <Tooltip title="重新开始工作流">
                  <Button 
                    onClick={onRestart}
                    icon={<ReloadOutlined />}
                    type="default"
                  >
                    重新开始
                  </Button>
                </Tooltip>
              )}
            </Space>
          </div>
        </div>
      </Card>
    </Col>
  );
};

export default InputSection;
