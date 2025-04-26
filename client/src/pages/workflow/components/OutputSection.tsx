import React, { useMemo } from 'react';
import { Typography, Card, Spin, Space, Button, Col, Switch } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import ExecutionNodeCard from './ExecutionNodeCard';
import { ExecutionNode } from '../types';

const { Title, Text } = Typography;

interface OutputSectionProps {
  executionNodes: ExecutionNode[];
  currentNodeIndex: number;
  isRunning: boolean;
  onExport: () => void;
  displayMode?: 'simple' | 'detailed';  // 显示模式
  onToggleDisplayMode?: () => void;     // 切换显示模式
}

/**
 * 按照工作流执行顺序对节点进行排序
 * 从start节点开始，按照nextNodeId顺序排列
 */
const sortNodesByExecutionFlow = (nodes: ExecutionNode[]): ExecutionNode[] => {
  // 复制节点数组，避免修改原数组
  const sortedNodes: ExecutionNode[] = [];
  
  // 查找起点(start)节点
  const startNode = nodes.find(node => node.type === 'start');
  if (!startNode) {
    console.warn('未找到start节点，返回原始顺序');
    return [...nodes];
  }
  
  // 添加起点节点
  sortedNodes.push(startNode);
  
  // 使用nextNodeId递归查找后续节点
  let currentNode = startNode;
  const processedIds = new Set<string>([startNode.id]);
  
  // 最大迭代次数保护，防止无限循环
  const maxIterations = nodes.length * 2;
  let iterations = 0;
  
  while (iterations < maxIterations) {
    iterations++;
    
    // 查找下一个节点 (nextNodeId是扩展属性)
    const nextNodeId = (currentNode as any).nextNodeId;
    if (!nextNodeId) break;
    
    const nextNode = nodes.find(node => node.id === nextNodeId);
    if (!nextNode || processedIds.has(nextNodeId)) break;
    
    // 添加到排序后的数组
    sortedNodes.push(nextNode);
    processedIds.add(nextNodeId);
    currentNode = nextNode;
  }
  
  // 添加剩余未处理的节点（保持它们的原始顺序）
  nodes.forEach(node => {
    if (!processedIds.has(node.id)) {
      sortedNodes.push(node);
    }
  });
  
  // 记录排序结果用于调试
  if (sortedNodes.length > 0) {
    console.log('[OutputSection] 节点排序结果:',
      sortedNodes.map(n => `${n.id}(${n.type})`).join(' → ')
    );
  }
  
  return sortedNodes;
};

/**
 * 工作流系统输出区域组件
 */
const OutputSection: React.FC<OutputSectionProps> = ({
  executionNodes,
  currentNodeIndex,
  isRunning,
  onExport,
  displayMode = 'detailed',   // 默认详细模式
  onToggleDisplayMode
}) => {
  // 使用useMemo缓存排序后的节点，避免每次渲染都重新排序
  const sortedNodes = useMemo(() => {
    return sortNodesByExecutionFlow(executionNodes);
  }, [executionNodes]);
  return (
    <Col span={16} style={{ height: '100%', padding: '0 0 0 12px' }}>
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>系统输出</Title>
            <Space>
              {/* 显示模式切换开关 */}
              <Switch 
                checkedChildren="详细" 
                unCheckedChildren="精简"
                checked={displayMode === 'detailed'}
                onChange={onToggleDisplayMode}
              />
              {executionNodes.length > 0 && !isRunning && (
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={onExport}
                >
                  导出Markdown
                </Button>
              )}
            </Space>
          </div>
        }
        bordered={true}
        style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#F5F5F5',
          boxShadow: 'none'
        }}
        bodyStyle={{ 
          flex: 1, 
          overflow: 'auto',
          padding: executionNodes.length === 0 ? '16px' : '16px'
        }}
      >
        {executionNodes.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            color: '#999'
          }}>
            {isRunning ? (
              <Spin tip="正在处理..." />
            ) : (
              <Text type="secondary">尚未产生输出，请点击"运行"开始工作流</Text>
            )}
          </div>
        ) : (
          <div className="execution-nodes-container">
            {sortedNodes.map((node) => {
              // 找出当前节点在原始数组中的索引，用于确定是否为当前活动节点
              const originalIndex = executionNodes.findIndex(n => n.id === node.id);
              return (
                <ExecutionNodeCard
                  key={node.id}
                  node={node}
                  isActive={originalIndex === currentNodeIndex}
                  displayMode={displayMode}
                />
              );
            })}
            {isRunning && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Spin tip="执行中..." />
              </div>
            )}
          </div>
        )}
      </Card>
    </Col>
  );
};

export default OutputSection;
