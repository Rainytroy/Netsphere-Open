import React, { useState } from 'react';
import { Card, Button, Space, Tooltip, Popconfirm, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, CopyOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Workflow } from '../../services/workflowService';
import WorkflowExecutionIndicator from './WorkflowExecutionIndicator';
import { ExecutionPhase } from '../common/ExecutionStatusIndicator/executionTypes';

const { Title, Text } = Typography;

interface WorkflowCardProps {
  workflow: Workflow;
  onDelete: (id: string) => void;
  onCopy: (id: string) => void;
  onExecute?: (id: string) => Promise<any>; // 可选的执行回调
}

/**
 * 工作流卡片组件
 * 显示工作流基本信息和操作按钮
 */
const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onDelete, onCopy, onExecute }) => {
  const navigate = useNavigate();
  // 执行状态相关状态
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionPhase, setExecutionPhase] = useState<ExecutionPhase>(ExecutionPhase.IDLE);
  const [executionDuration, setExecutionDuration] = useState<number | null>(null);
  
  // 格式化日期
  const formatDate = (date?: Date | string) => {
    if (!date) return '未知';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) return '未知';
    
    return dateObj.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 处理编辑按钮
  const handleEdit = () => {
    navigate(`/workflow/${workflow.id}/edit`);
  };
  
  // 处理使用按钮 (执行工作流)
  const handleUse = () => {
    navigate(`/workflow/${workflow.id}/use`);
  };
  
  // 处理直接执行按钮（如果提供了onExecute回调）
  const handleExecute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 如果没有提供执行回调或者当前正在执行，则不做任何操作
    if (!onExecute || executing) {
      return;
    }
    
    try {
      // 更新执行状态
      setExecuting(true);
      
      // 按顺序设置执行阶段
      setExecutionPhase(ExecutionPhase.PREPARING);
      await new Promise(resolve => setTimeout(resolve, 300)); // 添加短暂延迟以便于UI更新
      
      setExecutionPhase(ExecutionPhase.STATE_TRANSITION);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setExecutionPhase(ExecutionPhase.API_CALLING);
      
      // 调用执行回调
      const startTime = Date.now();
      const result = await onExecute(workflow.id);
      const endTime = Date.now();
      setExecutionDuration(endTime - startTime);
      
      // 处理响应和更新状态
      setExecutionPhase(ExecutionPhase.PROCESSING_RESPONSE);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setExecutionPhase(ExecutionPhase.UPDATING_STATE);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 完成执行
      setExecutionPhase(ExecutionPhase.COMPLETED);
      
      // 3秒后重置状态
      setTimeout(() => {
        setExecuting(false);
        setExecutionPhase(ExecutionPhase.IDLE);
      }, 3000);
      
      return result;
    } catch (error) {
      console.error('执行工作流失败:', error);
      setExecutionPhase(ExecutionPhase.ERROR);
      
      // 3秒后重置状态
      setTimeout(() => {
        setExecuting(false);
        setExecutionPhase(ExecutionPhase.IDLE);
      }, 3000);
    }
  };

  // 悬停效果样式
  const hoverStyles = `
    .custom-workflow-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      transform: translateY(-3px);
    }
  `;

  return (
    <>
      <style>{hoverStyles}</style>
      <Card
        hoverable
        className="custom-workflow-card"
        style={{ 
          width: 280, 
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
        bodyStyle={{ minHeight: 120 }}
        cover={
          <div 
            style={{ 
              height: 120, 
              background: workflow.isActive ? '#f6ffed' : '#f9f9f9',
              borderBottom: '1px solid #f0f0f0',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <PlayCircleOutlined style={{ fontSize: 48, color: workflow.isActive ? '#52c41a' : '#d9d9d9' }} />
            
            {/* 状态指示点 */}
            <div 
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: workflow.isActive ? '#52c41a' : '#d9d9d9'
              }}
            />
            
            {/* 执行状态指示器 */}
            {executing && (
              <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
                <WorkflowExecutionIndicator
                  workflow={workflow}
                  executing={executing}
                  phase={executionPhase}
                  duration={executionDuration || undefined}
                  style={{ fontSize: 12 }}
                />
              </div>
            )}
          </div>
        }
        actions={[
          <Tooltip title="编辑工作流" key="edit">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={handleEdit}
            />
          </Tooltip>,
          onExecute ? (
            <Tooltip title={executing ? '执行中...' : '直接执行工作流'} key="execute">
              <Button 
                type="text" 
                icon={<PlayCircleOutlined spin={executing} />} 
                onClick={handleExecute}
                disabled={executing}
                loading={executionPhase === ExecutionPhase.API_CALLING}
              />
            </Tooltip>
          ) : (
            <Tooltip title="使用工作流" key="use">
              <Button 
                type="text" 
                icon={<PlayCircleOutlined />} 
                onClick={handleUse}
              />
            </Tooltip>
          ),
          <Tooltip title="复制工作流" key="copy">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => onCopy(workflow.id)}
            />
          </Tooltip>,
          <Popconfirm
            title="确定要删除此工作流吗?"
            description="删除后无法恢复"
            onConfirm={() => onDelete(workflow.id)}
            okText="确定"
            cancelText="取消"
            key="delete"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        ]}
      >
        <Title level={4} style={{ marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {workflow.name}
        </Title>
        <Text type="secondary" style={{ 
          marginBottom: 16,
          height: 42,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          display: '-webkit-box'
        }}>
          {workflow.description || '无描述'}
        </Text>
        <Space direction="vertical" size={0} style={{ width: '100%', marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            创建时间: {formatDate(workflow.createdAt)}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            更新时间: {formatDate(workflow.updatedAt)}
          </Text>
          <Text style={{ marginTop: 8 }}>
            状态: <Text type={workflow.isActive ? 'success' : 'secondary'}>
              {workflow.isActive ? '已启用' : '未启用'}
            </Text>
          </Text>
        </Space>
      </Card>
    </>
  );
};

export default WorkflowCard;
