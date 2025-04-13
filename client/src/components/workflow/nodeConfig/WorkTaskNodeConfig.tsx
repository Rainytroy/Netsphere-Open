import React, { useState, useEffect } from 'react';
import { Card, Typography, Divider, Descriptions, Tag, Spin, Button, Space, Alert, Form } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { NodeConfigProps } from './NodeConfigInterface';
import workTaskService from '../../../services/workTaskService';

const { Title, Text } = Typography;

// 扩展NodeConfigProps，添加workTaskId
interface WorkTaskNodeConfigProps extends NodeConfigProps {
  workTaskId: string;
}

/**
 * 工作任务卡配置组件
 * 展示工作任务的详细信息，不提供编辑功能
 */
const WorkTaskNodeConfig: React.FC<WorkTaskNodeConfigProps> = ({
  nodeId,
  initialConfig,
  onSave,
  workTaskId
}) => {
  const [loading, setLoading] = useState(true);
  const [workTask, setWorkTask] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载工作任务详情
  useEffect(() => {
    const fetchWorkTask = async () => {
      try {
        setLoading(true);
        const data = await workTaskService.getWorkTaskById(workTaskId);
        setWorkTask(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || '加载工作任务失败');
      } finally {
        setLoading(false);
      }
    };

    if (workTaskId) {
      fetchWorkTask();
    }
  }, [workTaskId]);


  if (loading) {
    return <Spin tip="加载工作任务信息..." />;
  }

  if (error) {
    return (
      <Alert
        message="加载失败"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  if (!workTask) {
    return (
      <Alert
        message="工作任务不存在"
        description={`无法找到ID为 ${workTaskId} 的工作任务`}
        type="warning"
        showIcon
      />
    );
  }

  return (
    <Form
      id={`node-config-form-${nodeId}`}
      onFinish={() => {
        // 保存当前配置，虽然没有可编辑的内容
        const config = {
          ...initialConfig,
          workTaskId
        };
        onSave(nodeId, config);
      }}
    >
      <Alert
        icon={<RobotOutlined />}
        description="工作任务卡仅展示信息，无需配置。工作任务将按照预定义逻辑执行。"
        type="info"
        showIcon={true}
        style={{ marginBottom: 16, background: '#f5f5f5', border: '1px solid #e8e8e8' }}
      />

      <Card bordered={false}>
        <Descriptions title="工作任务信息" bordered column={1}>
          <Descriptions.Item label="名称">{workTask.name}</Descriptions.Item>
          <Descriptions.Item label="关联NPC">{workTask.npc?.name || '无'}</Descriptions.Item>
          <Descriptions.Item label="AI服务">{workTask.aiService?.name || '无'}</Descriptions.Item>
          <Descriptions.Item label="输入提示">
            <Text
              style={{ 
                display: 'block',
                maxHeight: '100px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                background: '#f5f5f5',
                padding: '8px',
                borderRadius: '4px'
              }}
            >
              {workTask.input || '无输入提示'}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Divider />

      <Alert
        message="变量引用"
        description={
          <div>
            <div>此工作任务的输出可通过以下变量引用：</div>
            <Text code>{`@${workTask.name}.output`}</Text>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
    </Form>
  );
};

export default WorkTaskNodeConfig;
