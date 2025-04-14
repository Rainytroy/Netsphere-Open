import React, { useCallback, useRef, useState, useEffect, useContext } from 'react';
import { message } from 'antd'; // 导入消息组件
import ReactFlow, {
  useViewport,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import './edges/CustomEdges.css'; // 导入自定义边样式
import { nodeTypes } from './nodes/CustomNodes';
import { edgeTypes } from './edges/CustomEdges'; // 导入自定义边类型
import NodeConfigPanel from './nodeConfig/NodeConfigPanel'; // 导入节点配置面板
// 移除编辑器上下文引用

// 初始节点和边
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

interface FlowCanvasProps {
  nodes?: Node[];
  edges?: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeConfig?: (nodeId: string, config: any) => void; // 节点配置回调
  onSaveWorkflow?: () => Promise<void>; // 工作流保存回调
  onUpdateEditorState?: (field: string, value: any) => void; // 编辑器状态更新回调
}

/**
 * 工作流画布组件
 * 使用React Flow实现可拖拽、可连线的工作流画布
 */
const FlowCanvas: React.FC<FlowCanvasProps> = ({
  nodes: externalNodes,
  edges: externalEdges,
  onNodesChange,
  onEdgesChange,
  onNodeConfig,
  onSaveWorkflow,
  onUpdateEditorState
}) => {
  // 如果提供了外部节点和边，使用它们；否则使用内部状态
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(externalNodes || initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(externalEdges || initialEdges);
  
  // 获取视口状态
  const { x, y, zoom } = useViewport();
  
  // 节点配置面板状态
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [configPanelVisible, setConfigPanelVisible] = useState<boolean>(false);
  
  console.log('[FlowCanvas] 初始化组件，节点数:', externalNodes?.length || 0);
  
  // 当外部节点变化时，更新内部状态
  useEffect(() => {
    if (externalNodes) {
      console.log('[FlowCanvas] 外部节点更新，数量:', externalNodes.length);
      setNodes(externalNodes);
    }
  }, [externalNodes, setNodes]);
  
  // 当外部边变化时，更新内部状态
  useEffect(() => {
    if (externalEdges) {
      console.log('[FlowCanvas] 外部边更新，数量:', externalEdges.length);
      setEdges(externalEdges);
    }
  }, [externalEdges, setEdges]);

  // 处理节点变化 - 修复状态同步问题
  const handleNodesChange = useCallback((changes: any) => {
    console.log('[FlowCanvas] 处理节点变化:', changes);
    onNodesChangeInternal(changes);
    
    // 使用React的状态更新队列机制，在下一个微任务更新父组件
    if (onNodesChange) {
      // 使用Promise.resolve()让这段代码在当前事件循环结束后运行
      Promise.resolve().then(() => {
        console.log('[FlowCanvas] 调用父组件的onNodesChange，节点数:', nodes.length);
        onNodesChange(nodes);
      });
    }
  }, [nodes, onNodesChange, onNodesChangeInternal]);

  // 处理边变化 - 修复状态同步问题
  const handleEdgesChange = useCallback((changes: any) => {
    console.log('[FlowCanvas] 处理边变化:', changes);
    onEdgesChangeInternal(changes);
    
    // 使用React的状态更新队列机制，在下一个微任务更新父组件
    if (onEdgesChange) {
      Promise.resolve().then(() => {
        console.log('[FlowCanvas] 调用父组件的onEdgesChange，边数:', edges.length);
        onEdgesChange(edges);
      });
    }
  }, [edges, onEdgesChange, onEdgesChangeInternal]);

  // 处理连接创建
  const onConnect = useCallback((connection: Connection) => {
    // 验证连接是否有效
    if (!connection.source || !connection.target) {
      console.error('[FlowCanvas] 无效连接: 缺少源或目标节点');
      return;
    }
    
    // 检查是否连接到自己
    if (connection.source === connection.target) {
      console.warn('[FlowCanvas] 阻止自连接:', connection);
      message.warning('不能将节点连接到自身');
      return;
    }
    
    // 判断连接类型 (常规/Yes/No)
    let edgeClassName = 'edge-regular';
    let edgeLabel = '';
    
    // 根据sourceHandle确定连接类型，用于循环节点的不同输出
    if (connection.sourceHandle === 'yes') {
      edgeClassName = 'edge-yes';
      edgeLabel = '是';
    } else if (connection.sourceHandle === 'no') {
      edgeClassName = 'edge-no';
      edgeLabel = '否';
    }
    
    try {
      // 创建新连接 - 添加自定义类型、标签和CSS类名
      const newEdge = {
        ...connection,
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        type: 'customAnimated', // 使用自定义动画边类型
        className: edgeClassName, // 添加适当的CSS类
        animated: true, // 设置动画标记
        label: edgeLabel, // 添加标签
        style: { stroke: '#cccccc' } // 基础样式，会被CSS类覆盖
      };
      
      // 添加新边并更新状态
      const newEdges = addEdge(newEdge, edges);
      setEdges(newEdges);
      
      // 通知父组件
      if (onEdgesChange) {
        onEdgesChange(newEdges);
      }
      
      // 显示成功消息
      message.success('连接创建成功');
    } catch (error) {
      console.error('[FlowCanvas] 创建连接失败:', error);
      message.error('创建连接失败');
    }
  }, [edges, onEdgesChange, setEdges]);

  // 引用和状态
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // 当ReactFlow实例初始化时更新本地状态
  const handleInit = useCallback((instance: any) => {
    console.log('[FlowCanvas] ReactFlow实例初始化');
    setReactFlowInstance(instance);
  }, []);
  
  // 处理拖动经过
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);
  
  // 处理节点点击，打开配置面板
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('[FlowCanvas] 节点点击:', node);
    setSelectedNode(node);
    setConfigPanelVisible(true);
  }, []);
  
  // 处理边删除
  const handleEdgeDelete = useCallback((edgeId: string) => {
    console.log('[FlowCanvas] 删除边:', edgeId);
    
    try {
      // 获取当前边的快照
      const currentEdges = [...edges];
      
      // 过滤掉要删除的边
      const updatedEdges = currentEdges.filter(edge => edge.id !== edgeId);
      
      // 判断是否有实际变化
      const edgesChanged = updatedEdges.length !== currentEdges.length;
      
      // 如果有边变化，才更新边状态
      if (edgesChanged) {
        // 更新边状态
        setEdges(updatedEdges);
        
        // 通知父组件边已更新
        if (onEdgesChange) {
          console.log('[FlowCanvas] 边删除后通知更新:', updatedEdges.length);
          onEdgesChange(updatedEdges);
        }
        
        // 显示成功消息
        message.success(`连接已从工作流中移除`);
      } else {
        console.warn('[FlowCanvas] 没有边被删除');
      }
    } catch (error) {
      console.error('[FlowCanvas] 删除边出错:', error);
      message.error('删除连接失败，请重试');
    }
  }, [edges, setEdges, onEdgesChange]);
  
  // 处理节点配置保存 - 仅负责更新节点配置
  const handleNodeConfigSave = useCallback((nodeId: string, config: any) => {
    console.log('[FlowCanvas] 保存节点配置:', nodeId, config);
    
    // 使用函数式更新确保获取最新状态
    setNodes(prev => {
      // 创建节点的深拷贝，避免引用问题
      const updatedNodes = prev.map(node => {
        if (node.id === nodeId) {
          // 更新节点的config属性
          return {
            ...node,
            data: {
              ...node.data,
              config
            }
          };
        }
        return node;
      });
      
      // 通知变更
      if (onNodesChange) {
        console.log('[FlowCanvas] 通知节点更新:', updatedNodes.length);
        onNodesChange(updatedNodes);
      }
      
      if (onNodeConfig) {
        console.log('[FlowCanvas] 通知节点配置变更:', nodeId);
        onNodeConfig(nodeId, config);
      }
      
      return updatedNodes;
    });
  }, [nodes, onNodeConfig, onNodesChange]);
  
