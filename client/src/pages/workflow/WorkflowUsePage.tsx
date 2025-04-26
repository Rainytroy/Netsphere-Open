import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Typography, 
  Input, 
  Button, 
  Spin, 
  Space, 
  Divider, 
  message, 
  Card, 
  Row, 
  Col 
} from 'antd';
import { 
  ArrowLeftOutlined, 
  EditOutlined, 
  SaveOutlined, 
  PlayCircleOutlined, 
  StopOutlined, 
  DownloadOutlined 
} from '@ant-design/icons';
import WorkflowHeader from './components/WorkflowHeader';
import InputSection from './components/InputSection';
import OutputSection from './components/OutputSection';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { workflowService, Workflow } from '../../services/workflowService';
import { workflowVariableService } from '../../services/workflowVariableService';
import ExecutionNodeCard from './components/ExecutionNodeCard';
import { WorkflowEngine } from './WorkflowEngine';
import { ExecutionNode as BaseExecutionNode, NodeStatus } from './types';
import { Variable } from './interfaces/Variable';
import { NodeCompletionManager } from './engine/utils/NodeCompletionManager';
import { ExecutionManager } from './engine/ExecutionManager';

// 在组件外部扩展Window接口
declare global {
  interface Window {
    workTaskCompletionNotifier?: {
      callbacks?: Map<string, () => void>;
      registerTaskCompletion: (nodeId: string, callback: () => void) => void;
      notifyTaskCompletion: (nodeId: string) => void;
    };
    manualCompleteWorkTaskNode?: (nodeId: string) => void;
  }
}

// 扩展ExecutionNode接口，添加页面特有的属性
interface ExecutionNode extends BaseExecutionNode {
  nextNodeId?: string; // 下一个节点ID
  icon?: React.ReactNode; // 节点图标
}

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * 工作流使用页面
 * 提供工作流运行界面，分为用户输入和系统输出两个区域
 */
const WorkflowUsePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // 基础状态
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userInput, setUserInput] = useState('');
  
  // 执行引擎相关状态
  const [executionNodes, setExecutionNodes] = useState<ExecutionNode[]>([]);
  const [currentNodeIndex, setCurrentNodeIndex] = useState<number>(-1);
  const [workflowVariables, setWorkflowVariables] = useState<Record<string, any>>({});
  const [executionId, setExecutionId] = useState<string>('');
  const [executionComplete, setExecutionComplete] = useState<boolean>(false);
  const [workflowStructure, setWorkflowStructure] = useState<any>(null);
  // 用户主动停止状态标记 - 用于判断是否显示继续按钮
  const [userStoppedExecution, setUserStoppedExecution] = useState(false);
  // 显示模式 - 详细/精简
  const [displayMode, setDisplayMode] = useState<'simple' | 'detailed'>('detailed');
  
  // 切换显示模式
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'simple' ? 'detailed' : 'simple');
  };
  
  // 强制重置所有循环节点的计数
  const forceResetLoopCounters = () => {
    setExecutionNodes(prev => 
      prev.map(node => {
        if (node.type === 'loop') {
          // 确保重置循环计数
          return {
            ...node,
            executionData: { 
              ...(node.executionData || {}),
              runCount: 0,
              variables: (node.executionData?.variables || {})
            }
          };
        }
        return node;
      })
    );
  };
  
  // 加载工作流数据
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const data = await workflowService.getWorkflow(id);
        setWorkflow(data);
        
        // 加载工作流变量
        const variables = await workflowVariableService.getWorkflowVariables(id);
        
        // 转换为简单键值对，使用 "sourceName.field" 作为键
        const variablesMap: Record<string, any> = {};
        variables.forEach((v: any) => {
          // 确保变量有source属性
          if (v.source) {
            // 如果是工作流的startinput变量，则直接存储到 "startinput" 键
            if (v.source.type === 'workflow' && v.fieldname === 'startinput') {
              variablesMap.startinput = v.value;
            } else {
              // 其他变量使用 "sourceName.fieldname" 作为键
              const sourceName = v.source.name;
              const field = v.fieldname;
              const key = `${sourceName}.${field}`;
              
              variablesMap[key] = v.value;
            }
          }
        });
        
        setWorkflowVariables(variablesMap);
      } catch (error) {
        console.error('加载工作流失败:', error);
        message.error('加载工作流失败，请重试');
        navigate('/workflow');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkflow();
  }, [id, navigate]);
  
  // 返回编辑页面
  const handleBack = () => {
    navigate('/workflow');
  };
  
  // 编辑工作流
  const handleEdit = () => {
    navigate(`/workflow/${id}/edit`);
  };
  
  // 保存工作流结果
  const handleSave = () => {
    message.success('工作流使用记录已保存');
  };
  
  // 更新节点状态
  const updateNodeStatus = (
    nodeId: string, 
    status: string,
    output?: any
  ) => {
    setExecutionNodes(prev => 
      prev.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            status: status as NodeStatus,
            output: output ? { ...node.output, ...output } : node.output
          };
        }
        return node;
      })
    );
  };
  
  // 保存用户输入到startinput变量
  const saveStartInput = async (input: string): Promise<boolean> => {
    if (!id || !workflow) return false;
    
    try {
      // 更新本地状态
      const variables = {...workflowVariables, startinput: input};
      setWorkflowVariables(variables);
      
      // 更新服务器变量
      await WorkflowEngine.saveStartInput(id, workflow.name, input);
      return true;
    } catch (error) {
      console.error('保存用户输入失败:', error);
      message.error('保存输入失败，请重试');
      return false;
    }
  };
  
  // 执行单个节点
  const executeNode = async (nodeId: string) => {
    // 找到当前要执行的节点
    const nodeIndex = executionNodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) return;
    
    // 更新当前节点状态为执行中
    setCurrentNodeIndex(nodeIndex);
    updateNodeStatus(nodeId, 'executing');
    
    // 获取节点信息
    const node = executionNodes[nodeIndex];
    
    try {
      let output;
      let nextNodeId;
      
      // 根据节点类型执行不同逻辑
      switch (node.type) {
        case 'start':
          output = await WorkflowEngine.executeStartNode();
          nextNodeId = node.nextNodeId;
          break;
        case 'worktask':
          // 创建一个节点完成的Promise，确保在变量同步完成后再继续
          output = await new Promise<any>(async (resolve) => {
            // 注册一个任务完成通知器，在工作任务真正完成后触发
            if (window.workTaskCompletionNotifier) {
              window.workTaskCompletionNotifier.registerTaskCompletion(nodeId, () => {
                // 从当前节点状态获取最终输出
                const currentNode = executionNodes.find(n => n.id === nodeId);
                resolve(currentNode?.output);
              });
            }
            
            // 执行工作任务节点，但不直接等待其最终完成
            try {
              const initialOutput = await WorkflowEngine.executeWorkTaskNode(node, updateNodeStatus);
              
              // 如果通知器不存在，直接解析Promise
              if (!window.workTaskCompletionNotifier) {
                console.warn('工作任务完成通知器不存在，直接继续执行');
                resolve(initialOutput);
              }
            } catch (error) {
              console.error(`执行工作任务出错:`, error);
              // 出错时也要解析Promise，防止工作流卡住
              resolve(null);
            }
          });
          
          nextNodeId = node.nextNodeId;
          break;
        case 'display':
          output = await WorkflowEngine.executeDisplayNode(node, updateNodeStatus, workflowVariables);
          nextNodeId = node.nextNodeId;
          break;
        case 'assign':
          // 定义更新变量的回调函数
          const updateVariables = (newVars: Record<string, any>) => {
            setWorkflowVariables(newVars);
          };
          
          output = await WorkflowEngine.executeAssignmentNode(node, workflowVariables, updateVariables);
          nextNodeId = node.nextNodeId;
          break;
        case 'loop':
          // 1. 首先获取并记录当前节点的执行数据
          const currentExecutionData = node.executionData || { variables: {} };
          
          // 2. 手动增加runCount (关键修复)
          const currentRunCount = typeof currentExecutionData.runCount === 'number' ? currentExecutionData.runCount : 0;
          const newRunCount = currentRunCount + 1;
          
          // 3. 创建更新后的执行数据，确保包含必需的variables属性
          const updatedExecutionData = { 
            ...currentExecutionData, 
            runCount: newRunCount,
            variables: currentExecutionData.variables || {}  // 确保有variables属性
          };
          
          // 4. 立即更新当前节点实例的执行数据(这是关键步骤)
          node.executionData = updatedExecutionData;
          
          
          // 6. 调用引擎执行循环逻辑，传入已更新的节点
          const result = await WorkflowEngine.executeLoopNode(node, workflowVariables);
          output = result.output;
          nextNodeId = result.nextNodeId;
          
          // 7. 将更新后的节点同步到React状态(仅用于UI显示，不影响计数逻辑)
          setExecutionNodes(prev => 
            prev.map(n => {
              if (n.id === node.id) {
                return { ...n, executionData: updatedExecutionData };
              }
              return n;
            })
          );
          break;
      }
      
      // 调用NodeCompletionManager处理节点完成
      const shouldContinueToNextNode = NodeCompletionManager.handleNodeCompletion(
        node, 
        output, 
        updateNodeStatus
      );
      
      // 根据节点处理结果决定后续流程
      if (shouldContinueToNextNode && nextNodeId) {
        setTimeout(() => executeNode(nextNodeId), 500); // 给UI一个短暂的延迟
      } else if (!shouldContinueToNextNode) {
        // 等待手动触发或其他事件
      } else {
        // 工作流执行完成
        setExecutionComplete(true);
        setIsRunning(false);
        // 清除用户停止标记，确保完成后显示"运行"按钮而不是"继续"和"重新开始"
        setUserStoppedExecution(false);
        
        // 重要：强制重置所有循环节点计数，确保下次运行时从0开始
        forceResetLoopCounters();
      }
    } catch (error) {
      console.error(`节点 ${node.name} 执行失败:`, error);
      updateNodeStatus(nodeId, 'error', { error: error instanceof Error ? error.message : String(error) });
      setIsRunning(false);
    }
  };
  
  // 使用location.key来监听路由变化
  const location = useLocation();
  
  // 页面聚焦或路由变化时，清除缓存的工作流结构
  useEffect(() => {
    // 清除缓存，确保每次从编辑页面返回时都能获取最新结构
    setWorkflowStructure(null);
    setIsInitialized(false);
  }, [location.key]);
  
