import React, { useState, useEffect } from 'react';
import { Layout, Typography, Input, Button, Spin, Space, Divider, message, Card, Row, Col } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { workflowService, Workflow } from '../../services/workflowService';
import ReactMarkdown from 'react-markdown';

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
  
  // 状态
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [systemOutput, setSystemOutput] = useState<string[]>([]);
  const [currentOutput, setCurrentOutput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // 加载工作流数据
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const data = await workflowService.getWorkflow(id);
        setWorkflow(data);
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
  
  // 模拟打字效果
  useEffect(() => {
    if (!currentOutput || !isTyping) return;
    
    let index = 0;
    let outputText = '';
    
    const typingInterval = setInterval(() => {
      if (index >= currentOutput.length) {
        clearInterval(typingInterval);
        setIsTyping(false);
        return;
      }
      
      outputText += currentOutput[index];
      setSystemOutput(prev => {
        const newOutput = [...prev];
        newOutput[newOutput.length - 1] = outputText;
        return newOutput;
      });
      
      index++;
    }, 20); // 打字速度，可以调整
    
    return () => clearInterval(typingInterval);
  }, [currentOutput, isTyping]);
  
  // 返回编辑页面
  const handleBack = () => {
    navigate('/workflow');
  };
  
  // 编辑工作流
  const handleEdit = () => {
    navigate(`/workflow/${id}/edit`);
  };
  
  // 保存工作流
  const handleSave = () => {
    message.success('工作流使用记录已保存');
  };
  
  // 退出使用
  const handleExit = () => {
    navigate('/workflow');
  };
  
  // 运行工作流
  const handleRun = () => {
    if (!userInput.trim()) {
      message.warning('请输入内容');
      return;
    }
    
    setIsRunning(true);
    setSystemOutput([]);
    
    // 模拟工作流运行
    setTimeout(() => {
      // 这里应该是实际调用工作流执行API
      // 但目前我们使用模拟数据
      
      // 模拟起点卡输出
      addOutput(`正在处理您的输入: "${userInput}"...`);
      
      // 模拟工作任务卡输出
      setTimeout(() => {
        addOutput(`
# 工作流运行结果

基于您的输入，系统生成了以下内容：

## 分析

您提供的需求已经被处理，工作流自动分配了相关任务。

## 建议

1. 考虑进一步细化您的需求
2. 提供更多上下文信息
3. 明确具体的期望结果

## 下一步

请根据以上建议修改您的输入，或直接点击"运行"继续处理当前任务。
`);
        
        setIsRunning(false);
      }, 3000);
    }, 1000);
  };
  
  // 停止工作流运行
  const handleStop = () => {
    setIsRunning(false);
    message.info('工作流已停止运行');
  };
  
  // 添加输出
  const addOutput = (text: string) => {
    setSystemOutput(prev => [...prev, '']);
    setCurrentOutput(text);
    setIsTyping(true);
  };
  
  // 导出Markdown
  const handleExportMarkdown = () => {
    // 创建下载链接
    const element = document.createElement('a');
    const file = new Blob([systemOutput.join('\n\n')], {type: 'text/markdown'});
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
              <Button 
                icon={<CloseOutlined />} 
                onClick={handleExit}
              >
                退出
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
                boxShadow: 'none' // 移除阴影
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
                    >
                      停止
                    </Button>
                  ) : (
                    <Button 
                      type="primary"
                      onClick={handleRun}
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
                  {systemOutput.length > 0 && (
                    <Button type="text" onClick={handleExportMarkdown}>
                      导出Markdown
                    </Button>
                  )}
                </div>
              }
              bordered={true}
              style={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#F5F5F5', // 浅灰色背景
                boxShadow: 'none' // 移除阴影
              }}
              bodyStyle={{ 
                flex: 1, 
                overflow: 'auto',
                padding: systemOutput.length === 0 ? '16px' : '16px'
              }}
            >
              {systemOutput.length === 0 ? (
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
                <div style={{ position: 'relative' }}>
                  {systemOutput.map((output, index) => (
                    <Card key={index} style={{ marginBottom: 16 }}>
                      <div className="markdown-body">
                        <ReactMarkdown>
                          {output}
                        </ReactMarkdown>
                      </div>
                    </Card>
                  ))}
                  {isRunning && isTyping && (
                    <div style={{ position: 'sticky', bottom: 20, textAlign: 'center' }}>
                      <Spin size="small" />
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
