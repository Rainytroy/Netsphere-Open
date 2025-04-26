import React from 'react';
import { Typography, Descriptions } from 'antd';

/**
 * 执行时间戳接口
 */
export interface ExecutionTimestamps {
  startTime?: number;           // 开始执行时间
  apiCallStartTime?: number;    // API调用开始时间
  apiCallEndTime?: number;      // API调用完成时间
  renderStartTime?: number;     // 渲染开始时间
  renderCompleteTime?: number;  // 渲染完成时间
  statusCompleteTime?: number;  // 状态变为completed的时间
  nextNodeTime?: number;        // 通知下一节点时间
}

export interface TimestampDisplayProps {
  timestamps?: ExecutionTimestamps;
  showDetailedView?: boolean;
  title?: string;
}

/**
 * 通用时间戳展示组件
 * 用于展示节点执行过程中的各个时间节点
 */
const TimestampDisplay: React.FC<TimestampDisplayProps> = ({ 
  timestamps = {}, 
  showDetailedView = false,
  title = '时间信息'
}) => {
  // 格式化时间戳为可读格式
  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '未记录';
    try {
      const date = new Date(timestamp);
      // 使用更友好的本地化时间格式，显示年月日时分秒毫秒
      return date.toLocaleString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
    } catch (error) {
      return timestamp.toString();
    }
  };
  
  // 格式化时间差为可读格式
  const formatTimeDiff = (startTime?: number, endTime?: number): string => {
    if (!startTime || !endTime) return '未知';
    const diff = endTime - startTime;
    return `${diff} ms`;
  };

  if (!showDetailedView) {
    return null;
  }

  return (
    <div style={{ 
      padding: '12px', 
      marginTop: '16px',
      marginBottom: '10px',
      backgroundColor: '#f5f5f5',
      borderRadius: '6px',
      border: '1px solid #e8e8e8'
    }}>
      <Typography.Title level={5} style={{ marginTop: 0, marginBottom: '16px' }}>
        {title}
      </Typography.Title>
      
      <Descriptions bordered column={1} size="small">
        {/* 时间戳信息 */}
        <Descriptions.Item label="开始执行时间">
          {formatTimestamp(timestamps.startTime)}
        </Descriptions.Item>
        {timestamps.renderStartTime !== undefined && (
          <Descriptions.Item label="渲染开始时间">
            {formatTimestamp(timestamps.renderStartTime)}
          </Descriptions.Item>
        )}
        {timestamps.apiCallStartTime !== undefined && (
          <Descriptions.Item label="API调用开始时间">
            {formatTimestamp(timestamps.apiCallStartTime)}
          </Descriptions.Item>
        )}
        {timestamps.apiCallEndTime !== undefined && (
          <Descriptions.Item label="API调用完成时间">
            {formatTimestamp(timestamps.apiCallEndTime)}
          </Descriptions.Item>
        )}
        {timestamps.renderCompleteTime !== undefined && (
          <Descriptions.Item label="渲染完成时间">
            {formatTimestamp(timestamps.renderCompleteTime)}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="状态变为completed时间">
          {formatTimestamp(timestamps.statusCompleteTime)}
        </Descriptions.Item>
        <Descriptions.Item label="通知下一节点时间">
          {formatTimestamp(timestamps.nextNodeTime)}
        </Descriptions.Item>
        
        {/* 时间差分析 */}
        {timestamps.renderStartTime !== undefined && timestamps.renderCompleteTime !== undefined && (
          <Descriptions.Item label="渲染耗时">
            {formatTimeDiff(timestamps.renderStartTime, timestamps.renderCompleteTime)}
          </Descriptions.Item>
        )}
        {timestamps.apiCallStartTime !== undefined && timestamps.apiCallEndTime !== undefined && (
          <Descriptions.Item label="API调用耗时">
            {formatTimeDiff(timestamps.apiCallStartTime, timestamps.apiCallEndTime)}
          </Descriptions.Item>
        )}
        {timestamps.renderCompleteTime !== undefined && timestamps.statusCompleteTime !== undefined && (
          <Descriptions.Item label="状态更新耗时">
            {formatTimeDiff(timestamps.renderCompleteTime, timestamps.statusCompleteTime)}
          </Descriptions.Item>
        )}
        {timestamps.statusCompleteTime !== undefined && timestamps.nextNodeTime !== undefined && (
          <Descriptions.Item label="通知下一节点耗时">
            {formatTimeDiff(timestamps.statusCompleteTime, timestamps.nextNodeTime)}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="总耗时">
          {formatTimeDiff(timestamps.startTime, timestamps.nextNodeTime)}
        </Descriptions.Item>
      </Descriptions>
    </div>
  );
};

export default TimestampDisplay;
