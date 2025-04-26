import React, { useRef, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Typography, Space, Divider, Tabs, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import OriginalVariableEditorXWrapper, { VariableEditorXRef } from '../../../components/VariableEditorXWrapper';
import VariableEditorXWrapperV1_1 from '../../../components/VariableEditorXWrapper/VariableEditorXWrapperV1.1';
import './styles.css';

const { TabPane } = Tabs;

/**
 * VariableEditorXWrapper V1.1 对比测试页面
 * 同时展示原版和优化版，方便对比效果和回归测试
 */
const VariableEditorWrapperV1_1Demo: React.FC = () => {
  const navigate = useNavigate();
  
  // 返回变量列表页面
  const goBack = () => {
    navigate('/variable/list');
  };
  
  // 编辑器引用
  const originalEditorRef = useRef<VariableEditorXRef>(null);
  const v1_1EditorRef = useRef<VariableEditorXRef>(null);
  
  // 状态
  const [originalContent, setOriginalContent] = useState<string>('');
  const [v1_1Content, setV1_1Content] = useState<string>('');
  const [originalRawText, setOriginalRawText] = useState<string>('');
  const [v1_1RawText, setV1_1RawText] = useState<string>('');
  const [resolvedText, setResolvedText] = useState<string>('');
  const [usedVariables, setUsedVariables] = useState<any[]>([]);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [savedContent, setSavedContent] = useState<string>('');
  const [activeEditor, setActiveEditor] = useState<'original' | 'v1.1'>('v1.1');
  
  // 处理内容变化 - 原始版本
  const handleOriginalContentChange = (html: string) => {
    setOriginalContent(html);
    
    if (originalEditorRef.current) {
      const raw = originalEditorRef.current.getRawText();
      setOriginalRawText(raw);
    }
  };
  
  // 处理内容变化 - V1.1版本
  const handleV1_1ContentChange = (html: string) => {
    setV1_1Content(html);
    
    if (v1_1EditorRef.current) {
      const raw = v1_1EditorRef.current.getRawText();
      setV1_1RawText(raw);
    }
  };
  
  // 获取解析后内容
  const handleGetResolvedContent = async () => {
    const currentRef = activeEditor === 'original' ? originalEditorRef : v1_1EditorRef;
    
    if (currentRef.current) {
      const resolved = await currentRef.current.getResolvedContent();
      setResolvedText(resolved);
    }
  };
  
  // 获取使用的变量
  const handleGetUsedVariables = () => {
    const currentRef = activeEditor === 'original' ? originalEditorRef : v1_1EditorRef;
    
    if (currentRef.current) {
      const variables = currentRef.current.getUsedVariables();
      setUsedVariables(variables);
    }
  };
  
  // 保存内容
  const handleSave = () => {
    const currentRef = activeEditor === 'original' ? originalEditorRef : v1_1EditorRef;
    
    if (currentRef.current) {
      const raw = currentRef.current.getRawText();
      setSavedContent(raw);
      alert('内容已保存！');
    }
  };
  
  // 加载保存的内容
  const handleLoad = () => {
    const currentRef = activeEditor === 'original' ? originalEditorRef : v1_1EditorRef;
    
    if (currentRef.current && savedContent) {
      currentRef.current.setContent(savedContent);
      alert('内容已加载！');
    } else {
      alert('没有保存的内容！');
    }
  };
  
  // 清空内容
  const handleClear = () => {
    const currentRef = activeEditor === 'original' ? originalEditorRef : v1_1EditorRef;
    
    if (currentRef.current) {
      currentRef.current.clearContent();
    }
  };
  
  // 切换只读模式
  const handleToggleReadOnly = () => {
    setIsReadOnly(!isReadOnly);
  };
  
  // 切换工具栏显示
  const handleToggleToolbar = () => {
    setShowToolbar(!showToolbar);
  };
  
  // 刷新变量
  const handleRefreshVariables = async () => {
    const currentRef = activeEditor === 'original' ? originalEditorRef : v1_1EditorRef;
    
    if (currentRef.current) {
      await currentRef.current.refreshVariables();
      alert('变量已刷新！');
    }
  };
  
  return (
    <div>
      {/* 返回导航 */}
      <div className="variable-debug-page">
        <div style={{ marginBottom: 24 }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ArrowLeftOutlined 
                onClick={goBack} 
                style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
              />
              <Typography.Title level={4} style={{ margin: 0 }}>
                变量编辑器封装 V1.1 (优化版)
              </Typography.Title>
            </div>
            <Alert
              message="此页面展示了原始版本和V1.1优化版本，便于对比效果"
              description="V1.1版本优化了DOM结构，改进了滚动条显示问题，保持了完全相同的API和功能"
              type="info"
              showIcon
              style={{ marginBottom: 0, marginTop: 8 }}
            />
            <Divider style={{ margin: '12px 0' }} />
          </Space>
        </div>
      </div>
      
      <div className="demo-container">
        {/* 编辑器选项卡区域 */}
        <div className="editor-section">
          <h2>编辑器对比</h2>
          <Tabs 
            defaultActiveKey="v1.1" 
            onChange={(key) => setActiveEditor(key as 'original' | 'v1.1')}
            className="editor-tabs"
          >
            <TabPane tab="原始版本" key="original">
              <div className="editor-container">
                <OriginalVariableEditorXWrapper
                  ref={originalEditorRef}
                  initialContent=""
                  onChange={handleOriginalContentChange}
                  readOnly={isReadOnly}
                  toolbar={showToolbar}
                  className="demo-editor"
                  style={{ height: 200 }}
                />
              </div>
            </TabPane>
            <TabPane tab="V1.1优化版" key="v1.1">
              <div className="editor-container">
                <VariableEditorXWrapperV1_1
                  ref={v1_1EditorRef}
                  initialContent=""
                  onChange={handleV1_1ContentChange}
                  readOnly={isReadOnly}
                  toolbar={showToolbar}
                  className="demo-editor"
                  style={{ height: 200 }}
                />
              </div>
            </TabPane>
          </Tabs>
        </div>
        
        {/* 控制面板区域 - 包含配置和操作 */}
        <div className="controls-container">
          <div className="controls-row">
            {/* 配置区域 */}
            <div className="config-panel">
              <span className="config-title">配置:</span>
              <div className="config-controls">
                <label>
                  <input 
                    type="checkbox" 
                    checked={isReadOnly} 
                    onChange={handleToggleReadOnly}
                  />
                  只读模式
                </label>
                
                <label>
                  <input 
                    type="checkbox" 
                    checked={showToolbar} 
                    onChange={handleToggleToolbar}
                  />
                  显示工具栏
                </label>
              </div>
            </div>
            
            {/* 分隔线 */}
            <div className="controls-divider"></div>
            
            {/* 操作区域 */}
            <div className="actions-panel">
              <span className="actions-title">操作 ({activeEditor === 'original' ? '原始版本' : 'V1.1版本'}):</span>
              <div className="button-group">
                <button onClick={handleSave}>保存内容</button>
                <button onClick={handleLoad}>加载内容</button>
                <button onClick={handleClear}>清空内容</button>
                <button onClick={handleGetResolvedContent}>获取解析内容</button>
                <button onClick={handleGetUsedVariables}>获取使用的变量</button>
                <button onClick={handleRefreshVariables}>刷新变量</button>
              </div>
            </div>
          </div>
        </div>
        
        {/* 输出区域 */}
        <div className="output-panel">
          <h2>输出</h2>
          
          <Tabs defaultActiveKey="v1.1" className="output-tabs">
            <TabPane tab="原始版本" key="original">
              <div className="output-section">
                <h3>HTML内容</h3>
                <pre className="output-content">{originalContent || '(空)'}</pre>
              </div>
              
              <div className="output-section">
                <h3>系统标识符格式 (rawText)</h3>
                <pre className="output-content">{originalRawText || '(空)'}</pre>
              </div>
            </TabPane>
            <TabPane tab="V1.1优化版" key="v1.1">
              <div className="output-section">
                <h3>HTML内容</h3>
                <pre className="output-content">{v1_1Content || '(空)'}</pre>
              </div>
              
              <div className="output-section">
                <h3>系统标识符格式 (rawText)</h3>
                <pre className="output-content">{v1_1RawText || '(空)'}</pre>
              </div>
            </TabPane>
          </Tabs>
          
          <div className="output-section">
            <h3>解析后内容 (当前选择的编辑器)</h3>
            <pre className="output-content">{resolvedText || '(空)'}</pre>
          </div>
          
          <div className="output-section">
            <h3>使用的变量 (当前选择的编辑器)</h3>
            <pre className="output-content">
              {usedVariables.length > 0 
                ? JSON.stringify(usedVariables, null, 2) 
                : '(无变量)'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariableEditorWrapperV1_1Demo;
