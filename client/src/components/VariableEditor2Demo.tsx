import React, { useState, useEffect, useRef } from 'react';
import { 
  Typography, Card, Spin, Button, Tabs, message, 
  Space, Alert, Input, Modal, Row, Col, Collapse
} from 'antd';
import VariableEditor2 from './variable/VariableEditor2';
import { VariableEditorRef, RichTextContent } from './variable/VariableEditorUtils';
import { variableService } from '../services/variableService';
import { resolveVariables } from '../utils/VariableResolverDebug';
import { clearVariableCache } from '../utils/VariableResolver';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

/**
 * VariableEditor2演示组件
 * 用于测试和展示VariableEditor2的功能
 */
const VariableEditor2Demo: React.FC = () => {
  // 状态管理
  const [variables, setVariables] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editorContent, setEditorContent] = useState<string>('这是一个变量编辑器演示，你可以输入@触发变量选择');
  const [resolvedContent, setResolvedContent] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);
  const [editorVersion, setEditorVersion] = useState<number>(1);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [methodResult, setMethodResult] = useState<any>(null);
  const [methodResultVisible, setMethodResultVisible] = useState<boolean>(false);
  const [methodResultTitle, setMethodResultTitle] = useState<string>('');
  
  // 输出格式状态
  const [htmlOutput, setHtmlOutput] = useState<string>('');
  const [rawTextOutput, setRawTextOutput] = useState<string>('');
  const [plainTextOutput, setPlainTextOutput] = useState<string>('');
  const [jsonOutput, setJsonOutput] = useState<string>('{}');
  
  // 测试数据
  const [testInputText, setTestInputText] = useState<string>('这是测试文本 @npc.name 会被替换为变量值');

  // 创建一个ref用于访问VariableEditor组件实例
  const editorRef = useRef<VariableEditorRef>(null);
  
  // 加载变量列表
  useEffect(() => {
    const loadVariables = async () => {
      try {
        setLoading(true);
        // 调用API获取变量列表
        const response: any = await variableService.getVariables();
        
        // 处理响应数据，确保我们有一个有效的数组
        let responseData: any[] = [];
        if (response) {
          if (Array.isArray(response)) {
            responseData = response;
            console.log('响应直接是数组');
          } else if (response.data && Array.isArray(response.data)) {
            responseData = response.data;
            console.log('响应.data是数组');
          } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            responseData = response.data.data;
            console.log('响应.data.data是数组');
          }
        }
        
        console.log('处理后的响应数据长度:', responseData.length);
        
        // 转换变量为编辑器可用的格式
        const variableViews = responseData.map((v: any) => ({
          id: v.id,
          name: v.name,
          identifier: v.identifier,
          type: v.type,
          sourceId: v.source?.id || '',
          sourceName: v.source?.name || '未知来源',
          value: v.value
        }));
        
        setVariables(variableViews);
        console.log('变量加载完成，共:', variableViews.length);
      } catch (error) {
        console.error('加载变量列表失败:', error);
        message.error('加载变量失败，请检查网络连接');
      } finally {
        setLoading(false);
      }
    };
    
    loadVariables();
  }, []);
  
  // 处理内容变化
  const handleEditorChange = (value: string) => {
    setEditorContent(value);
    console.log('编辑器内容已更新');
    
    // 更新调试信息和输出
    updateOutputs();
  };
  
  // 更新所有输出
  const updateOutputs = () => {
    if (editorRef.current) {
      try {
        // 获取富文本内容
        const richContent = editorRef.current.getRichContent();
        
        // 更新调试信息
        setDebugInfo({
          html: richContent.html,
          rawText: richContent.rawText,
          plainText: richContent.plainText || '',
          timestamp: new Date().toISOString()
        });
        
        // 更新输出区域
        setHtmlOutput(richContent.html);
        setRawTextOutput(richContent.rawText);
        setPlainTextOutput(richContent.plainText || '');
        
        try {
          setJsonOutput(JSON.stringify(richContent, null, 2));
        } catch (error) {
          console.error('JSON.stringify失败:', error);
          setJsonOutput('{}');
        }
      } catch (error) {
        console.error('获取富文本内容失败:', error);
      }
    }
  };
  
  // 解析变量
  const handleResolveVariables = async () => {
    if (editorRef.current) {
      try {
        setResolving(true);
        
        // 清除变量缓存
        clearVariableCache();
        
        // 获取原始内容
        const rawContent = editorRef.current.getRawContent();
        console.log('解析变量 - 原始内容:', rawContent);
        
        // 解析变量
        const resolved = await resolveVariables(rawContent, true);
        console.log('解析变量 - 结果:', resolved);
        
        // 更新解析结果
        setResolvedContent(resolved);
        
        message.success('变量解析成功');
      } catch (error) {
        console.error('解析变量失败:', error);
        message.error('解析变量失败: ' + (error instanceof Error ? error.message : '未知错误'));
      } finally {
        setResolving(false);
      }
    }
  };
  
  // 重置编辑器
  const handleReset = () => {
    if (editorRef.current) {
      editorRef.current.updateContent('<p>编辑器内容已重置，你可以输入@触发变量选择</p>');
      setEditorContent('<p>编辑器内容已重置，你可以输入@触发变量选择</p>');
      setResolvedContent('');
      message.info('编辑器已重置');
      
      // 更新输出
      updateOutputs();
    }
  };
  
  // 测试插入变量
  const handleTestInsertVariable = () => {
    if (editorRef.current && variables.length > 0) {
      // 随机选择一个变量插入
      const randomIndex = Math.floor(Math.random() * variables.length);
      const randomVariable = variables[randomIndex];
      
      // 插入变量
      editorRef.current.insertVariable(randomVariable);
      message.success(`插入测试变量: ${randomVariable.name}`);
      
      // 更新输出
      updateOutputs();
    } else {
      message.warning('没有可用的变量或编辑器未准备好');
    }
  };
  
  // 刷新编辑器
  const handleRefreshEditor = () => {
    setEditorVersion(prev => prev + 1);
    message.info('编辑器已刷新');
  };
  
  // 显示方法结果模态框
  const showMethodResult = (title: string, content: any) => {
    setMethodResultTitle(title);
    setMethodResult(content);
    setMethodResultVisible(true);
  };
  
  // ======= 测试组件方法的处理函数 =======
  
  // 测试insertVariable方法
  const testInsertVariable = () => {
    if (editorRef.current && variables.length > 0) {
      const randomIndex = Math.floor(Math.random() * variables.length);
      const randomVariable = variables[randomIndex];
      editorRef.current.insertVariable(randomVariable);
      
      showMethodResult('insertVariable', {
        method: 'insertVariable',
        params: randomVariable,
        result: '变量已插入编辑器',
        variableInfo: randomVariable
      });
      
      updateOutputs();
    }
  };
  
  // 测试updateContent方法
  const testUpdateContent = () => {
    if (editorRef.current) {
      const newContent = '<p>这是通过updateContent方法更新的内容，包含一个<span data-type="variable" data-identifier="npc.name" data-source="npc" class="variable-node">@npc.name</span>变量</p>';
      editorRef.current.updateContent(newContent);
      
      showMethodResult('updateContent', {
        method: 'updateContent',
        params: newContent,
        result: '内容已更新'
      });
      
      updateOutputs();
    }
  };
  
  // 测试focusEditor方法
  const testFocusEditor = () => {
    if (editorRef.current) {
      editorRef.current.focusEditor();
      
      showMethodResult('focusEditor', {
        method: 'focusEditor',
        result: '编辑器已聚焦'
      });
    }
  };
  
  // 测试parseExternalContent方法
  const testParseExternalContent = () => {
    if (editorRef.current) {
      editorRef.current.parseExternalContent(testInputText);
      
      showMethodResult('parseExternalContent', {
        method: 'parseExternalContent',
        params: testInputText,
        result: '外部内容已解析并插入'
      });
      
      updateOutputs();
    }
  };
  
  // 测试getRawContent方法
  const testGetRawContent = () => {
    if (editorRef.current) {
      const rawContent = editorRef.current.getRawContent();
      
      showMethodResult('getRawContent', {
        method: 'getRawContent',
        result: rawContent
      });
    }
  };
  
  // 测试getResolvedContent方法
  const testGetResolvedContent = async () => {
    if (editorRef.current) {
      try {
        const resolvedContent = await editorRef.current.getResolvedContent();
        
        showMethodResult('getResolvedContent', {
          method: 'getResolvedContent',
          result: resolvedContent
        });
      } catch (error) {
        showMethodResult('getResolvedContent', {
          method: 'getResolvedContent',
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
  };
  
  // 测试getRichContent方法
  const testGetRichContent = () => {
    if (editorRef.current) {
      const richContent = editorRef.current.getRichContent();
      
      showMethodResult('getRichContent', {
        method: 'getRichContent',
        result: richContent
      });
    }
  };
  
  // 测试updateRichContent方法
  const testUpdateRichContent = () => {
    if (editorRef.current) {
      const richContent: RichTextContent = {
        html: '<p>这是通过updateRichContent更新的内容</p>',
        rawText: '这是通过updateRichContent更新的内容',
        plainText: '这是通过updateRichContent更新的内容'
      };
      
      editorRef.current.updateRichContent(richContent);
      
      showMethodResult('updateRichContent', {
        method: 'updateRichContent',
        params: richContent,
        result: '富文本内容已更新'
      });
      
      updateOutputs();
    }
  };
  
  // 获取HTML格式内容
  const handleGetHTML = () => {
    if (editorRef.current) {
      const richContent = editorRef.current.getRichContent();
      
      showMethodResult('HTML内容', richContent.html);
    }
  };
  
  // 获取JSON格式内容
  const handleGetJSON = () => {
    if (editorRef.current) {
      try {
        const editor = editorRef.current as any;
        const jsonContent = editor.editor?.getJSON();
        
        showMethodResult('JSON内容', JSON.stringify(jsonContent, null, 2));
      } catch (error) {
        showMethodResult('JSON内容', '无法获取JSON内容: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };
  
  return (
    <div style={{ padding: '8px', maxWidth: '100%', margin: '0 auto' }}>
      <Card bodyStyle={{ padding: '12px' }}>
        <Title level={4}>变量编辑器增强演示</Title>
        
        <Row gutter={[16, 16]}>
          {/* 左侧栏 - 编辑器与操作按钮 */}
          <Col span={12}>
            {/* 编辑器区域 */}
            <Card
              title="编辑器"
              size="small"
              bodyStyle={{ padding: '8px' }}
              style={{ marginBottom: '8px' }}
            >
              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin tip="加载变量列表..." />
                </div>
              ) : (
                <div key={`editor-instance-${editorVersion}`}>
                  <VariableEditor2
                    ref={editorRef}
                    variables={variables}
                    placeholder="请输入文本，使用@符号插入变量..."
                    defaultValue={editorContent}
                    onChange={handleEditorChange}
                    minHeight="120px"
                  />
                </div>
              )}
            </Card>
            
            {/* 操作按钮 */}
            <Card
              title="基本操作"
              size="small"
              bodyStyle={{ padding: '8px' }}
              style={{ marginBottom: '8px' }}
            >
              <Space>
                <Button 
                  type="primary" 
                  size="small"
                  onClick={handleResolveVariables}
                  loading={resolving}
                >
                  解析变量
                </Button>
                <Button size="small" onClick={handleReset}>
                  重置内容
                </Button>
                <Button size="small" onClick={handleTestInsertVariable}>
                  插入测试变量
                </Button>
                <Button size="small" onClick={handleRefreshEditor}>
                  刷新编辑器
                </Button>
              </Space>
            </Card>
                
            {/* 组件方法测试按钮区域 */}
            <Card
              title="组件方法测试"
              size="small"
              bodyStyle={{ padding: '8px' }}
              style={{ marginBottom: '8px' }}
            >
              <Collapse bordered={false} size="small">
                <Panel header="基本操作方法" key="basic">
                  <Row gutter={[4, 4]}>
                    <Col span={8}>
                      <Button size="small" block onClick={testInsertVariable}>
                        insertVariable
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button size="small" block onClick={testUpdateContent}>
                        updateContent
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button size="small" block onClick={testFocusEditor}>
                        focusEditor
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button size="small" block onClick={testParseExternalContent}>
                        parseExternalContent
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button size="small" block onClick={testUpdateRichContent}>
                        updateRichContent
                      </Button>
                    </Col>
                  </Row>
                </Panel>
                
                <Panel header="获取内容方法" key="get">
                  <Row gutter={[4, 4]}>
                    <Col span={8}>
                      <Button size="small" block onClick={testGetRawContent}>
                        getRawContent
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button size="small" block onClick={testGetResolvedContent}>
                        getResolvedContent
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button size="small" block onClick={testGetRichContent}>
                        getRichContent
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button size="small" block onClick={handleGetHTML}>
                        获取HTML
                      </Button>
                    </Col>
                    <Col span={8}>
                      <Button size="small" block onClick={handleGetJSON}>
                        获取JSON
                      </Button>
                    </Col>
                  </Row>
                </Panel>
              </Collapse>
            </Card>
          </Col>
          
          {/* 右侧栏 - 输出展示和调试信息 */}
          <Col span={12}>
            {/* 输出展示区域 */}
            <Card
              title="内容输出"
              size="small"
              bodyStyle={{ padding: '8px' }}
              style={{ marginBottom: '8px' }}
            >
              <Tabs defaultActiveKey="html" size="small">
                <Tabs.TabPane tab="HTML" key="html">
                  <TextArea
                    value={htmlOutput}
                    readOnly
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane tab="rawText" key="rawText">
                  <TextArea
                    value={rawTextOutput}
                    readOnly
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane tab="plainText" key="plainText">
                  <TextArea
                    value={plainTextOutput}
                    readOnly
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </Tabs.TabPane>
                <Tabs.TabPane tab="JSON" key="json">
                  <TextArea
                    value={jsonOutput}
                    readOnly
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </Tabs.TabPane>
              </Tabs>
            </Card>
                
            {/* 结果和调试信息 */}
            <Card
              title="其他信息"
              size="small"
              bodyStyle={{ padding: '8px' }}
              style={{ marginBottom: '8px' }}
            >
              <Tabs defaultActiveKey="result" size="small">
                <Tabs.TabPane tab="解析结果" key="result">
                  {resolving ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spin tip="正在解析变量..." />
                    </div>
                  ) : resolvedContent ? (
                    <div
                      style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}
                    >
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', maxHeight: '150px', overflow: 'auto' }}>
                        {resolvedContent}
                      </pre>
                    </div>
                  ) : (
                    <Alert
                      message="尚未解析"
                      description="点击解析变量按钮查看解析结果"
                      type="info"
                      showIcon
                    />
                  )}
                </Tabs.TabPane>
                
                <Tabs.TabPane tab="调试信息" key="debug">
                  <pre
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: '#f0f0f0',
                      overflow: 'auto',
                      maxHeight: '150px',
                      fontSize: '12px'
                    }}
                  >
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </Tabs.TabPane>
                
                <Tabs.TabPane tab="变量列表" key="variables">
                  {variables.length > 0 ? (
                    <div
                      style={{
                        maxHeight: '150px',
                        overflow: 'auto',
                        padding: '8px',
                      }}
                    >
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #f0f0f0' }}>名称</th>
                            <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #f0f0f0' }}>标识符</th>
                            <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #f0f0f0' }}>来源</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variables.map((variable, index) => (
                            <tr key={variable.id || index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f0f0f0' }}>{variable.name}</td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f0f0f0' }}>{variable.identifier}</td>
                              <td style={{ padding: '4px', borderBottom: '1px solid #f0f0f0' }}>{variable.sourceName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Alert
                      message="无变量数据"
                      description="未加载到任何变量数据"
                      type="warning"
                      showIcon
                    />
                  )}
                </Tabs.TabPane>
              </Tabs>
            </Card>
          </Col>
        </Row>
      </Card>
              
      {/* 方法结果模态框 */}
      <Modal
        title={`方法调用结果: ${methodResultTitle}`}
        open={methodResultVisible}
        onCancel={() => setMethodResultVisible(false)}
        footer={[
          <Button key="close" onClick={() => setMethodResultVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <pre
          style={{
            padding: '12px',
            borderRadius: '4px',
            backgroundColor: '#f0f0f0',
            overflow: 'auto',
            maxHeight: '400px'
          }}
        >
          {typeof methodResult === 'object'
            ? JSON.stringify(methodResult, null, 2)
            : methodResult}
        </pre>
      </Modal>
    </div>
  );
};

export default VariableEditor2Demo;
