import React from 'react';
import { Card, Typography, Tag, Space, Button, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { WorkTask } from '../../services/workTaskService';
import { useNavigate } from 'react-router-dom';
import { ExecutionStatusIndicator, ExecutionPhase } from '../common/ExecutionStatusIndicator';

const { Title, Text, Paragraph } = Typography;

interface WorkTaskCardProps {
  task: WorkTask;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
  onExecute: (id: string) => void;
}

/**
 * 工作任务卡片组件
 * 用于在工作任务列表页面展示工作任务基本信息
 */
const WorkTaskCard: React.FC<WorkTaskCardProps> = ({ task, onDelete, onClick, onExecute }) => {
  const navigate = useNavigate();
  
  // 根据任务状态返回对应的标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'active':
        return 'blue';
      case 'archived':
        return 'gray';
      default:
        return 'default';
    }
  };

  // 将工作任务执行状态映射到ExecutionPhase枚举
  const mapTaskStatusToExecutionPhase = (status: string): ExecutionPhase => {
    switch (status) {
      case 'idle':
        return ExecutionPhase.IDLE;
      case 'running':
        return ExecutionPhase.PREPARING; // 修改为从PREPARING开始，而不是直接跳到API_CALLING
      case 'completed':
        return ExecutionPhase.COMPLETED;
      case 'failed':
        return ExecutionPhase.ERROR;
      default:
        return ExecutionPhase.IDLE;
    }
  };

  // 格式化状态文本
  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      active: '已激活',
      archived: '已归档',
      idle: '空闲',
      running: '执行中',
      completed: '已完成',
      failed: '执行失败'
    };
    return statusMap[status] || status;
  };

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return '未执行';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  // 生成默认output展示内容
  const getDisplayOutput = () => {
    if (!task.output) return '无输出结果';
    return task.output.length > 120 ? `${task.output.slice(0, 120)}...` : task.output;
  };

  return (
    <Card
      style={{ width: 300 }}
      hoverable
      onClick={() => onClick(task.id)}
      actions={[
        <Tooltip title="执行任务">
          <Button 
            type="text" 
            icon={<PlayCircleOutlined />} 
            onClick={(e) => {
              e.stopPropagation();
              onExecute(task.id);
            }}
            disabled={task.executionStatus === 'running'}
          />
        </Tooltip>,
        <Tooltip title="编辑">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={(e) => {
              e.stopPropagation();
              onClick(task.id);
            }}
          />
        </Tooltip>,
        <Popconfirm
          title="确定要删除这个工作任务吗？"
          onConfirm={(e) => {
            e?.stopPropagation();
            onDelete(task.id);
          }}
          okText="确定"
          cancelText="取消"
        >
          <Tooltip title="删除">
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              danger
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        </Popconfirm>,
      ]}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* 标题和状态标签 - 单独一行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>
            {task.name}
          </Title>
          <Tag color={getStatusColor(task.status)}>{formatStatus(task.status)}</Tag>
        </div>
        
        {/* 输入内容区域 - 固定两行 */}
        <div>
          <Text type="secondary" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
            输入:
          </Text>
          <Paragraph 
            ellipsis={{ rows: 2 }}
            style={{ 
              margin: 0,
              padding: '4px 8px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              minHeight: '42px' // 确保即使内容少也有两行高度
            }}
            title={task.input}
          >
            {task.input}
          </Paragraph>
        </div>
        
        {/* 输出内容区域 - 固定两行 */}
        <div>
          <Text type="secondary" style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>
            输出:
          </Text>
          <Paragraph 
            ellipsis={{ rows: 2 }}
            style={{ 
              margin: 0,
              padding: '4px 8px',
              backgroundColor: '#e6f7ff', // 使用不同的背景色与输入区分
              borderRadius: '4px',
              border: '1px solid #91d5ff', 
              minHeight: '42px' // 确保即使内容少也有两行高度
            }}
            title={task.output}
          >
            {getDisplayOutput()}
          </Paragraph>
        </div>
        
        {/* 底部信息 */}
        <Space size={0} direction="vertical">
          <Text type="secondary" style={{ fontSize: '12px' }}>关联NPC：{task.npcName}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>AI服务：{task.aiServiceName}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            上次执行：{formatDate(task.lastRunAt)}
          </Text>
        </Space>
        
        {/* 状态指示器 - 移到底部，按钮上方 */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <ExecutionStatusIndicator
            phase={mapTaskStatusToExecutionPhase(task.executionStatus)}
            simplified={true}
            showPhaseDescription={true}
            size="small"
          />
        </div>
      </Space>
    </Card>
  );
};

export default WorkTaskCard;
