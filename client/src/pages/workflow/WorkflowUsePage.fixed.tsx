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
import { useNavigate, useParams } from 'react-router-dom';
import { workflowService, Workflow } from '../../services/workflowService';
import { workflowVariableService } from '../../services/workflowVariableService';
import ExecutionNodeCard from './components/ExecutionNodeCard';
import { WorkflowEngine } from './WorkflowEngine';
import { ExecutionNode, ExecutionNodeStatus } from './types';
import { Variable } from './interfaces/Variable';

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
  const [userInput, setUserInput] = useState('');
  
  // 执行引擎相关状态
  const [executionNodes, setExecutionNodes] = useState<ExecutionNode[]>([]);
  const [currentNodeIndex, setCurrentNodeIndex] = useState<number>(-1);
  const [workflowVariables, setWorkflowVariables] = useState<Record<string, any>>({});
  const [executionId, setExecutionId] = useState<string>('');
  const [executionComplete, setExecutionComplete] = useState<boolean>(false);
  
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
            status: status as ExecutionNodeStatus,
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
      
      console.log('用户输入已保存到startinput变量');
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
        case 'workTask':
          output = await WorkflowEngine.executeWorkTaskNode(node, updateNodeStatus);
          nextNodeId = node.nextNodeId;
          break;
        case 'display':
          output = await WorkflowEngine.executeDisplayNode(node, updateNodeStatus, workflowVariables);
          nextNodeId = node.nextNodeId;
          break;
        case 'assignment':
          // 定义更新变量的回调函数
          const updateVariables = (newVars: Record<string, any>) => {
            setWorkflowVariables(newVars);
          };
          
          output = await WorkflowEngine.executeAssignmentNode(node, workflowVariables, updateVariables);
          nextNodeId = node.nextNodeId;
          break;
        case 'loop':
          const result = await WorkflowEngine.executeLoopNode(node, workflowVariables);
          output = result.output;
          nextNodeId = result.nextNodeId;
          
          // 如果有更新的执行数据，保存到节点
          if (result.executionData) {
            setExecutionNodes(prev => 
              prev.map(n => {
                if (n.id === node.id) {
                  return { ...n, executionData: result.executionData };
                }
                return n;
              })
            );
          }
          break;
      }
      
      // 更新节点状态为已完成
      updateNodeStatus(nodeId, 'completed', output);
      
      // 如果有下一个节点，继续执行
      if (nextNodeId) {
        setTimeout(() => executeNode(nextNodeId), 500); // 给UI一个短暂的延迟
      } else {
        // 工作流执行完成
        setExecutionComplete(true);
        setIsRunning(false);
      }
    } catch (error) {
      console.error(`节点 ${node.name} 执行失败:`, error);
      updateNodeStatus(nodeId, 'error', { error: error instanceof Error ? error.message : String(error) });
      setIsRunning(false);
    }
  };
  
  // 运行工作流
  const handleRun = async () => {
    if (!userInput.trim()) {
      message.warning('请输入内容');
      return;
    }
    
    if (!id || !workflow) {
      message.error('工作流信息不完整，无法运行');
      return;
    }
    
    setIsRunning(true);
    setExecutionNodes([]);
    setCurrentNodeIndex(-1);
    setExecutionComplete(false);
    
    try {
      // 保存用户输入到工作流变量
      const saveSuccess = await saveStartInput(userInput);
      if (!saveSuccess) {
        setIsRunning(false);
        return;
      }
      
      // 获取工作流结构
      const structure = await workflowService.getWorkflowStructure(id);
      
      // 构建执行节点图
      const nodes = WorkflowEngine.buildExecutionFlow(structure);
      setExecutionNodes(nodes);
      
      // 开始执行，从起点卡开始
      const startNode = nodes.find(n => n.type === 'start');
      if (startNode) {
        await executeNode(startNode.id);
      } else {
        message.error('工作流中未找到起点卡');
        setIsRunning(false);
      }
    } catch (error) {
      console.error('工作流执行失败:', error);
      message.error('工作流执行失败');
      setIsRunning(false);
    }
  };
  
  // 停止工作流运行
  const handleStop = () => {
    setIsRunning(false);
    message.info('工作流已停止运行');
  };
  
  // 导出Markdown
  const handleExportMarkdown = () => {
    if (!executionNodes.length) return;
    
    // 收集所有展示卡的内容
    const displayNodes = executionNodes.filter(node => node.type === 'display' && node.output?.content);
    const content = displayNodes.map(node => node.output.content).join('\n\n---\n\n');
    
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
      {/* 顶部标题导航区域 */}
      <div style={{ marginBottom: 16, background: 'white' }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ArrowLeftOutlined 
                onClick={handleBack} 
                style={{ fontSize: 16, marginRight: 16, cursor: 'pointer' }}
              />
              <Title level={4} style={{ margin: 0 }}>
                使用: <span style={{ marginLeft: 8 }}>{workflow.name}</span>
              </Title>
            </div>
            
            <Space>
              <Button 
                type="primary" 
                icon={<EditOutlined />} 
                onClick={handleEdit}
              >
                编辑
              </Button>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
              >
                保存
              </Button>
            </Space>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
        
      {/* 主使用区域 */}
      <Layout style={{ height: 'calc(100% - 76px)', background: 'white' }}>
        <Row style={{ height: '100%' }}>
          {/* 用户输入区 */}
          <Col span={8} style={{ height: '100%', padding: '0 12px 0 0' }}>
            <Card 
              title={<Title level={4} style={{ margin: 0 }}>用户输入</Title>}
              bordered={true}
              style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'none'
              }}
              bodyStyle={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'auto'
              }}
            >
              <div style={{ flex: 1 }}>
                <Paragraph>
                  {workflow.description || '请在下方输入框中提供您的需求'}
                </Paragraph>
                <TextArea
                  placeholder="请输入内容..."
                  value={userInput}
                  onChange={e => setUserInput(e.target.value)}
                  autoSize={{ minRows: 6, maxRows: 12 }}
                  disabled={isRunning}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  {isRunning ? (
                    <Button 
                      type="primary" 
                      danger 
                      onClick={handleStop}
                      icon={<StopOutlined />}
                    >
                      停止
                    </Button>
                  ) : (
                    <Button 
                      type="primary"
                      onClick={handleRun}
                      icon={<PlayCircleOutlined />}
                    >
                      运行
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </Col>
          
          {/* 系统输出区 */}
          <Col span={16} style={{ height: '100%', padding: '0 0 0 12px' }}>
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Title level={4} style={{ margin: 0 }}>系统输出</Title>
                  {executionNodes.length > 0 && !isRunning && (
                    <Space>
                      <Button 
                        icon={<DownloadOutlined />} 
                        onClick={handleExportMarkdown}
                      >
                        导出Markdown
                      </Button>
                    </Space>
                  )}
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
                  {executionNodes.map((node, index) => (
                    <ExecutionNodeCard
                      key={node.id}
                      node={node}
                      isActive={index === currentNodeIndex}
                    />
                  ))}
                  {isRunning && (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                      <Spin tip="执行中..." />
                    </div>
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Layout>
    </Layout>
  );
};

export default WorkflowUsePage;
