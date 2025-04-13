/**
 * 流程构建器 
 * 负责将工作流结构转换为可执行节点
 */

import { ExecutionNode, ExecutionNodeType, WorkflowStructure } from '../../types';
import { getNodeIcon } from './UIHelper';

/**
 * 获取节点类型
 * 处理前端和后端可能存在的字段命名不一致问题
 */
export function resolveNodeType(node: any): ExecutionNodeType {
  // 获取节点类型，尝试多种可能的字段
  const type = node.type || node.data?.type || '';
  
  // 如果节点ID包含type前缀，可以从中提取
  if (typeof node.id === 'string' && node.id.includes('-')) {
    const idParts = node.id.split('-');
    if (idParts.length > 0 && ['start', 'workTask', 'worktask', 'display', 'assignment', 'assign', 'loop'].includes(idParts[0])) {
      // 注意：现在标准类型名称是"assign"和"worktask"，向后兼容旧版的"assignment"和"workTask"
      let normalizedType = idParts[0];
      
      // 向后兼容处理
      if (normalizedType === 'assignment') normalizedType = 'assign';
      if (normalizedType === 'workTask') normalizedType = 'worktask';
      
      console.log(`[FlowBuilder] 从节点ID ${node.id} 推断类型为 ${normalizedType}`);
      return normalizedType as ExecutionNodeType;
    }
  }
  
  // 根据不同形式的类型名称进行标准化
  if (type === 'start' || type === 'startCard' || type === 'startNode') {
    return 'start';
  } else if (type === 'workTask' || type === 'workTaskCard' || type === 'task' || type === 'worktask') {
    // 注意：标准化为"worktask"，向后兼容"workTask"
    return 'worktask';
  } else if (type === 'display' || type === 'displayCard') {
    return 'display';
  } else if (type === 'assignment' || type === 'assignmentCard' || type === 'variable' || type === 'assign') {
    // 注意：标准化为"assign"，向后兼容"assignment"
    return 'assign';
  } else if (type === 'loop' || type === 'loopCard' || type === 'condition') {
    return 'loop';
  }
  
  console.warn(`[FlowBuilder] 未识别的节点类型 ${type}，节点:`, node);
  return type as ExecutionNodeType;
}

/**
 * 构建执行流程图
 * @param structure 工作流结构
 * @returns 执行节点数组
 */
export function buildExecutionFlow(structure: WorkflowStructure): ExecutionNode[] {
  console.log('[FlowBuilder] 开始构建执行流程图, 结构:', structure);
  
  // 校验节点
  if (!structure.nodes) {
    console.error('[FlowBuilder] 工作流结构中没有节点');
    return [];
  }
  
  // 初始化连接数组
  if (!structure.connections) {
    console.warn('[FlowBuilder] 工作流结构中没有直接连接，尝试从metadata中读取');
    structure.connections = [];
  }
  
  const { nodes, connections } = structure;
  
  // 创建连接映射，便于快速查找目标节点
  const connectionMap = buildConnectionMap(structure);
  
  // 创建执行节点数组
  const executionNodes: ExecutionNode[] = [];
  
  // 为每个节点创建执行节点对象
  nodes.forEach(node => {
    // 确定节点类型
    const nodeType = resolveNodeType(node);
    console.log(`[FlowBuilder] 处理节点 ${node.id}, 类型: ${nodeType}`);
    
    // 获取节点图标
    const icon = getNodeIcon(nodeType);
    
    // 找到与此节点相关的连接
    const nodeConnections = connectionMap.get(node.id) || [];
    
    // 对于循环卡，区分Yes/No连接
    let yesNodeId, noNodeId;
    if (nodeType === 'loop') {
      const yesConn = nodeConnections.find(conn => conn.label === 'yes');
      const noConn = nodeConnections.find(conn => conn.label === 'no');
      
      yesNodeId = yesConn?.targetNodeId;
      noNodeId = noConn?.targetNodeId;
    }
    
    // 读取节点配置 - 兼容ReactFlow数据格式
    // 1. 优先尝试从node.data?.config读取（ReactFlow格式）
    // 2. 如果没有，则尝试直接从node.config读取（后端存储格式）
    const nodeConfig = (node as any).data?.config || node.config || {};
    
    console.log(`[FlowBuilder] 节点 ${node.id} 的配置来源:`, {
      '存在config字段': !!node.config,
      '存在data字段': !!(node as any).data,
      '存在data.config字段': !!(node as any).data?.config,
      '配置为空': Object.keys(nodeConfig).length === 0
    });
    
    // 创建执行节点对象
    const executionNode: ExecutionNode = {
      id: node.id,
      type: nodeType,
      name: node.name || `${nodeType}节点`,
      icon,
      config: {
        ...nodeConfig,
        // 对于循环卡，添加Yes/No节点ID
        ...(nodeType === 'loop' ? { yesNodeId, noNodeId } : {})
      },
      // 找出此节点的下一个节点（除了循环卡）
      nextNodeId: nodeType !== 'loop' ? nodeConnections[0]?.targetNodeId : undefined,
      status: 'waiting',
      executionData: {}
    };
    
    // 调试输出，确认节点连接关系
    console.log(`[FlowBuilder] 节点 ${node.id} 的下一个节点ID: ${executionNode.nextNodeId || '无'}`);
    console.log(`[FlowBuilder] 节点 ${node.id} 的连接数: ${nodeConnections.length}`);
    if (nodeConnections.length > 0) {
      nodeConnections.forEach((conn, idx) => {
        console.log(`[FlowBuilder] - 连接 ${idx+1}: 目标节点=${conn.targetNodeId}, 标签=${conn.label || '无'}`);
      });
    }
    
    executionNodes.push(executionNode);
  });
  
  console.log('[FlowBuilder] 构建完成, 执行节点:', executionNodes);
  return executionNodes;
}

/**
 * 构建连接映射
 * @param structure 工作流结构
 * @returns 连接映射表
 */
function buildConnectionMap(structure: WorkflowStructure): Map<string, {targetNodeId: string, label?: string}[]> {
  const { connections } = structure;
  
  // 创建连接映射，便于快速查找目标节点
  const connectionMap = new Map<string, {targetNodeId: string, label?: string}[]>();
  
  // 处理正常连接
  connections.forEach(conn => {
    const sourceConnections = connectionMap.get(conn.sourceNodeId) || [];
    sourceConnections.push({
      targetNodeId: conn.targetNodeId,
      label: conn.label
    });
    connectionMap.set(conn.sourceNodeId, sourceConnections);
  });
  
  // 检查是否有metadata中的连接信息
  if (structure.metadata && structure.metadata.edges) {
    try {
      // 尝试解析edges信息
      let edgesData;
      if (typeof structure.metadata.edges === 'string') {
        console.log('[FlowBuilder] 解析metadata.edges字符串');
        edgesData = JSON.parse(structure.metadata.edges);
      } else {
        edgesData = structure.metadata.edges;
      }
      
      console.log('[FlowBuilder] 从metadata中读取到edges数据:', edgesData);
      
      // 处理边缘
      if (Array.isArray(edgesData)) {
        edgesData.forEach(edge => {
          const { source, target, label } = edge;
          if (source && target) {
            const sourceConnections = connectionMap.get(source) || [];
            sourceConnections.push({
              targetNodeId: target,
              label: label
            });
            connectionMap.set(source, sourceConnections);
            console.log(`[FlowBuilder] 添加连接: ${source} -> ${target}`);
          }
        });
      }
    } catch (error) {
      console.error('[FlowBuilder] 解析metadata.edges失败:', error);
    }
  }
  
  return connectionMap;
}
