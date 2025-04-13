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
          loadedNodes = parsedNodes.map(node => {
            // 打印日志，检查节点是否包含config
            console.log(`[WorkflowDataHandler] 加载节点 ${node.id} 配置:`, node.config);
            
            return {
              ...node,
              // 确保每个节点都有必需的属性
              id: node.id || `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: node.type || 'default',
              // 确保position存在
              position: node.position || { x: 0, y: 0 },
              // 确保data存在
              data: node.data || { label: '未命名节点' },
              // 确保保留config属性
              config: node.config || undefined
            };
          });
          
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
    // 对于工作任务卡，使用data.id(原始卡片ID)进行计数
    if (node.type === 'worktask' && node.data && node.data.id) {
      const cardId = node.data.id;
      counts[cardId] = (counts[cardId] || 0) + 1;
    } else {
      // 其他卡片继续使用type字段
      const nodeTypeId = node.type || (node.data && node.data.id) || 'default';
      counts[nodeTypeId] = (counts[nodeTypeId] || 0) + 1;
    }
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
  isActive: boolean, 
  nodes: Node[], 
  edges: Edge[],
  workflow?: Workflow
): CreateWorkflowParams => {
  console.log('[WorkflowDataHandler] 开始准备保存数据');
  
  // 筛选出有效节点（确保不包含被标记为隐藏的节点）
  const validNodes = nodes.filter(node => !node.hidden);
  console.log(`[WorkflowDataHandler] 筛选后有效节点: ${validNodes.length}/${nodes.length}`);
  console.log(`[WorkflowDataHandler] 有效节点详情:`, validNodes.map(n => ({id: n.id, type: n.type})));
  
  // 不再自动添加起点卡，直接使用有效节点
  let cleanedNodes = [...validNodes];
  
  // 记录是否有起点卡，只用于日志
  const hasStartNode = validNodes.some(node => node.type === 'start');
  if (!hasStartNode && validNodes.length > 0) {
    console.log(`[WorkflowDataHandler] 注意: 工作流中没有起点卡`);
  }
  
  console.log('[WorkflowDataHandler] 最终处理后的节点数:', cleanedNodes.length);
  
  // 获取有效节点ID列表 - 使用添加了起点卡的cleanedNodes
  const validNodeIds = new Set(cleanedNodes.map(node => node.id));
  
  // 筛选出有效边（确保连接的节点都存在）
  const validEdges = edges.filter(edge => 
    validNodeIds.has(edge.source) && 
    validNodeIds.has(edge.target) &&
    !edge.hidden
  );
  console.log(`[WorkflowDataHandler] 筛选后有效边: ${validEdges.length}/${edges.length}`);
  
  // 清理节点数据，确保序列化不会出问题
  // 使用类型断言处理节点
  interface ExtendedNode extends Node {
    config?: any;
  }
  
  const finalNodes = cleanedNodes.map(node => {
    // 使用类型断言转换Node类型以支持config属性
    const extendedNode = node as ExtendedNode;
    
    // 记录详细日志
    console.log(`[WorkflowDataHandler] 处理节点配置: ${extendedNode.id}, 类型: ${extendedNode.type}, 配置:`, extendedNode.config);
    
    return {
      ...extendedNode,
      // 移除可能导致循环引用的属性
      selected: undefined,
      dragging: undefined,
      hidden: undefined,
      // 确保数据部分不包含循环引用
      data: {
        ...extendedNode.data,
        // 移除可能包含函数或复杂对象的属性
        handlers: undefined,
        references: undefined,
        flowInstance: undefined
      },
      // 确保config被保留 - 这是修复展示卡配置保存的关键
      config: extendedNode.config ? {
        ...extendedNode.config,
        // 处理config中可能导致循环引用的属性
        richContent: extendedNode.config.richContent ? {
          ...extendedNode.config.richContent,
          // 移除可能导致问题的富文本对象属性
          docInstance: undefined,
          editorView: undefined
        } : undefined
      } : undefined
    };
  });
  
  // 清理边数据
  const finalEdges = validEdges.map(edge => ({
    ...edge,
    selected: undefined,
    hidden: undefined
  }));
  
  // 准备保存数据，不包含description字段(由起点卡负责)
  const data: CreateWorkflowParams = {
    name,
    isActive,
    metadata: {
      nodes: JSON.stringify(finalNodes),
      edges: JSON.stringify(finalEdges),
      version: workflow?.metadata?.version || 1,
      updatedAt: new Date().toISOString()
    }
  };
  
  console.log('[WorkflowDataHandler] 准备发送的数据:', data);
  console.log('[WorkflowDataHandler] 节点数据序列化长度:', data.metadata.nodes.length);
  return data;
};
