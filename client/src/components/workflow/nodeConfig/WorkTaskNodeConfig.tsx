import React, { useState, useEffect } from 'react';
import { Card, Typography, Divider, Descriptions, Tag, Spin, Button, Space, Alert, Form } from 'antd';
import { RobotOutlined } from '@ant-design/icons';
import { NodeConfigProps } from './NodeConfigInterface';
import workTaskService from '../../../services/workTaskService';
import IdentifierFormatterService from '../../../services/IdentifierFormatterService';
import VariableThemeService from '../../../services/VariableThemeService';

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
  
  // 调试信息 - 输出工作任务原始信息以检查数据结构
  console.log('工作任务详情数据:', workTask);

  return (
    <Form
      id={`node-config-form-${nodeId}`}
      onFinish={() => {
        // 保存当前配置，确保同时保存 workTaskId 和兼容旧版的 taskId
        const config = {
          ...initialConfig,
          workTaskId,
          // 为了向后兼容，保留 taskId
          taskId: workTaskId
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
          {/* 新增：显示工作任务ID */}
          <Descriptions.Item label="任务ID">
            <Text code>{workTaskId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="名称">{workTask.name}</Descriptions.Item>
          {/* 修改：更灵活地处理NPC数据 */}
          <Descriptions.Item label="关联NPC">
            {(() => {
              // 尝试不同可能的数据结构
              if (workTask.npc && typeof workTask.npc === 'object' && workTask.npc.name) {
                return workTask.npc.name;
              } else if (workTask.npc && typeof workTask.npc === 'string') {
                return workTask.npc;
              } else if (workTask.npcName) {
                return workTask.npcName;
              } else {
                return '无';
              }
            })()}
          </Descriptions.Item>
          {/* 修改：更灵活地处理AI服务数据 */}
          <Descriptions.Item label="AI服务">
            {(() => {
              // 尝试不同可能的数据结构
              if (workTask.aiService && typeof workTask.aiService === 'object' && workTask.aiService.name) {
                return workTask.aiService.name;
              } else if (workTask.aiService && typeof workTask.aiService === 'string') {
                return workTask.aiService;
              } else if (workTask.aiServiceName) {
                return workTask.aiServiceName;
              } else {
                return '无';
              }
            })()}
          </Descriptions.Item>
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
        message=""
        description={
          <div>
            <div>此工作任务的输出可通过以下变量引用：</div>
            {/* 使用V3.0标准的变量标识符格式 */}
            <div style={{ 
              display: 'inline-block',
              backgroundColor: '#E3F9D3', // 工作任务标准背景色（绿色）
              border: '1px solid #389E0D', // 工作任务标准边框色（绿色）
              borderRadius: '4px',
              padding: '0px 4px',  // 更紧凑的内边距
              margin: '0px',
              marginTop: '4px'
            }}>
              <Text 
                style={{ 
                  color: '#389E0D'  // 工作任务标准文本颜色（绿色）
                }}
              >
                {IdentifierFormatterService.formatDisplayIdentifier(workTask.name, 'output', workTaskId.substring(0, 8))}
              </Text>
            </div>
          </div>
        }
        type="info"
        showIcon={false} // 去掉图标
        style={{ marginBottom: 16, background: '#F5F5F5', border: '1px solid #E8E8E8' }} // 灰色背景类似起点卡
      />
    </Form>
  );
};

export default WorkTaskNodeConfig;
