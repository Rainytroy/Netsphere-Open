import React, { useRef, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Typography, Space, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import VariableEditorXWrapper, { VariableEditorXRef } from '../../../components/VariableEditorXWrapper';
import './styles.css';

/**
 * VariableEditorXWrapper示例页面
 * 展示封装组件的基本用法和功能
 */
const VariableEditorWrapperDemo: React.FC = () => {
  const navigate = useNavigate();
  
  // 返回变量列表页面
  const goBack = () => {
    navigate('/variable/list');
  };
  
  // 编辑器引用
  const editorRef = useRef<VariableEditorXRef>(null);
  
  // 状态
  const [content, setContent] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [resolvedText, setResolvedText] = useState<string>('');
  const [usedVariables, setUsedVariables] = useState<any[]>([]);
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [savedContent, setSavedContent] = useState<string>('');
  
  // 处理内容变化
  const handleContentChange = (html: string) => {
    // 获取实际的HTML内容，而不是使用传入的参数
    if (editorRef.current) {
      const htmlContent = editorRef.current.getContent();
      setContent(htmlContent);
      
      const raw = editorRef.current.getRawText();
      setRawText(raw);
    }
  };
  
  // 获取解析后内容
  const handleGetResolvedContent = async () => {
    if (editorRef.current) {
      const resolved = await editorRef.current.getResolvedContent();
      setResolvedText(resolved);
    }
  };
  
  // 获取使用的变量
  const handleGetUsedVariables = () => {
    if (editorRef.current) {
      const variables = editorRef.current.getUsedVariables();
      setUsedVariables(variables);
    }
  };
  
  // 保存内容
  const handleSave = () => {
    if (editorRef.current) {
      const raw = editorRef.current.getRawText();
      setSavedContent(raw);
      alert('内容已保存！');
    }
  };
  
  // 加载保存的内容
  const handleLoad = () => {
    if (editorRef.current && savedContent) {
      editorRef.current.setContent(savedContent);
      alert('内容已加载！');
    } else {
      alert('没有保存的内容！');
    }
  };
  
  // 清空内容
  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.clearContent();
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
    if (editorRef.current) {
      await editorRef.current.refreshVariables();
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
            变量编辑器封装
          </Typography.Title>
        </div>
        <Divider style={{ margin: '12px 0' }} />
      </Space>
    </div>
  </div>
      
      <div className="demo-container">
        {/* 编辑器区域 */}
        <div className="editor-section">
          <h2>编辑器</h2>
          <div className="editor-container">
            {/* 扁平化布局，编辑器和工具栏完全分离 */}
            <VariableEditorXWrapper
              ref={editorRef}
              initialContent=""
              onChange={handleContentChange}
              readOnly={isReadOnly}
              toolbar={showToolbar}
              className="demo-editor"
              style={{ height: 200 }}
            />
          </div>
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
              <span className="actions-title">操作:</span>
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
          
          <div className="output-section">
            <h3>HTML内容</h3>
            <pre className="output-content">{content || '(空)'}</pre>
          </div>
          
          <div className="output-section">
            <h3>系统标识符格式 (rawText)</h3>
            <pre className="output-content">{rawText || '(空)'}</pre>
          </div>
          
          <div className="output-section">
            <h3>解析后内容</h3>
            <pre className="output-content">{resolvedText || '(空)'}</pre>
          </div>
          
          <div className="output-section">
            <h3>使用的变量</h3>
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

export default VariableEditorWrapperDemo;
