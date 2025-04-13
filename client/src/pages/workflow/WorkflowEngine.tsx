import { 
  ExecutionNode, 
  ExecutionNodeType, 
  WorkflowStructure,
  DisplayNodeOutput,
  WorkTaskNodeOutput,
  ExecutionNodeStatus
} from './types';
import { workflowVariableService } from '../../services/workflowVariableService';
import { ReactNode } from 'react';
import { 
  PlayCircleOutlined,
  ToolOutlined, 
  EyeOutlined, 
  SwapOutlined, 
  RetweetOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { createWorkflowEngineLogger } from './utils/LogUtils';
import { processContent, displayContentProgressively } from './utils/ContentUtils';
import { validateDisplayNode, getNodeConfigSummary, getNodeDebugId } from './utils/NodeValidationUtils';
import { parseRawText } from './engine/utils/VariableParser';

/**
 * 工作流引擎
 * 负责工作流执行相关的核心逻辑
 */
export class WorkflowEngine {
  /**
   * 构建执行流程图
   * @param structure 工作流结构
   * @returns 执行节点数组
   */
  static buildExecutionFlow(structure: WorkflowStructure): ExecutionNode[] {
    console.log('[WorkflowEngine] 开始构建执行流程图, 结构:', structure);
    
    // 创建节点映射，便于快速查找
    if (!structure.nodes) {
      console.error('[WorkflowEngine] 工作流结构中没有节点');
      return [];
    }
    
    // 初始化连接数组
    if (!structure.connections) {
      console.warn('[WorkflowEngine] 工作流结构中没有直接连接，尝试从metadata中读取');
      structure.connections = [];
    }
    
    const { nodes, connections } = structure;
    
    // 创建节点映射，便于快速查找
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    
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
          console.log('[WorkflowEngine] 解析metadata.edges字符串');
          edgesData = JSON.parse(structure.metadata.edges);
        } else {
          edgesData = structure.metadata.edges;
        }
        
        console.log('[WorkflowEngine] 从metadata中读取到edges数据:', edgesData);
        
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
              console.log(`[WorkflowEngine] 添加连接: ${source} -> ${target}`);
            }
          });
        }
      } catch (error) {
        console.error('[WorkflowEngine] 解析metadata.edges失败:', error);
      }
    }
    
    // 创建执行节点数组
    const executionNodes: ExecutionNode[] = [];
    
    // 修复节点类型字段，处理可能的前端-后端字段命名不一致问题
    const getNodeType = (node: any): ExecutionNodeType => {
      // 获取节点类型，尝试多种可能的字段
      const type = node.type || node.data?.type || '';
      
      // 如果节点ID包含type前缀，可以从中提取
      if (typeof node.id === 'string' && node.id.includes('-')) {
        const idParts = node.id.split('-');
        if (idParts.length > 0 && ['start', 'workTask', 'worktask', 'display', 'assignment', 'assign', 'loop'].includes(idParts[0])) {
          // 规范化节点类型
          let normalizedType = idParts[0];
          // 向后兼容处理
          if (normalizedType === 'assignment') normalizedType = 'assign';
          if (normalizedType === 'workTask') normalizedType = 'worktask';
          
          console.log(`[WorkflowEngine] 从节点ID ${node.id} 推断类型为 ${normalizedType}`);
          return normalizedType as ExecutionNodeType;
        }
      }
      
      // 根据不同形式的类型名称进行标准化
      if (type === 'start' || type === 'startCard' || type === 'startNode') {
        return 'start';
      } else if (type === 'workTask' || type === 'workTaskCard' || type === 'task' || type === 'worktask') {
        return 'worktask';
      } else if (type === 'display' || type === 'displayCard') {
        return 'display';
      } else if (type === 'assignment' || type === 'assignmentCard' || type === 'variable' || type === 'assign') {
        return 'assign';
      } else if (type === 'loop' || type === 'loopCard' || type === 'condition') {
        return 'loop';
      }
      
      console.warn(`[WorkflowEngine] 未识别的节点类型 ${type}，节点:`, node);
      return type as ExecutionNodeType;
    };
    
    // 为每个节点创建执行节点对象
    nodes.forEach(node => {
      // 确定节点类型
      const nodeType = getNodeType(node);
      console.log(`[WorkflowEngine] 处理节点 ${node.id}, 类型: ${nodeType}`);
      
      // 获取节点图标
      const icon = this.getNodeIcon(nodeType);
      
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
      
      // 读取节点配置 - 修改为直接从节点的config属性读取，兼容ReactFlow数据格式
      // 1. 优先尝试从node.data?.config读取（ReactFlow格式）
      // 2. 如果没有，则尝试直接从node.config读取（后端存储格式）
      const nodeConfig = (node as any).data?.config || node.config || {};
      
      console.log(`[WorkflowEngine] 节点 ${node.id} 的配置来源:`, {
        '存在config字段': !!node.config,
        '存在data字段': !!(node as any).data,
        '存在data.config字段': !!(node as any).data?.config,
        '配置为空': Object.keys(nodeConfig).length === 0
      });
      
      // 详细输出节点配置信息
      if (nodeType === 'assign') {
        console.log(`[WorkflowEngine] 赋值节点 ${node.id} 的完整配置:`, {
          nodeConfig,
          'node.config': node.config,
          'node.data': (node as any).data,
          'node.data.config': (node as any).data?.config,
          '原始节点': { ...node }
        });
        
        // 特别检查assignments数组
        const assignments = nodeConfig?.assignments;
        console.log(`[WorkflowEngine] 赋值节点 ${node.id} 的assignments:`, 
          assignments ? JSON.stringify(assignments, null, 2) : '未找到assignments');
          
        if (!assignments) {
          console.warn(`[WorkflowEngine] 警告: 赋值节点 ${node.id} 缺少assignments配置`);
        }
      }
      
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
      console.log(`[WorkflowEngine] 节点 ${node.id} 的下一个节点ID: ${executionNode.nextNodeId || '无'}`);
      console.log(`[WorkflowEngine] 节点 ${node.id} 的连接数: ${nodeConnections.length}`);
      if (nodeConnections.length > 0) {
        nodeConnections.forEach((conn, idx) => {
          console.log(`[WorkflowEngine] - 连接 ${idx+1}: 目标节点=${conn.targetNodeId}, 标签=${conn.label || '无'}`);
        });
      }
      
      executionNodes.push(executionNode);
    });
    
    console.log('[WorkflowEngine] 构建完成, 执行节点:', executionNodes);
    return executionNodes;
  }
  
  /**
   * 获取节点图标
   * @param nodeType 节点类型
   * @returns 节点图标组件
   */
  static getNodeIcon(nodeType: ExecutionNodeType): ReactNode {
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
   * 保存起点输入到工作流变量
   * @param workflowId 工作流ID
   * @param workflowName 工作流名称
   * @param input 用户输入
   * @returns 是否保存成功
   */
  static async saveStartInput(
    workflowId: string,
    workflowName: string,
    input: string
  ): Promise<boolean> {
    try {
      await workflowVariableService.createOrUpdateWorkflowVariable(
        workflowId,
        workflowName,
        'startinput',
        input
      );
      
      console.log('用户输入已保存到startinput变量');
      return true;
    } catch (error) {
      console.error('保存用户输入失败:', error);
      return false;
    }
  }

  /**
   * 执行起点卡节点
   * @param node 节点
   * @returns 执行结果
   */
  static async executeStartNode(): Promise<Record<string, any>> {
    console.log('开始执行起点卡');
    // 起点卡执行很简单，只返回固定输出
    return {};
  }
  
  /**
   * 执行工作任务卡节点
   * @param node 执行节点
   * @param updateNode 节点状态更新函数
   * @returns 执行结果
   */
  static async executeWorkTaskNode(
    node: ExecutionNode,
    updateNode: (nodeId: string, status: string, output?: any) => void
  ): Promise<WorkTaskNodeOutput> {
    console.log(`开始执行工作任务卡: ${node.name}`);
    
    const { taskId, npcId } = node.config || {};
    
    // 尝试获取NPC信息
    let npcName = '';
    if (npcId) {
      try {
        // 真实项目中应从后端获取NPC信息
        // 这里我们简化处理，使用配置的NPC名称，如果没有则用"Unknown NPC"
        npcName = node.config.npcName || 'Unknown NPC';
      } catch (error) {
        console.error(`获取NPC信息失败: ${error}`);
        npcName = 'Unknown NPC';
      }
    }
    
    // 获取任务名称
    const taskName = node.config.taskName || node.name;
    
    // 模拟任务执行过程
    updateNode(node.id, 'executing', {
      npc: npcName,
      taskName,
      status: {
        progress: 10,
        state: 'running'
      }
    });
    
    // 延迟模拟进度更新
    await new Promise(resolve => setTimeout(resolve, 1000));
    updateNode(node.id, 'executing', {
      npc: npcName,
      taskName,
      status: {
        progress: 30,
        state: 'running'
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    updateNode(node.id, 'executing', {
      npc: npcName,
      taskName,
      status: {
        progress: 60,
        state: 'running'
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 返回最终执行结果
    return {
      npc: npcName,
      taskName,
      status: {
        progress: 100,
        state: 'completed'
      }
    };
  }
  
/**
 * 执行展示卡节点
 * @param node 执行节点
 * @param updateNode 节点状态更新函数
 * @param variables 工作流变量
 * @returns 执行结果
 */
static async executeDisplayNode(
  node: ExecutionNode,
  updateNode: (nodeId: string, status: string, output?: any) => void,
  variables: Record<string, any>
): Promise<DisplayNodeOutput> {
  const logger = createWorkflowEngineLogger();
  logger.info(`开始执行展示卡: ${node.name}`);
  
  // 验证节点配置
  if (!validateDisplayNode(node)) {
    logger.error(`展示卡 ${getNodeDebugId(node)} 配置无效`);
    return { 
      content: `展示卡配置无效: 请检查节点配置`, 
      animationComplete: true 
    };
  }
  
  // 获取节点配置
  const { variablePath, template, rawText, parsedContent, richContent, displayMode } = node.config || {};
  
  // 记录节点配置摘要
  logger.logObjectSummary(`展示卡 ${node.id} 配置摘要`, node.config, [
    'variablePath', 'template', 'displayMode'
  ]);
  
  try {
    // 使用VariableUtils处理内容
    const processResult = processContent(rawText, parsedContent, variables);
    
    // 初始更新 - 不显示内容
    updateNode(node.id, 'executing', { content: '', animationComplete: false });
    
    // 确保最终有内容显示
    if (!processResult.content) {
      logger.warn(`展示卡 ${getNodeDebugId(node)} 没有可显示内容，使用默认提示`);
      processResult.content = `展示卡内容为空，请检查配置。可用变量: ${Object.keys(variables).join(', ')}`;
    }
    
    // 记录最终输出内容统计
    logger.info(`展示卡 ${node.id} 最终输出:`, {
      内容来源: processResult.source,
      内容长度: processResult.content.length,
      存在未解析变量: processResult.hasUnresolvedVars
    });
    
    // 渐进式展示内容
    await displayContentProgressively(
      processResult.content,
      (content: string, animationComplete: boolean) => {
        updateNode(node.id, 'executing', { content, animationComplete });
      },
      processResult.hasUnresolvedVars // 如果有未解析变量，禁用动画
    );
    
    // 返回完整内容
    return { 
      content: processResult.content, 
      animationComplete: true 
    };
  } catch (error) {
    logger.error(`解析展示卡内容失败:`, error);
    return { 
      content: `展示卡内容解析错误: ${error instanceof Error ? error.message : String(error)}`, 
      animationComplete: true 
    };
  }
}
  
/**
 * 执行赋值卡节点
 * @param node 执行节点
 * @param variables 当前变量状态
 * @param updateVariables 更新变量状态的函数
 * @returns 执行结果
 */
static async executeAssignmentNode(
  node: ExecutionNode,
  variables: Record<string, any>,
  updateVariables: (newVars: Record<string, any>) => void
): Promise<Record<string, any>> {
  console.log(`[WorkflowEngine] 开始执行赋值卡，使用AssignmentNodeHandler`);
  
  try {
    // 导入模块，确保加载AssignmentNodeHandler
    const { AssignmentNodeHandler } = await import('./engine/nodes/AssignmentNode');
    
    // 创建赋值节点处理器
    const assignmentHandler = new AssignmentNodeHandler();
    
    // 存储节点输出数据
    let output: any = null;
    
    // 创建执行上下文
    const context: any = {
      variables: { ...variables }, // 创建变量的副本
      output: null, // 用于存储处理器生成的输出
      updateNode: (nodeId: string, updates: any) => {
        // 在这个上下文中，我们需要捕获output更新
        if (updates.output) {
          console.log(`[WorkflowEngine] 捕获赋值节点输出数据:`, updates.output);
          output = updates.output;
          context.output = updates.output; // 保存到上下文
        }
      },
      moveToNextNode: () => {
        // 不做任何事情，由调用者处理节点转换逻辑
      },
      onError: (nodeId: string, error: Error) => {
        console.error(`[WorkflowEngine] 赋值节点处理错误:`, error);
        throw error; // 重新抛出错误，以便调用者可以处理
      }
    };
    
    // 执行赋值节点处理器
    await assignmentHandler.execute(node, context);
    
    // 更新变量状态
    updateVariables(context.variables);
    
    // 如果没有输出，创建一个默认输出
    if (!output) {
      console.warn(`[WorkflowEngine] 赋值节点 ${node.id} 没有生成输出`);
      return { 
        assignments: [],
        variableContext: {
          variables: context.variables,
          displayIdMap: node.config?.displayIdMap || {},
          variableTypes: {}
        }
      };
    }
    
    console.log(`[WorkflowEngine] 赋值节点执行完成，输出:`, 
      JSON.stringify(output.assignments, null, 2));
    
    // 返回赋值节点处理器生成的输出
    return output;
  } catch (error) {
    console.error(`[WorkflowEngine] 使用AssignmentNodeHandler处理赋值节点失败:`, error);
    // 如果处理器执行失败，返回空结果
    return { 
      assignments: [],
      variableContext: {
        variables: variables,
        displayIdMap: node.config?.displayIdMap || {},
        variableTypes: {}
      }
    };
  }
}
  
  /**
   * 执行循环卡节点
   * @param node 执行节点
   * @param variables 当前变量状态
   * @returns 执行结果和下一个节点ID
   */
  static async executeLoopNode(
    node: ExecutionNode,
    variables: Record<string, any>
  ): Promise<{ output: any; nextNodeId: string | undefined; executionData?: any }> {
    console.log(`开始执行循环卡: ${node.name}`);
    
    const { conditionType, conditionConfig, yesNodeId, noNodeId } = node.config || {};
    
    // 获取执行数据
    const executionData = node.executionData || {};
    
    if (conditionType === 'runCount') {
      // 运行次数条件
      const maxRuns = conditionConfig?.maxRuns || 3;
      const runCount = (executionData.runCount || 0) + 1;
      
      // 更新执行数据
      const newExecutionData = { ...executionData, runCount };
      
      // 确定下一个节点
      const result = runCount < maxRuns ? 'yes' : 'no';
      const nextNodeId = result === 'yes' ? yesNodeId : noNodeId;
      
      return {
        output: {
          conditionType,
          runCount,
          maxRuns,
          result
        },
        nextNodeId,
        executionData: newExecutionData
      };
    } else if (conditionType === 'variableValue') {
      // 变量值条件
      const { variablePath, expectedValue } = conditionConfig || {};
      
      if (!variablePath) {
        throw new Error('未指定变量路径');
      }
      
      try {
        // 解析变量路径
        const varMatch = variablePath.match(/@([^.]+)\.([^#]+)(?:#([a-zA-Z0-9]+))?/);
        let actualValue = 'test';
        
        if (varMatch) {
          const sourceName = varMatch[1] as string;
          const sourceField = varMatch[2] as string;
          const key = `${sourceName}.${sourceField}`;
          
          // 从变量状态中获取实际值
          if (variables[key] !== undefined) {
            actualValue = variables[key];
          }
        }
        
        // 比较值
        const result = String(actualValue) === String(expectedValue) ? 'yes' : 'no';
        
        // 确定下一个节点
        const nextNodeId = result === 'yes' ? yesNodeId : noNodeId;
        
        return {
          output: {
            conditionType,
            variablePath,
            expectedValue,
            actualValue,
            result
          },
          nextNodeId
        };
      } catch (error) {
        console.error(`获取变量值失败: ${variablePath}`, error);
        // 默认走No路径
        return {
          output: {
            conditionType,
            variablePath,
            expectedValue,
            error: String(error),
            result: 'no'
          },
          nextNodeId: noNodeId
        };
      }
    } else {
      throw new Error(`未知的条件类型: ${conditionType}`);
    }
  }
}
