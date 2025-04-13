/**
 * UI辅助工具
 * 提供各种UI相关的工具函数
 */

import { ExecutionNodeType } from '../../types';
import { ReactNode } from 'react';
import { 
  PlayCircleOutlined,
  ToolOutlined, 
  EyeOutlined, 
  SwapOutlined, 
  RetweetOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';

/**
 * 获取节点图标
 * @param nodeType 节点类型
 * @returns 节点图标组件
 */
export function getNodeIcon(nodeType: ExecutionNodeType): ReactNode {
  switch (nodeType) {
    case 'start': return <PlayCircleOutlined style={{ color: '#1890ff' }} />;
    case 'worktask': return <ToolOutlined style={{ color: '#52c41a' }} />;
    case 'display': return <EyeOutlined style={{ color: '#722ed1' }} />;
    case 'assign': return <SwapOutlined style={{ color: '#fa8c16' }} />;
    case 'loop': return <RetweetOutlined style={{ color: '#eb2f96' }} />;
    default: return <QuestionCircleOutlined style={{ color: '#666' }} />;
  }
}

/**
 * 获取节点状态颜色
 * @param status 状态
 * @returns 颜色代码
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'waiting': return '#d9d9d9';
    case 'executing': return '#1890ff';
    case 'completed': return '#52c41a';
    case 'error': return '#f5222d';
    default: return '#d9d9d9';
  }
}

/**
 * 格式化显示时间
 * @param timestamp 时间戳
 * @returns 格式化的时间字符串
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
  });
}
