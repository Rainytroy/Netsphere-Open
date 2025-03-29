import { Node, Edge } from 'reactflow';
import { Workflow, CreateWorkflowParams } from '../../services/workflowService';

/**
 * 加载工作流数据到节点和边
 * 解析工作流元数据并转换为ReactFlow节点和边
 */
export const loadWorkflowData = (workflow?: Workflow): { nodes: Node[], edges: Edge[] } => {
  if (!workflow) {
    return { nodes: [], edges: [] };
  }

  console.log('[WorkflowDataHandler] 开始加载工作流, ID:', workflow.id);
  console.log('[WorkflowDataHandler] 工作流元数据:', workflow.metadata);
  
  let loadedNodes: Node[] = [];
  let loadedEdges: Edge[] = [];
  
  try {
    if (workflow.metadata && typeof workflow.metadata === 'object') {
      // 处理节点数据
      if (workflow.metadata.nodes) {
        try {
          let parsedNodes;
          
          if (typeof workflow.metadata.nodes === 'string') {
            // 如果是字符串，尝试解析
            try {
              parsedNodes = JSON.parse(workflow.metadata.nodes);
              console.log('[WorkflowDataHandler] 成功从字符串解析节点数据');
            } catch (e) {
              console.error('[WorkflowDataHandler] 节点数据解析失败，可能已不是JSON格式:', e);
              return { nodes: [], edges: [] };
            }
          } else if (Array.isArray(workflow.metadata.nodes)) {
            // 已经是数组，直接使用
            parsedNodes = workflow.metadata.nodes;
            console.log('[WorkflowDataHandler] 节点数据已经是数组格式');
          } else {
            // 其他类型，尝试转换
            console.error('[WorkflowDataHandler] 节点数据格式不支持:', typeof workflow.metadata.nodes);
            return { nodes: [], edges: [] };
          }
          
          // 确保解析后的结果是数组
          if (!Array.isArray(parsedNodes)) {
            console.error('[WorkflowDataHandler] 解析后的节点数据不是数组');
            return { nodes: [], edges: [] };
          }
          
          console.log('[WorkflowDataHandler] 节点数据类型:', typeof parsedNodes, Array.isArray(parsedNodes));
          console.log('[WorkflowDataHandler] 解析的节点数据:', parsedNodes);
          
          // 标准化节点数据
          loadedNodes = parsedNodes.map(node => ({
            ...node,
            // 确保每个节点都有必需的属性
            id: node.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: node.type || 'default',
            // 确保position存在
            position: node.position || { x: 0, y: 0 },
            // 确保data存在
            data: node.data || { label: '未命名节点' }
          }));
          
          console.log('[WorkflowDataHandler] 标准化后的节点数据:', loadedNodes);
        } catch (nodeErr) {
          console.error('[WorkflowDataHandler] 处理节点数据失败:', nodeErr);
          loadedNodes = [];
        }
      }
      
      // 处理边数据
      if (workflow.metadata.edges) {
        try {
          let parsedEdges;
          
          if (typeof workflow.metadata.edges === 'string') {
            // 如果是字符串，尝试解析
            try {
              parsedEdges = JSON.parse(workflow.metadata.edges);
              console.log('[WorkflowDataHandler] 成功从字符串解析边数据');
            } catch (e) {
              console.error('[WorkflowDataHandler] 边数据解析失败，可能已不是JSON格式:', e);
              return { nodes: loadedNodes, edges: [] };
            }
          } else if (Array.isArray(workflow.metadata.edges)) {
            // 已经是数组，直接使用
            parsedEdges = workflow.metadata.edges;
            console.log('[WorkflowDataHandler] 边数据已经是数组格式');
          } else {
            // 其他类型，尝试转换
            console.error('[WorkflowDataHandler] 边数据格式不支持:', typeof workflow.metadata.edges);
            return { nodes: loadedNodes, edges: [] };
          }
          
          // 确保解析后的结果是数组
          if (!Array.isArray(parsedEdges)) {
            console.error('[WorkflowDataHandler] 解析后的边数据不是数组');
            return { nodes: loadedNodes, edges: [] };
          }
          
          console.log('[WorkflowDataHandler] 边数据类型:', typeof parsedEdges, Array.isArray(parsedEdges));
          console.log('[WorkflowDataHandler] 解析的边数据:', parsedEdges);
          
          // 标准化边数据
          loadedEdges = parsedEdges.map(edge => ({
            ...edge,
            id: edge.id || `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            source: edge.source,
            target: edge.target
          }));
          
          console.log('[WorkflowDataHandler] 标准化后的边数据:', loadedEdges);
        } catch (edgeErr) {
          console.error('[WorkflowDataHandler] 处理边数据失败:', edgeErr);
          loadedEdges = [];
        }
      }
    }
  } catch (error) {
    console.error('[WorkflowDataHandler] 加载工作流数据失败:', error);
    loadedNodes = [];
    loadedEdges = [];
  }

  console.log('[WorkflowDataHandler] 工作流加载完成，节点数:', loadedNodes.length, '连接数:', loadedEdges.length);
  return { nodes: loadedNodes, edges: loadedEdges };
};

/**
 * 计算各类型节点的使用计数
 */
export const calculateNodeCounts = (nodes: Node[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  
  // 根据节点类型统计数量
  nodes.forEach(node => {
    const nodeTypeId = node.type || (node.data && node.data.id) || 'default';
    counts[nodeTypeId] = (counts[nodeTypeId] || 0) + 1;
  });
  
  console.log('[WorkflowDataHandler] 计算得到使用计数:', counts);
  return counts;
};

/**
 * 准备工作流保存数据
 * 清理节点和边数据，确保序列化不会出问题，并确保已删除的节点不会保存
 */
export const prepareWorkflowData = (
  name: string, 
  description: string, 
  isActive: boolean, 
  nodes: Node[], 
  edges: Edge[],
  workflow?: Workflow
): CreateWorkflowParams => {
  console.log('[WorkflowDataHandler] 开始准备保存数据');
  
  // 筛选出有效节点（确保不包含被标记为隐藏的节点）
  const validNodes = nodes.filter(node => !node.hidden);
  console.log(`[WorkflowDataHandler] 筛选后有效节点: ${validNodes.length}/${nodes.length}`);
  
  // 获取有效节点ID列表
  const validNodeIds = new Set(validNodes.map(node => node.id));
  
  // 筛选出有效边（确保连接的节点都存在）
  const validEdges = edges.filter(edge => 
    validNodeIds.has(edge.source) && 
    validNodeIds.has(edge.target) &&
    !edge.hidden
  );
  console.log(`[WorkflowDataHandler] 筛选后有效边: ${validEdges.length}/${edges.length}`);
  
  // 清理节点数据，确保序列化不会出问题
  const cleanedNodes = validNodes.map(node => ({
    ...node,
    // 移除可能导致循环引用的属性
    selected: undefined,
    dragging: undefined,
    hidden: undefined,
    // 确保数据部分不包含循环引用
    data: {
      ...node.data,
      // 移除可能包含函数或复杂对象的属性
      handlers: undefined,
      references: undefined,
      flowInstance: undefined
    }
  }));
  
  // 清理边数据
  const cleanedEdges = validEdges.map(edge => ({
    ...edge,
    selected: undefined,
    hidden: undefined
  }));
  
  // 准备保存数据
  const data: CreateWorkflowParams = {
    name,
    description,
    isActive,
    metadata: {
      nodes: JSON.stringify(cleanedNodes),
      edges: JSON.stringify(cleanedEdges),
      version: workflow?.metadata?.version || 1,
      updatedAt: new Date().toISOString()
    }
  };
  
  console.log('[WorkflowDataHandler] 准备发送的数据:', data);
  return data;
};
