import React, { useState, useEffect, useRef } from 'react';
import { Typography, Card, message, Row, Col } from 'antd';
import { v4 as uuidv4 } from '../utils/uuid';
import EditorPanel from './variableEditor2Demo/EditorPanel.refactored';
import BasicOperationPanel from './variableEditor2Demo/BasicOperationPanel';
import MethodTestPanel from './variableEditor2Demo/MethodTestPanel';
import ContentOutputPanel from './variableEditor2Demo/ContentOutputPanel';
import InfoPanel from './variableEditor2Demo/InfoPanel';
import MethodResultModal from './variableEditor2Demo/MethodResultModal';
import SavedRecordsPanel from './variableEditor2Demo/SavedRecordsPanel';
import { Variable, DebugInfo, SavedRecord } from './variableEditor2Demo/types';
import { VariableEditorRef } from './variable/VariableEditorUtils';
import { variableService } from '../services/variableService';
import { resolveVariables } from '../utils/VariableResolverDebug';
import { clearVariableCache } from '../utils/VariableResolver';

const { Title } = Typography;

/**
 * VariableEditor2演示组件 - 重构版
 * 用于测试和展示VariableEditor2的功能
 */
const VariableEditor2DemoRefactored: React.FC = () => {
  // 状态管理
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editorContent, setEditorContent] = useState<string>('这是一个变量编辑器演示，你可以输入@触发变量选择');
  const [resolvedContent, setResolvedContent] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);
  const [editorVersion, setEditorVersion] = useState<number>(1);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    html: '',
    rawText: '',
    plainText: '',
    timestamp: ''
  });
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

  // 保存的记录列表
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>([]);

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

  // 保存当前编辑器内容
  const handleSaveContent = () => {
    if (editorRef.current) {
      try {
        // 获取当前内容（原始文本和HTML）
        const rawContent = editorRef.current.getRawContent();
        const htmlContent = editorRef.current.getRichContent().html;
        
        // 创建预览内容（截取前30个字符）
        const preview = rawContent.replace(/<[^>]+>/g, '').slice(0, 30) + (rawContent.length > 30 ? '...' : '');
        
        // 创建新记录，同时保存原始文本和HTML格式
        const newRecord: SavedRecord = {
          id: uuidv4(),
          content: rawContent,
          htmlContent: htmlContent, // 保存HTML格式
          preview,
          timestamp: Date.now()
        };
        
        // 添加到记录列表
        setSavedRecords(prev => [newRecord, ...prev]);
        
        message.success('内容已保存（包含HTML格式）');
        console.log('已保存HTML内容:', htmlContent);
      } catch (error) {
        console.error('保存内容失败:', error);
        message.error('保存内容失败');
      }
    }
  };
  
  // 加载保存的记录
  const handleLoadRecord = (id: string) => {
    const record = savedRecords.find(r => r.id === id);
    if (record && editorRef.current) {
      // 使用HTML内容而不是原始内容，这样可以保留变量标记
      editorRef.current.updateContent(record.htmlContent);
      setEditorContent(record.htmlContent);
      updateOutputs();
      message.success('内容已加载（使用HTML格式）');
    }
  };
  
  // 删除保存的记录
  const handleDeleteRecord = (id: string) => {
    setSavedRecords(prev => prev.filter(r => r.id !== id));
    message.success('记录已删除');
  };
  
  return (
    <div style={{ padding: '8px', maxWidth: '100%', margin: '0 auto' }}>
      <Card bodyStyle={{ padding: '12px' }}>
        <Title level={4}>变量编辑器增强演示（重构版）</Title>
        
        <Row gutter={[16, 16]}>
          {/* 左侧栏 - 编辑器与操作按钮 */}
          <Col span={12}>
            {/* 编辑器区域 */}
            <EditorPanel
              loading={loading}
              editorVersion={editorVersion}
              variables={variables}
              editorRef={editorRef}
              handleEditorChange={handleEditorChange}
              updateOutputs={updateOutputs}
              handleSaveContent={handleSaveContent}
            />
            
            {/* 操作按钮 */}
            <BasicOperationPanel
              resolving={resolving}
              handleResolveVariables={handleResolveVariables}
              handleReset={handleReset}
              handleTestInsertVariable={handleTestInsertVariable}
              handleRefreshEditor={handleRefreshEditor}
            />
            
            {/* 组件方法测试按钮区域 */}
            <MethodTestPanel
              variables={variables}
              editorRef={editorRef}
              testInputText={testInputText}
              updateOutputs={updateOutputs}
              showMethodResult={showMethodResult}
            />
          </Col>
          
          {/* 右侧栏 - 输出展示和调试信息 */}
          <Col span={12}>
            {/* 输出展示区域 */}
            <ContentOutputPanel
              htmlOutput={htmlOutput}
              rawTextOutput={rawTextOutput}
              plainTextOutput={plainTextOutput}
              jsonOutput={jsonOutput}
              editorRef={editorRef}
            />
            
            {/* 已保存记录列表 */}
            <SavedRecordsPanel 
              records={savedRecords}
              onLoadRecord={handleLoadRecord}
              onDeleteRecord={handleDeleteRecord}
            />
          
            {/* 结果和调试信息 */}
            <InfoPanel
              resolving={resolving}
              resolvedContent={resolvedContent}
              debugInfo={debugInfo}
              variables={variables}
            />
          </Col>
        </Row>
      </Card>
      
      {/* 方法结果模态框 */}
      <MethodResultModal
        visible={methodResultVisible}
        title={methodResultTitle}
        result={methodResult}
        onClose={() => setMethodResultVisible(false)}
      />
    </div>
  );
};

export default VariableEditor2DemoRefactored;
