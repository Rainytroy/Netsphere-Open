import React, { useState } from 'react';
import { Card, Typography, Divider, Button, Space, message } from 'antd';
import { VariableValueDisplay, VariableDetailPanel, ExecutionVariableTransfer, useExecutionVariable } from './index';

const { Title, Text } = Typography;

/**
 * 变量管理组件演示
 * 用于展示变量组件的使用方法和功能
 */
const VariableManagerDemo: React.FC = () => {
  // 演示数据
  const demoVariables = {
    workflowVariable: {
      fullId: 'workflow_abc123_name',
      systemId: '@gv_workflow_abc123_name-=',
      displayId: '@工作流.名称',
      type: 'workflow',
      value: '审批流程测试'
    },
    taskVariable: {
      fullId: 'task_def456_title',
      systemId: '@gv_task_def456_title-=',
      displayId: '@任务.标题',
      type: 'task',
      value: '数据处理任务'
    }
  };

  // 使用Hook获取变量值
  const { 
    loading, 
    error, 
    getVariableValue, 
    updateVariableValue 
  } = useExecutionVariable();

  // 获取变量值演示
  const [demoValue, setDemoValue] = useState<string>('(未获取)');
  const [demoLoading, setDemoLoading] = useState<boolean>(false);

  // 模拟从API获取变量值
  const handleGetValue = async () => {
    setDemoLoading(true);
    
    // 模拟API响应
    setTimeout(() => {
      setDemoValue(demoVariables.workflowVariable.value);
      setDemoLoading(false);
      message.success('获取变量值成功');
    }, 1000);
  };

  // 模拟更新变量值
  const handleUpdateValue = async () => {
    setDemoLoading(true);
    
    // 模拟API响应
    setTimeout(() => {
      const newValue = `审批流程测试 (${new Date().toLocaleTimeString()})`;
      setDemoValue(newValue);
      demoVariables.workflowVariable.value = newValue;
      setDemoLoading(false);
      message.success('更新变量值成功');
    }, 1000);
  };

  return (
    <Card title="变量管理组件演示" style={{ width: '100%', maxWidth: 800, margin: '24px auto' }}>
      <div>
        <Title level={4}>1. 变量值显示组件 (VariableValueDisplay)</Title>
        <div style={{ marginBottom: 16 }}>
          <Text>这个组件用于显示变量的实时值，支持编辑和刷新：</Text>
          <div style={{ padding: '16px', border: '1px solid #f0f0f0', borderRadius: '4px', marginTop: 8 }}>
            <VariableValueDisplay 
              fullId={demoVariables.workflowVariable.fullId}
              systemId={demoVariables.workflowVariable.systemId}
              editable={true}
            />
          </div>
        </div>
        
        <Divider />
        
        <Title level={4}>2. 变量详情面板组件 (VariableDetailPanel)</Title>
        <div style={{ marginBottom: 16 }}>
          <Text>这个组件展示变量的详细信息，包括标识符、类型和值：</Text>
          <div style={{ marginTop: 8 }}>
            <VariableDetailPanel 
              displayId={demoVariables.taskVariable.displayId}
              systemId={demoVariables.taskVariable.systemId}
              fullId={demoVariables.taskVariable.fullId}
              variableType={demoVariables.taskVariable.type}
              editable={true}
            />
          </div>
        </div>
        
        <Divider />
        
        <Title level={4}>3. 变量传递组件 (ExecutionVariableTransfer)</Title>
        <div style={{ marginBottom: 16 }}>
          <Text>这个组件展示变量传递关系，包括源变量和目标变量：</Text>
          <div style={{ marginTop: 8 }}>
            <ExecutionVariableTransfer 
              sourceDisplayId={demoVariables.workflowVariable.displayId}
              sourceSystemId={demoVariables.workflowVariable.systemId}
              sourceFullId={demoVariables.workflowVariable.fullId}
              sourceType={demoVariables.workflowVariable.type}
              
              targetDisplayId={demoVariables.taskVariable.displayId}
              targetSystemId={demoVariables.taskVariable.systemId}
              targetFullId={demoVariables.taskVariable.fullId}
              targetType={demoVariables.taskVariable.type}
              
              transferValue={demoVariables.workflowVariable.value}
              
              editable={true}
            />
          </div>
        </div>
        
        <Divider />
        
        <Title level={4}>4. 变量操作Hook (useExecutionVariable)</Title>
        <div style={{ marginBottom: 16 }}>
          <Text>使用这个Hook可以直接获取和更新变量值：</Text>
          <div style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>变量值: </Text>
                <Text code>{demoLoading ? '加载中...' : demoValue}</Text>
              </div>
              <Space>
                <Button 
                  type="primary" 
                  onClick={handleGetValue} 
                  loading={demoLoading}
                >
                  获取变量值
                </Button>
                <Button 
                  onClick={handleUpdateValue} 
                  loading={demoLoading}
                >
                  更新变量值
                </Button>
              </Space>
            </Space>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VariableManagerDemo;
