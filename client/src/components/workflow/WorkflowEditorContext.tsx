import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { message } from 'antd';
import workTaskService from '../../services/workTaskService';
import { CreateWorkflowParams, Workflow } from '../../services/workflowService';
import { CardData, CardType } from './CardSelector';
import { defaultProcessCards } from './defaultCards';
import { loadWorkflowData, calculateNodeCounts, prepareWorkflowData } from './WorkflowDataHandler';

// 上下文类型定义
interface WorkflowEditorContextType {
  // 状态
  name: string;
  description: string;
  isActive: boolean;
  isEditingName: boolean;
  cardPanelVisible: boolean;
  nodes: Node[];
  edges: Edge[];
  selectedCardCounts: Record<string, number>;
  taskCards: CardData[];
  
  // 设置状态的函数
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setIsActive: (isActive: boolean) => void;
  setIsEditingName: (isEditing: boolean) => void;
  toggleCardPanel: () => void;
  
  // 处理函数
  handleNodesChange: (updatedNodes: Node[]) => void;
  handleEdgesChange: (updatedEdges: Edge[]) => void;
  handleCardSelect: (card: CardData) => void;
  prepareFormData: () => CreateWorkflowParams;
  saveWorkflow: () => Promise<void>; // 新增：保存工作流方法
}

// 创建上下文
const WorkflowEditorContext = createContext<WorkflowEditorContextType | undefined>(undefined);

// 上下文提供者属性类型
interface WorkflowEditorProviderProps {
  children: React.ReactNode;
  workflow?: Workflow;
  onSave: (data: CreateWorkflowParams) => Promise<void>;
}

/**
 * 工作流编辑器上下文提供者
 * 管理工作流编辑器的所有状态和业务逻辑
 */