// 处理节点删除
const handleNodeDelete = useCallback((nodeId: string) => {
  console.log('[FlowCanvas] 删除节点:', nodeId);
  
  try {
    // 获取当前状态的快照以确保一致性
    const currentNodes = [...nodes];
    const currentEdges = [...edges];
    
    // 过滤掉要删除的节点
    const updatedNodes = currentNodes.filter(node => node.id !== nodeId);
    
    // 过滤掉与删除节点相关的所有边
    const updatedEdges = currentEdges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    );
    
    // 关闭配置面板
    setConfigPanelVisible(false);
    
    // 判断是否有实际变化
    const nodesChanged = updatedNodes.length !== currentNodes.length;
    const edgesChanged = updatedEdges.length !== currentEdges.length;
    
    // 使用一个标志来跟踪更新
    let updated = false;
    
    // 如果有节点变化，才更新节点状态
    if (nodesChanged) {
      // 直接在ReactFlow内部更新节点，确保UI同步
      setNodes(updatedNodes);
      updated = true;
      
      // 通知父组件节点已更新
      if (onNodesChange) {
        console.log('[FlowCanvas] 节点删除后通知更新:', updatedNodes.length);
        onNodesChange(updatedNodes);
      }
    }
    
    // 如果有边变化，才更新边状态
    if (edgesChanged) {
      // 直接在ReactFlow内部更新边，确保UI同步
      setEdges(updatedEdges);
      updated = true;
      
      // 通知父组件边已更新
      if (onEdgesChange) {
        console.log('[FlowCanvas] 边删除后通知更新:', updatedEdges.length);
        onEdgesChange(updatedEdges);
      }
    }
    
    // 如果有任何更新，显示成功消息
    if (updated) {
      // 使用更明确的消息
      message.success(`节点已从工作流中移除`);
    } else {
      console.warn('[FlowCanvas] 没有节点被删除');
    }

    // 强制在下一个渲染周期重新布局
    if (reactFlowInstance && updated) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 50);
    }
  } catch (error) {
    console.error('[FlowCanvas] 删除节点出错:', error);
    message.error('删除节点失败，请重试');
  }
}, [nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, reactFlowInstance]);
  
  // 添加键盘事件和边删除按钮事件监听
  useEffect(() => {
    // 键盘Delete键处理函数
    const handleKeyDown = (event: KeyboardEvent) => {
      // 仅在按下Delete键时处理
      if (event.key === 'Delete') {
        // 检查当前悬停的元素
        const hoveredNode = document.querySelector('.react-flow__node:hover');
        const hoveredEdge = document.querySelector('.react-flow__edge:hover');
        
        if (hoveredNode) {
          // 获取节点ID
          const nodeId = hoveredNode.getAttribute('data-id');
          if (nodeId) {
            console.log('[FlowCanvas] 按Delete键删除节点:', nodeId);
            handleNodeDelete(nodeId);
          }
        } else if (hoveredEdge) {
          // 获取边ID
          const edgeId = hoveredEdge.getAttribute('data-id');
          if (edgeId) {
            console.log('[FlowCanvas] 按Delete键删除边:', edgeId);
            handleEdgeDelete(edgeId);
          }
        }
      }
    };
    
    // 边删除按钮点击处理函数
    const handleEdgeDeleteEvent = (event: CustomEvent) => {
      const edgeId = event.detail?.id;
      if (edgeId) {
        console.log('[FlowCanvas] 点击删除边按钮:', edgeId);
        handleEdgeDelete(edgeId);
      }
    };

    // 添加事件监听器
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('edge:delete', handleEdgeDeleteEvent as EventListener);
    
    // 组件卸载时移除事件监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('edge:delete', handleEdgeDeleteEvent as EventListener);
    };
  }, [handleNodeDelete, handleEdgeDelete]);
  
  // 处理拖放
  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    if (!reactFlowWrapper.current || !reactFlowInstance) {
      message.error('工作流编辑器未初始化');
      return;
    }
    
    try {
      // 获取卡片数据
      const cardJson = event.dataTransfer.getData('application/reactflow');
      if (!cardJson) {
        console.warn('[FlowCanvas] 无法获取拖放的卡片数据');
        return;
      }
      
      console.log('[FlowCanvas] 拖放卡片数据:', cardJson);
      const cardData = JSON.parse(cardJson);
      
      // 验证卡片数据
      if (!cardData.id || !cardData.title) {
        console.error('[FlowCanvas] 无效的卡片数据:', cardData);
        message.error('无效的节点数据');
        return;
      }
      
      // 获取画布位置和偏移
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      });
      
      // 生成唯一ID
      const nodeId = `${cardData.id}-${Date.now()}`;
      
      // 区分普通流程卡和工作任务卡
      let nodeType = cardData.id;  // 默认使用卡片ID作为节点类型
      let newNode;
      
      // 特殊处理工作任务卡类型，与handleCardSelect保持一致
      if (cardData.type === 'task') {
        nodeType = 'worktask';  // 使用固定的worktask类型，保证与NodeConfigPanel匹配
        
        // 对于工作任务卡，使用更清晰的数据结构
        newNode = {
          id: nodeId,
          type: nodeType,
          position,
          data: {
            label: cardData.title,
            id: cardData.id,
            type: cardData.type,
            title: cardData.title,
            description: cardData.description || '',
            // 同时设置taskId和workTaskId以支持新旧版本
            taskId: cardData.id,
            workTaskId: cardData.id,
            // 如果有可选属性，则复制
            ...(cardData.icon ? { icon: cardData.icon } : {}),
            ...(cardData.metadata ? { metadata: cardData.metadata } : {}),
            // 添加默认配置，包含ID信息，确保配置面板能正确使用
            config: {
              ...(cardData.config || {}),
              // 在config中也设置两种ID，确保执行引擎和配置面板都能访问
              taskId: cardData.id,
              workTaskId: cardData.id,
              // 添加节点名称信息
              taskName: cardData.title
            }
          }
        };
      } else {
        // 普通流程卡
        newNode = {
          id: nodeId,
          type: nodeType,
          position,
          data: { 
            label: cardData.title, 
            ...cardData,
            // 添加默认配置，防止配置面板报错
            config: cardData.config || {}
          }
        };
      }
      
      console.log('[FlowCanvas] 创建新节点:', newNode);
      
      // 使用函数式更新确保获取最新状态
      setNodes(prevNodes => {
        const updatedNodes = [...prevNodes, newNode];
        console.log('[FlowCanvas] 更新后的节点列表:', updatedNodes);
        
        // 使用Promise.resolve来确保状态已更新
        Promise.resolve().then(() => {
          if (onNodesChange) {
            console.log('[FlowCanvas] 通知父组件节点变化');
            onNodesChange(updatedNodes);
            
            // 显示成功消息
            message.success(`节点 ${cardData.title} 已添加`);
          }
        });
        
        return updatedNodes;
      });
    } catch (error) {
      console.error('[FlowCanvas] 创建节点失败:', error);
      message.error('添加节点失败');
    }
  }, [reactFlowInstance, onNodesChange, setNodes]);
  
  return (
    <div 
      ref={reactFlowWrapper} 
      style={{ width: '100%', height: '100%' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={handleInit}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background />
        <Controls position="bottom-right" style={{ bottom: 20, right: 20 }} />
        <MiniMap 
          position="top-right" 
          style={{ top: 70, right: 20 }}
          nodeColor={(node) => {
            switch(node.type) {
              case 'start': return '#059405';
              case 'assign': return '#1890ff';
              case 'loop': return '#fa8c16';
              case 'display': return '#722ed1';
              default: return '#6ede87';
            }
          }}
          maskColor="rgba(255, 255, 255, 0.6)"
        />
      </ReactFlow>
      
      {/* 节点配置面板 - 添加工作流相关属性 */}
      <NodeConfigPanel
        node={selectedNode}
        visible={configPanelVisible}
        onClose={() => setConfigPanelVisible(false)}
        onSave={handleNodeConfigSave}
        onDelete={handleNodeDelete}
        saveWorkflow={onSaveWorkflow} // 传递工作流保存方法
        updateEditorState={(field, value) => {
          // 记录更新请求
          console.log('[FlowCanvas] 节点请求更新编辑器状态:', field, value);
          
          // 调用父组件传入的更新函数
          if (typeof onUpdateEditorState === 'function') {
            onUpdateEditorState(field, value);
          } else {
            console.warn('[FlowCanvas] onUpdateEditorState未提供，状态更新将不会生效');
          }
        }}
      />
    </div>
  );
};

// 使用ReactFlowProvider包装导出组件
const FlowCanvasWithProvider: React.FC<FlowCanvasProps> = (props) => (
  <ReactFlowProvider>
    <FlowCanvas {...props} />
  </ReactFlowProvider>
);

export default FlowCanvasWithProvider;
