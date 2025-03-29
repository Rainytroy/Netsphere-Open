import React, { useState } from 'react';
import { Card, Button, Divider, Space, Typography, Row, Col, Select, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ExecutionStatusIndicator, ExecutionPhase } from '../../../components/common/ExecutionStatusIndicator';
import WorkflowExecutionIndicator from '../../../components/workflow/WorkflowExecutionIndicator';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * 执行状态指示器演示页面
 * 用于展示不同模式下的执行状态指示器组件
 */
const ExecutionStatusDemoPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 返回工作任务列表页面
  const goBack = () => {
    navigate('/task');
  };
  
  // 当前选择的执行阶段
  const [currentPhase, setCurrentPhase] = useState<ExecutionPhase>(ExecutionPhase.IDLE);
  // 模拟执行的状态
  const [executing, setExecuting] = useState<boolean>(false);
  // 执行持续时间（毫秒）
  const [duration, setDuration] = useState<number | null>(null);
  // 模拟工作流对象
  const mockWorkflow = {
    id: 'demo-workflow-1',
    name: '演示工作流',
    description: '用于演示执行状态指示器的工作流',
    metadata: {}, // 工作流必需的元数据字段
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true
  };

  // 处理执行阶段变更
  const handlePhaseChange = (phase: ExecutionPhase) => {
    setCurrentPhase(phase);
  };

  // 模拟执行过程
  const simulateExecution = async () => {
    if (executing) return;
    
    setExecuting(true);
    setDuration(null);
    
    const startTime = Date.now();
    
    // 按顺序设置执行阶段
    setCurrentPhase(ExecutionPhase.PREPARING);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCurrentPhase(ExecutionPhase.STATE_TRANSITION);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCurrentPhase(ExecutionPhase.API_CALLING);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setCurrentPhase(ExecutionPhase.PROCESSING_RESPONSE);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCurrentPhase(ExecutionPhase.UPDATING_STATE);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCurrentPhase(ExecutionPhase.COMPLETED);
    const endTime = Date.now();
    setDuration(endTime - startTime);
    
    // 5秒后重置状态
    setTimeout(() => {
      setExecuting(false);
      setCurrentPhase(ExecutionPhase.IDLE);
      setDuration(null);
    }, 5000);
  };

  // 模拟执行失败
  const simulateError = async () => {
    if (executing) return;
    
    setExecuting(true);
    setDuration(null);
    
    const startTime = Date.now();
    
    setCurrentPhase(ExecutionPhase.PREPARING);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCurrentPhase(ExecutionPhase.API_CALLING);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setCurrentPhase(ExecutionPhase.ERROR);
    const endTime = Date.now();
    setDuration(endTime - startTime);
    
    // 5秒后重置状态
    setTimeout(() => {
      setExecuting(false);
      setCurrentPhase(ExecutionPhase.IDLE);
      setDuration(null);
    }, 5000);
  };

  return (
    <div className="execution-status-demo-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              执行状态指示器组件演示
            </Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>

      <div style={{ padding: 0, maxWidth: 1200, margin: '0 auto' }}>
        <Paragraph>
          本页面展示了执行状态指示器组件的不同使用方式，包括详细模式和简化模式。
          这些组件可用于显示任务执行的不同阶段，尤其适用于长时间运行的异步操作。
        </Paragraph>
        
        <Alert
          message="组件特性"
          description="执行状态指示器支持多种执行阶段，可以显示执行进度、状态和持续时间，适用于工作流执行、API调用等场景。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card title="手动控制执行阶段">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Text>当前执行阶段:</Text>
                  <Select 
                    value={currentPhase} 
                    onChange={handlePhaseChange}
                    style={{ width: 200 }}
                    disabled={executing}
                  >
                    <Option value={ExecutionPhase.IDLE}>空闲</Option>
                    <Option value={ExecutionPhase.PREPARING}>准备数据</Option>
                    <Option value={ExecutionPhase.STATE_TRANSITION}>状态转换</Option>
                    <Option value={ExecutionPhase.API_CALLING}>API调用中</Option>
                    <Option value={ExecutionPhase.PROCESSING_RESPONSE}>处理响应</Option>
                    <Option value={ExecutionPhase.UPDATING_STATE}>更新状态</Option>
                    <Option value={ExecutionPhase.COMPLETED}>已完成</Option>
                    <Option value={ExecutionPhase.ERROR}>发生错误</Option>
                  </Select>
                  <Button 
                    type="primary" 
                    onClick={simulateExecution}
                    disabled={executing}
                  >
                    模拟执行过程
                  </Button>
                  <Button 
                    danger 
                    onClick={simulateError}
                    disabled={executing}
                  >
                    模拟执行失败
                  </Button>
                </Space>
                
                <Divider orientation="left">详细模式</Divider>
                <ExecutionStatusIndicator 
                  phase={currentPhase}
                  simplified={false}
                  showPhaseDescription={true}
                  duration={duration || undefined}
                />
                
                <Divider orientation="left">简化模式</Divider>
                <ExecutionStatusIndicator 
                  phase={currentPhase}
                  simplified={true}
                  showPhaseDescription={true}
                  size="default"
                  duration={duration || undefined}
                />
                
                <Divider orientation="left">工作流卡片中的显示方式</Divider>
                <div style={{ maxWidth: 300 }}>
                  <WorkflowExecutionIndicator 
                    workflow={mockWorkflow}
                    executing={executing}
                    phase={currentPhase}
                    duration={duration || undefined}
                  />
                </div>
              </Space>
            </Card>
          </Col>
          
          <Col span={24}>
            <Card title="不同大小的简化模式">
              <Space size="large">
                <div>
                  <Text type="secondary">小尺寸:</Text>
                  <div style={{ marginTop: 8 }}>
                    <ExecutionStatusIndicator 
                      phase={currentPhase}
                      simplified={true}
                      showPhaseDescription={false}
                      size="small"
                      duration={duration || undefined}
                    />
                  </div>
                </div>
                
                <div>
                  <Text type="secondary">默认尺寸:</Text>
                  <div style={{ marginTop: 8 }}>
                    <ExecutionStatusIndicator 
                      phase={currentPhase}
                      simplified={true}
                      showPhaseDescription={true}
                      size="default"
                      duration={duration || undefined}
                    />
                  </div>
                </div>
                
                <div>
                  <Text type="secondary">大尺寸:</Text>
                  <div style={{ marginTop: 8 }}>
                    <ExecutionStatusIndicator 
                      phase={currentPhase}
                      simplified={true}
                      showPhaseDescription={true}
                      size="large"
                      duration={duration || undefined}
                    />
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
        
        <Divider />
        
        <Typography.Title level={3} style={{ marginTop: 32 }}>使用指南</Typography.Title>
        <Typography.Paragraph>
          1. <Text code>ExecutionStatusIndicator</Text> 通用组件支持详细和简化两种模式
        </Typography.Paragraph>
        <Typography.Paragraph>
          2. <Text code>WorkflowExecutionIndicator</Text> 是为工作流卡片优化的组件
        </Typography.Paragraph>
        <Typography.Paragraph>
          3. 所有组件都支持显示执行持续时间和自定义样式
        </Typography.Paragraph>
      </div>
    </div>
  );
};

export default ExecutionStatusDemoPage;