export const WorkflowEditorProvider: React.FC<WorkflowEditorProviderProps> = ({ 
  children, 
  workflow,
  onSave
}) => {
  // 基本信息状态
  const [name, setName] = useState<string>(workflow?.name || '未命名工作流');
  const [description, setDescription] = useState<string>(workflow?.description || '');
  const [isActive, setIsActive] = useState<boolean>(workflow?.isActive || false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [cardPanelVisible, setCardPanelVisible] = useState<boolean>(true);
  
  // 画布状态
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedCardCounts, setSelectedCardCounts] = useState<Record<string, number>>({});
  const [taskCards, setTaskCards] = useState<CardData[]>([]);
  
  // 初始化工作流数据
  useEffect(() => {
    if (workflow) {
      // 使用数据处理器加载工作流数据
      const { nodes: loadedNodes, edges: loadedEdges } = loadWorkflowData(workflow);
      
      if (loadedNodes.length > 0) {
        setNodes(loadedNodes);
      }
      
      if (loadedEdges.length > 0) {
        setEdges(loadedEdges);
      }
      
      // 计算节点使用计数
      const counts = calculateNodeCounts(loadedNodes);
      setSelectedCardCounts(counts);
    }
  }, [workflow]);
  
  // 加载工作任务数据
  useEffect(() => {
    const fetchWorkTasks = async () => {
      try {
        const tasks = await workTaskService.getAllWorkTasks();
        // 转换为CardData格式
        const taskCards = tasks.map(task => ({
          id: task.id,
          type: CardType.TASK,
          title: task.name,
          description: task.input || '无描述',
          usageCount: 0 // 初始使用计数为0
        }));
        setTaskCards(taskCards);
      } catch (error) {
        console.error('加载工作任务失败:', error);
        message.error('加载工作任务失败');
      }
    };
    
    fetchWorkTasks();
  }, []);
  
  // 切换卡片面板显示/隐藏
  const toggleCardPanel = useCallback(() => {
    setCardPanelVisible(prev => !prev);
  }, []);
  
  // 处理节点变化
  const handleNodesChange = useCallback((updatedNodes: Node[]) => {
    console.log('[WorkflowEditorContext] handleNodesChange 收到更新:', updatedNodes.length, '个节点');
    
    setNodes(updatedNodes);
    
    // 更新卡片使用计数
    const counts = calculateNodeCounts(updatedNodes);
    setSelectedCardCounts(counts);
  }, []);
  
  // 处理边变化
  const handleEdgesChange = useCallback((updatedEdges: Edge[]) => {
    setEdges(updatedEdges);
  }, []);
  
  // 处理卡片选择 - 优化以确保与拖放功能一致
  const handleCardSelect = useCallback((card: CardData) => {
    console.log('[WorkflowEditorContext] 点击选择卡片:', card.title, 'ID:', card.id);
    
    // 计算画布中心位置
    // 获取窗口大小，计算添加位置（考虑侧边栏宽度）
    const canvasWidth = window.innerWidth - (cardPanelVisible ? 300 : 0) - 80; // 左侧导航栏+卡片选择区
    const canvasHeight = window.innerHeight - 150; // 顶部导航+工具栏
    
    // 使用画布中心作为落点，略微随机化位置避免堆叠
    const position = { 
      x: canvasWidth / 2 + (Math.random() * 20 - 10),  // 添加小的随机偏移
      y: canvasHeight / 2 + (Math.random() * 20 - 10)
    };

    // 区分普通流程卡和工作任务卡
    let nodeType = card.id;  // 默认使用卡片ID作为节点类型
    
    // 构建新节点
    let newNode: Node;
    const timestamp = Date.now();
    
    // 特殊处理工作任务卡类型
    if (card.type === CardType.TASK) {
      nodeType = 'worktask';  // 使用固定的worktask类型，保证与NodeConfigPanel匹配
      
      // 对于工作任务卡，使用更清晰的数据结构
      newNode = {
        id: `${card.id}-${timestamp}`,
        type: nodeType,
        position: position,
        data: {
          label: card.title,
          id: card.id,
          type: card.type,
          title: card.title,
          description: card.description,
          usageCount: card.usageCount,
          taskId: card.id,  // 明确设置taskId以便配置面板使用
          // 如果有可选属性，则复制
          ...(card.icon ? { icon: card.icon } : {}),
          ...(card.metadata ? { metadata: card.metadata } : {})
        }
      };
    } else {
      // 普通流程卡
      newNode = {
        id: `${card.id}-${timestamp}`,
        type: nodeType,
        position: position,
        data: { 
          label: card.title,
          ...card  // 复制所有卡片数据
        }
      };
    }
    
    console.log('[WorkflowEditorContext] 创建新节点:', newNode);
    
    // 使用函数式更新以确保获取最新状态
    setNodes(prevNodes => {
      const updatedNodes = [...prevNodes, newNode];
      
      // 直接更新使用计数
      setSelectedCardCounts(prev => ({
        ...prev,
        [card.id]: (prev[card.id] || 0) + 1
      }));
      
      // 关键修改：在函数内部使用updatedNodes并设置更短的延迟时间
      setTimeout(() => {
        console.log('[WorkflowEditorContext] 通知节点变化');
        handleNodesChange(updatedNodes);
      }, 10);
      
      return updatedNodes;
    });
    
    message.success(`已添加 ${card.title} 到画布中心`);
  }, [cardPanelVisible, handleNodesChange]);
  
  // 准备表单数据
  const prepareFormData = useCallback(() => {
    return prepareWorkflowData(name, description, isActive, nodes, edges, workflow);
  }, [name, description, isActive, nodes, edges, workflow]);
  
  // 保存工作流 - 移除成功提示以避免重复
  const saveWorkflow = useCallback(async () => {
    try {
      console.log('[WorkflowEditorContext] 保存工作流');
      const data = prepareFormData();
      await onSave(data);
      // 移除成功提示，由调用者处理
      // message.success('工作流保存成功');
    } catch (error) {
      console.error('[WorkflowEditorContext] 保存工作流失败:', error);
      message.error('保存失败，请重试');
    }
  }, [prepareFormData, onSave]);
  
  // 上下文值
  const contextValue: WorkflowEditorContextType = {
    // 状态
    name,
    description,
    isActive,
    isEditingName,
    cardPanelVisible,
    nodes,
    edges,
    selectedCardCounts,
    taskCards,
    
    // 设置函数
    setName,
    setDescription,
    setIsActive,
    setIsEditingName,
    toggleCardPanel,
    
    // 处理函数
    handleNodesChange,
    handleEdgesChange,
    handleCardSelect,
    prepareFormData,
    saveWorkflow
  };
  
  return (
    <WorkflowEditorContext.Provider value={contextValue}>
      {children}
    </WorkflowEditorContext.Provider>
  );
};

// 自定义Hook - 使用上下文
export const useWorkflowEditor = () => {
  const context = useContext(WorkflowEditorContext);
  if (context === undefined) {
    throw new Error('useWorkflowEditor must be used within a WorkflowEditorProvider');
  }
  return context;
};