// 初始化工作任务完成通知器并添加全局手动完成节点函数
// 使用空依赖项，确保只在组件首次渲染时执行一次
useEffect(() => {
    // 创建工作任务完成通知器（如果不存在）
    if (!window.workTaskCompletionNotifier) {
      window.workTaskCompletionNotifier = {
        // 回调函数映射 nodeId -> callback
        callbacks: new Map<string, () => void>(),
        
        // 注册任务完成回调
        registerTaskCompletion: function(nodeId: string, callback: () => void) {
          if (this.callbacks) {
            this.callbacks.set(nodeId, callback);
          }
        },
        
        // 触发任务完成通知
        notifyTaskCompletion: function(nodeId: string) {
          if (!this.callbacks) return;
          
          const callback = this.callbacks.get(nodeId);
          if (callback) {
            this.callbacks.delete(nodeId); // 执行一次后删除回调
            callback();
          } else {
            console.warn(`未找到节点 ${nodeId} 的完成回调`);
          }
        }
      };
    }
    
    // 定义手动完成工作任务节点的函数
    window.manualCompleteWorkTaskNode = (nodeId: string) => {
      // 找到节点
      const node = executionNodes.find(n => n.id === nodeId);
      if (!node) {
        console.error(`未找到节点: ${nodeId}`);
        return;
      }
      
      // 确保节点处于同步状态
      if (node.status !== 'syncing') {
        console.warn(`节点 ${nodeId} 不处于同步状态，当前状态: ${node.status}`);
        return;
      }
      
      try {
        // 记录手动完成时间
        const manualCompleteTime = Date.now();
        const timeFormatted = new Date(manualCompleteTime).toISOString();
        
        // 获取当前节点输出 - 使用node.output而不是executionData.finalOutput
        const nodeOutput = node.output || {};
        
        // 增强节点输出，添加手动完成信息，同时更新内部状态字段
        const enhancedOutput = {
          ...nodeOutput,
          manualCompletion: {
            completedAt: timeFormatted,
            completedBy: 'user'
          },
          // 重要：确保output.status.state也被设置为completed
          status: {
            ...(nodeOutput.status || {}),
            state: 'completed',
            progress: 100
          }
        };
        
        // 直接更新节点状态，保证状态更新生效
        setExecutionNodes(prev => 
          prev.map(n => {
            if (n.id === nodeId) {
              return {
                ...n,
                status: 'completed',
                output: enhancedOutput
              };
            }
            return n;
          })
        );
        
        // 获取下一个节点ID，准备手动继续执行
        const nextNodeId = node.nextNodeId;

        // 确保节点状态立即反映到UI - 强制刷新
        // 这是关键修复：再次强制更新状态为completed，防止被其他地方覆盖
        setTimeout(() => {
          setExecutionNodes(prev => 
            prev.map(n => {
              if (n.id === nodeId) {
                return {
                  ...n,
                  status: 'completed',
                  output: {
                    ...enhancedOutput,
                    // 确保输出内部状态也为completed
                    status: {
                      ...(enhancedOutput.status || {}),
                      state: 'completed',
                      progress: 100
                    }
                  }
                };
              }
              return n;
            })
          );
        }, 100);

        // 触发通知，使工作流继续执行
        if (window.workTaskCompletionNotifier) {
          window.workTaskCompletionNotifier.notifyTaskCompletion(nodeId);
          
          // 手动触发执行下一个节点 - 不依赖NodeCompletionManager的逻辑
          if (nextNodeId) {
            // 使用稍长的延迟，确保状态更新已经应用
            setTimeout(() => {
              executeNode(nextNodeId);
            }, 500);
          } else {
            setExecutionComplete(true);
            setIsRunning(false);
          }
        } else {
          console.error(`工作任务完成通知器不存在`);
        }
      } catch (error) {
        console.error(`手动完成节点出错:`, error);
      }
    };
    
    // 组件卸载时清除全局函数
    return () => {
      delete window.manualCompleteWorkTaskNode;
      // 注意：不删除workTaskCompletionNotifier，因为其他组件可能仍在使用它
    };
  }, [executionNodes, updateNodeStatus]);

  // 预热工作流执行环境
  useEffect(() => {
    const preloadWorkflowEnvironment = async () => {
      if (!id || !workflow || isInitialized || isInitializing) return;
      
      try {
        setIsInitializing(true);
        
        // 提前获取工作流结构
        const structure = await workflowService.getWorkflowStructure(id);
        
        // 检查并验证结构
        if (!structure.nodes || structure.nodes.length === 0) {
          console.warn('工作流结构中没有节点数据');
          return;
        }
        
        // 预构建执行节点
        const allNodes = WorkflowEngine.buildExecutionFlow(structure);
        
        // 保存工作流结构和预构建的节点
        setExecutionNodes(allNodes);
        
        // 初始化完成
        setIsInitialized(true);
      } catch (error) {
        console.error('预热工作流执行环境失败:', error);
        // 即使预热失败，也不阻止用户尝试运行
        setIsInitialized(true);
      } finally {
        setIsInitializing(false);
      }
    };
    
    preloadWorkflowEnvironment();
  }, [id, workflow, isInitialized, isInitializing]);
  
  // 准备并运行工作流的核心逻辑
  const prepareAndRunWorkflow = async () => {
    if (!id || !workflow) return false;
    
    try {
      // 1. 清空并重置核心状态
      setExecutionNodes([]);
      setCurrentNodeIndex(-1);
      setExecutionComplete(false);
      setIsInitialized(false);  // 清除预热状态
      
      // 2. 保存用户输入到工作流变量
      const saveSuccess = await saveStartInput(userInput);
      if (!saveSuccess) {
        return false;
      }
      
      // 3. 使用ExecutionManager准备执行环境
      const allNodes = await ExecutionManager.prepareExecution(id);
      
      // 4. 更新节点状态
      setExecutionNodes(allNodes);
      
      // 4.1 强制重置所有循环节点计数
      forceResetLoopCounters();
      
      // 5. 查找起点节点
      const startNode = ExecutionManager.findStartNode(allNodes);
      if (!startNode) {
        message.error('工作流中未找到起点卡');
        return false;
      }
      
      // 6. 延迟执行确保React状态更新完成
      setTimeout(() => executeNode(startNode.id), 100);
      
      return true;
    } catch (error) {
      console.error('[WorkflowUsePage] 准备工作流执行失败:', error);
      message.error('工作流准备失败: ' + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  };
  
  // 重新开始工作流 - 强制重置所有状态
  const handleRestart = async () => {
    if (!userInput.trim()) {
      message.warning('请输入内容');
      return;
    }
    
    if (!id || !workflow) {
      message.error('工作流信息不完整，无法运行');
      return;
    }
    
    // 1. 强制重置所有状态
    setIsInitialized(false);
    setWorkflowStructure(null);
    setExecutionComplete(false);
    setCurrentNodeIndex(-1);
    setExecutionNodes([]);
    setUserStoppedExecution(false); // 清除用户停止标记
    
    // 2. 设置为运行状态
    setIsRunning(true);
    
    // 3. 保存用户输入到startinput变量
    const saveSuccess = await saveStartInput(userInput);
    if (!saveSuccess) {
      setIsRunning(false);
      return;
    }
    
    // 4. 确保执行新的预热
    try {
      // 使用ExecutionManager准备执行环境，确保所有节点都是全新的
      const allNodes = await ExecutionManager.prepareExecution(id);
      
      // 更新节点状态
      setExecutionNodes(allNodes);
      
      // 3.1 强制重置所有循环节点计数
      forceResetLoopCounters();
      
      // 4. 查找起点节点并开始执行
      const startNode = ExecutionManager.findStartNode(allNodes);
      if (!startNode) {
        message.error('工作流中未找到起点卡');
        setIsRunning(false);
        return;
      }
      
      // 5. 延迟执行确保React状态更新完成
      setTimeout(() => executeNode(startNode.id), 100);
      
    } catch (error) {
      console.error('[WorkflowUsePage] 重新运行工作流失败:', error);
      message.error('工作流重新运行失败: ' + (error instanceof Error ? error.message : String(error)));
      setIsRunning(false);
    }
  };
  
  // 运行工作流 - 处理初次运行或继续执行
  const handleRun = async () => {
    if (!userInput.trim()) {
      message.warning('请输入内容');
      return;
    }
    
    if (!id || !workflow) {
      message.error('工作流信息不完整，无法运行');
      return;
    }
    
    // 设置为运行状态
    setIsRunning(true);
    
    // 1. 首先保存用户输入（无论是继续执行还是初次运行）
    const saveSuccess = await saveStartInput(userInput);
    if (!saveSuccess) {
      setIsRunning(false);
      return;
    }
    
    // 2. 然后判断是继续执行还是初次运行
    const isResuming = executionNodes.length > 0 && !executionComplete;
    
    if (isResuming) {
      // 继续执行: 查找可继续执行的节点
      
      // 先将执行中的节点改为等待状态
      const updatedNodes = ExecutionManager.markNodesAsPaused(executionNodes);
      setExecutionNodes(updatedNodes);
      
      // 查找可继续的节点
      const waitingNodeIndex = ExecutionManager.findNextWaitingNodeIndex(updatedNodes);
      
      if (waitingNodeIndex >= 0) {
        // 发现可继续的节点，开始执行
        setCurrentNodeIndex(waitingNodeIndex);
        setTimeout(() => executeNode(updatedNodes[waitingNodeIndex].id), 100);
      } else {
        message.warning('没有可继续的节点，请点击重新开始按钮');
        setIsRunning(false);
      }
    } else {
      // 初次运行: 从头开始执行
      
      // 非继续执行模式下，强制重置循环计数，防止上次运行的计数影响
      forceResetLoopCounters();
      
      const success = await prepareAndRunWorkflow();
      if (!success) {
        setIsRunning(false);
      }
    }
  };
  
  // 停止工作流运行 - 保留当前状态
  const handleStop = () => {
    // 设置为非运行状态
    setIsRunning(false);
    
    // 设置用户主动停止标记 - 这会显示继续和重新开始按钮
    setUserStoppedExecution(true);
    
    // 将正在执行的节点标记为等待状态
    setExecutionNodes(prev => 
      prev.map(node => {
        if (node.status === 'executing') {
          return { ...node, status: 'waiting' };
        }
        return node;
      })
    );
    
    message.info('工作流已暂停，可以点击继续按钮或重新开始按钮');
  };
  
  // 导出Markdown
  const handleExportMarkdown = () => {
    if (!executionNodes.length) return;
    
    // 收集所有展示卡的内容
    const displayNodes = executionNodes.filter(node => node.type === 'display' && node.output?.content);
    const content = displayNodes.map(node => node.output?.content || '').join('\n\n---\n\n');
    
    if (!content) {
      message.warning('没有可导出的内容');
      return;
    }
    
    // 创建下载链接
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${workflow?.name || 'workflow'}-output.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    message.success('已导出为Markdown文件');
  };
  
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin tip="加载工作流..." size="large" />
      </div>
    );
  }
  
  if (!workflow) {
    return null;
  }
  

  return (
    <Layout style={{ height: '100%', background: 'white' }}>
      {/* 顶部标题和操作区 */}
      <WorkflowHeader 
        workflow={workflow} 
        onBack={handleBack} 
        onEdit={handleEdit} 
        onSave={handleSave} 
      />
        
      {/* 主使用区域 */}
      <Layout style={{ height: 'calc(100% - 76px)', background: 'white' }}>
        <Row style={{ height: '100%' }}>
          {/* 内部组件已包含Col，不需要额外的Col */}
          <InputSection 
            workflow={workflow}
            userInput={userInput}
            setUserInput={setUserInput}
            isRunning={isRunning}
            isInitializing={isInitializing}
            onRun={handleRun}
            onStop={handleStop}
            onRestart={handleRestart}
            executionNodes={executionNodes}
            executionComplete={executionComplete}
            userStoppedExecution={userStoppedExecution}
          />
          
          {/* 系统输出区 */}
          <OutputSection 
            executionNodes={executionNodes}
            currentNodeIndex={currentNodeIndex}
            isRunning={isRunning}
            onExport={handleExportMarkdown}
            displayMode={displayMode}
            onToggleDisplayMode={toggleDisplayMode}
          />
        </Row>
      </Layout>
    </Layout>
  );
};

export default WorkflowUsePage;
