import * as React from 'react';
import { Badge, Space, Typography } from 'antd';
import { ExecutionStatus } from '../../services/workTaskService';

const { Text } = Typography;

interface ExecutionStatusPanelProps {
  executionStatus: ExecutionStatus;
  executionTime: string;
  showLabel?: boolean;
  showTime?: boolean;
  size?: 'small' | 'default' | 'large';
}

/**
 * 执行状态面板组件
 * 用于显示工作任务的执行状态和执行时间
 */
const ExecutionStatusPanel: React.FC<ExecutionStatusPanelProps> = ({
  executionStatus,
  executionTime,
  showLabel = true,
  showTime = true,
  size = 'default'
}) => {
  // 获取执行状态标签
  const getStatusLabel = () => {
    switch (executionStatus) {
      case ExecutionStatus.IDLE:
        return '空闲';
      case ExecutionStatus.RUNNING:
        return '执行中';
      case ExecutionStatus.COMPLETED:
        return '已完成';
      case ExecutionStatus.FAILED:
        return '执行失败';
      default:
        return '未知状态';
    }
  };

  // 获取执行状态对应的Badge颜色
  const getStatusColor = () => {
    switch (executionStatus) {
      case ExecutionStatus.IDLE:
        return 'default';
      case ExecutionStatus.RUNNING:
        return 'processing';
      case ExecutionStatus.COMPLETED:
        return 'success';
      case ExecutionStatus.FAILED:
        return 'error';
      default:
        return 'default';
    }
  };

  // 格式化执行时间
  const formatDisplayTime = () => {
    if (!executionTime) return '未执行';
    try {
      const date = new Date(executionTime);
      return date.toLocaleString('zh-CN');
    } catch (error) {
      console.error('格式化执行时间出错:', error);
      return executionTime;
    }
  };

  return (
    <Space>
      <Badge status={getStatusColor()} />
      {showLabel && (
        <Text strong={size === 'large'} style={{
          fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px'
        }}>
          {getStatusLabel()}
        </Text>
      )}
      {showTime && (
        <Text type="secondary" style={{
          fontSize: size === 'small' ? '12px' : size === 'large' ? '14px' : '13px'
        }}>
          {formatDisplayTime()}
        </Text>
      )}
    </Space>
  );
};

export default ExecutionStatusPanel;
