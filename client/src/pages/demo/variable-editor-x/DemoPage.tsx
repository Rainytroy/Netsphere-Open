import React, { useRef, useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Tabs, Tag, Button, Tooltip, Space, Divider } from 'antd';
import { SaveOutlined, LoadingOutlined, QuestionCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { VariableEditorXRef } from './types';
import { useVariableData } from './hooks/useVariableData';
import { rawTextToHtml, htmlToRawText } from './utils/formatters';
import FormatInfoModal from './components/FormatInfoModal';
import SavedContentList, { SavedContentItem } from './components/SavedContentList';
import ContentDetail from './components/ContentDetail';
import EditorSection from './components/EditorSection';

// 日志工具
import createLogger from './utils/logger';

// 创建日志实例
const logger = createLogger('DemoPage');

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

/**
 * 内容处理相关的辅助函数
 */
const contentUtils = {
  // 准备HTML内容 - 从不同来源获取HTML内容
  prepareHtmlContent: (item: SavedContentItem, variables: any[]): { htmlContent: string, contentSource: string, stats: any } => {
    let htmlContent = '';
    let contentSource = '';
    let stats = {};
    
    // 优先使用预览HTML
    if (item.htmlPreview) {
      contentSource = '预览HTML';
      logger.info('使用预览HTML加载内容');
      htmlContent = item.htmlPreview;
      
      const variableTagCount = (htmlContent.match(/<span[^>]*data-variable[^>]*>/g) || []).length;
      stats = { variableTagCount };
    } 
    // 其次转换rawText为HTML
    else if (item.contentType === 'rawText') {
      contentSource = 'rawText转换';
      logger.info('将rawText转换为HTML');
      
      const variableIdCount = (item.content.match(/@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g) || []).length;
      
      // 转换为HTML
      htmlContent = rawTextToHtml(item.content, variables);
      
      const convertedTagCount = (htmlContent.match(/<span[^>]*data-variable[^>]*>/g) || []).length;
      stats = { variableIdCount, convertedTagCount };
    } 
    // 最后使用普通内容
    else {
      contentSource = '普通内容';
      htmlContent = item.content;
    }
    
    return { htmlContent, contentSource, stats };
  },
  
  // 创建保存的内容项
  createSavedItem: (htmlContent: string, rawText: string, name: string, variables: any[]): SavedContentItem => {
    const variableCount = (rawText.match(/@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g) || []).length;
    const timestamp = Date.now();
    const id = `save_${timestamp}`;
    
    // 为预览生成变量的友好显示版本
    const previewHtml = rawTextToHtml(rawText, variables);
    
    return {
      id,
      name,
      content: rawText,         // 使用rawText作为主要内容
      htmlContent: htmlContent, // 存储完整HTML用于调试
      rawContent: rawText,      // 存储完整rawText用于调试
      htmlPreview: previewHtml, // 使用转换后的HTML作为预览
      timestamp,
      contentType: 'rawText',
      variableCount
    };
  }
};

/**
 * VariableEditorX演示页面
 * 提供多种配置选项，展示组件的功能特性
 */
const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 返回变量列表页
  const goBack = () => {
    navigate('/variable/list');
  };
  
  // 状态管理
  const [editorContent, setEditorContent] = useState<string>('');
  const [savedContents, setSavedContents] = useState<SavedContentItem[]>([]);
  const [saveName, setSaveName] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('1');
  const [selectedContent, setSelectedContent] = useState<SavedContentItem | null>(null);
  const [contentViewMode, setContentViewMode] = useState<'preview' | 'raw' | 'html'>('preview');
  const [formatInfoVisible, setFormatInfoVisible] = useState<boolean>(false);
  
  // 初始化保存的内容列表
  useEffect(() => {
    // 加载空的保存列表，用户可以自行添加内容
    setSavedContents([]);
  }, []);
  
  // 编辑器引用
  const editorRef = useRef<VariableEditorXRef>(null);
  
  // 获取变量数据，包含刷新函数
  const { variables, refreshVariables } = useVariableData();
  
  // 初始内容
  const initialContent = '<p>在此输入内容，使用@符号触发变量选择...</p>';
  
  // 处理内容变更
  const handleContentChange = (html: string) => {
    setEditorContent(html);
  };
  
  // 保存当前内容
  const handleSaveContent = () => {
    if (!editorRef.current) return;
    
    setSaving(true);
    setTimeout(() => {
      // 获取HTML内容
      const htmlContent = editorRef.current?.getContent() || '';
      
      // 将HTML转换为rawText格式（系统标识符格式而非HTML标签）
      const rawText = htmlToRawText(htmlContent);
      
      logger.info('保存内容，长度:', rawText.length);
      
      // 创建保存项
      const name = saveName || `保存 ${new Date().toLocaleTimeString()}`;
      const newSavedItem = contentUtils.createSavedItem(htmlContent, rawText, name, variables);
      
      setSavedContents(prev => [...prev, newSavedItem]);
      setSaveName('');
      setSaving(false);
    }, 500);
  };
  
  // 加载保存的内容
  const handleLoadContent = async (item: SavedContentItem) => {
    if (!editorRef.current) {
      logger.error('编辑器引用不存在，无法加载内容');
      return;
    }

    logger.info(`开始加载内容: "${item.name}"`);
    
    try {
      // 1. 显示加载遮罩
      editorRef.current.setLoading(true);
      
      // 2. 刷新变量数据，获取最新数据
      await refreshVariables();
      logger.info(`刷新后变量数据已准备就绪`);
      
      // 3. 准备HTML内容
      const { htmlContent, contentSource } = contentUtils.prepareHtmlContent(item, variables);
      
      // 检查是否为空内容
      if (!htmlContent.trim()) {
        logger.error('内容为空，无法加载');
        editorRef.current.setLoading(false);
        return;
      }
      
      logger.info(`准备设置内容，来源: ${contentSource}`);
      
      // 4. 执行加载流程
      await loadContentToEditor(htmlContent);
      
      logger.info('内容加载完成');
    } catch (error) {
      logger.error('加载内容失败:', error);
    } finally {
      // 确保遮罩始终会被隐藏
      if (editorRef.current) {
        editorRef.current.setLoading(false);
      }
    }
  };
  
  // 将内容加载到编辑器的核心步骤
  const loadContentToEditor = async (htmlContent: string) => {
    if (!editorRef.current) {
      logger.error('编辑器引用不存在，无法加载内容');
      return;
    }
    
    try {
      logger.info('开始加载内容，长度:', htmlContent.length);
      
      // 1. 获得rawText版本的内容
      const rawText = htmlToRawText(htmlContent);
      logger.info('转换为rawText格式完成，长度:', rawText.length);
      
      // 2. 使用最新变量数据重新生成HTML
      const regeneratedHtml = rawTextToHtml(rawText, variables);
      logger.info('使用变量数据重新生成HTML完成');
      
      // 3. 清空编辑器内容
      editorRef.current.clearContent();
      logger.info('编辑器内容已清空');
      
      // 4. 等待清空操作完成
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // 5. 设置新内容
      try {
        // 使用VariableEditorX组件的setContent方法
        editorRef.current.setContent(regeneratedHtml);
        logger.info('内容设置成功');
      } catch (e) {
        logger.error('设置内容失败:', e);
        
        // 回退到React状态更新
        setEditorContent(regeneratedHtml);
        logger.info('已回退到使用React状态更新');
      }
      
      // 6. 同步变量节点
      if (typeof editorRef.current.refreshVariables === 'function') {
        try {
          await editorRef.current.refreshVariables();
          logger.info('变量节点同步完成');
        } catch (e) {
          logger.error('变量节点同步失败:', e);
        }
      }
      
      // 7. 聚焦编辑器
      editorRef.current.focusEditor();
      logger.info('编辑器加载完成并聚焦');
    } catch (error) {
      logger.error('加载内容过程出错:', error);
      throw error; // 继续向上传播错误
    }
  };
  
  // 查看内容详情
  const handleViewContent = (item: SavedContentItem) => {
    setSelectedContent(item);
    setActiveTab('3'); // 切换到内容详情标签
  };
  
  // 删除保存的内容
  const handleDeleteSavedContent = (id: string) => {
    setSavedContents(prev => prev.filter(item => item.id !== id));
    
    // 如果当前查看的内容被删除，重置选中内容
    if (selectedContent && selectedContent.id === id) {
      setSelectedContent(null);
      setActiveTab('1');
    }
  };
  
  // 刷新变量函数 - 保留编辑内容结构
  const handleRefreshVariables = async () => {
    if (!editorRef.current) return;
    
    logger.info('开始刷新变量标签');
    
    try {
      // 1. 记录当前选区位置，以便之后恢复
      let cursorPosition = null;
      const editorCoreRef = (editorRef.current as any)?.editorRef?.current;
      if (editorCoreRef && editorCoreRef.editor) {
        try {
          cursorPosition = editorCoreRef.editor.state.selection;
        } catch (e) {
          logger.warn('无法获取当前光标位置');
        }
      }
      
      // 2. 刷新变量数据
      await refreshVariables();
      
      // 3. 获取当前内容并转换为rawText格式
      const currentHtml = editorRef.current.getContent() || '';
      const rawText = htmlToRawText(currentHtml);
      
      // 4. 使用最新变量数据将rawText转回HTML
      const updatedHtml = rawTextToHtml(rawText, variables);
      
      // 5. 设置更新后的内容到编辑器
      try {
        editorRef.current.setContent(updatedHtml);
        
        // 恢复编辑器焦点
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.focusEditor();
          }
        }, 50);
      } catch (e) {
        logger.warn('无法使用setContent方法，回退到状态更新');
        setEditorContent(updatedHtml);
      }
      
      logger.info('变量标签刷新完成');
    } catch (error) {
      logger.error('刷新变量数据失败:', error);
    }
  };
  
  return (
    <div>
      {/* 格式说明对话框 - 拆分为独立组件 */}
      <FormatInfoModal
        visible={formatInfoVisible}
        onClose={() => setFormatInfoVisible(false)}
      />
      
  {/* 导航标题区域 */}
  <div className="variable-debug-page">
    <div style={{ marginBottom: 24 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ArrowLeftOutlined 
            onClick={goBack} 
            style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
          />
          <Typography.Title level={4} style={{ margin: 0 }}>
            变量编辑器X
          </Typography.Title>
        </div>
        <Divider style={{ margin: '12px 0' }} />
      </Space>
    </div>
  </div>
      
      <Typography>
        <Paragraph>
          <Text type="secondary">
            这个演示页面展示了VariableEditorX的核心功能，特别是变量保存和加载能力。
            保存内容使用<Text code>rawText</Text>格式，可以正确保留变量引用信息。
          </Text>
        </Paragraph>
      </Typography>
      
      <Row gutter={16}>
        <Col span={14}>
          {/* 编辑器区域 - 拆分为独立组件 */}
          <EditorSection
            editorRef={editorRef}
            initialContent={initialContent}
            onContentChange={handleContentChange}
          />
        </Col>
        
        <Col span={10}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>保存列表</span>
                <div>
                  <Tag color="blue" style={{ marginRight: 4 }}>
                    rawText格式
                    <QuestionCircleOutlined 
                      style={{ marginLeft: 4, cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormatInfoVisible(true);
                      }}
                    />
                  </Tag>
                </div>
              </div>
            }
            extra={
              <Tooltip title="保存当前内容(rawText格式)">
                <Button 
                  type="primary" 
                  icon={saving ? <LoadingOutlined /> : <SaveOutlined />} 
                  onClick={handleSaveContent}
                  disabled={saving || !editorContent}
                >
                  保存
                </Button>
              </Tooltip>
            }
          >
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="保存列表" key="1">
                {/* 保存内容列表 - 拆分为独立组件 */}
                <SavedContentList
                  savedContents={savedContents}
                  saveName={saveName}
                  saving={saving}
                  onSaveNameChange={setSaveName}
                  onSaveContent={handleSaveContent}
                  onViewContent={handleViewContent}
                  onLoadContent={handleLoadContent}
                  onDeleteContent={handleDeleteSavedContent}
                  onShowFormatInfo={() => setFormatInfoVisible(true)}
                  editorHasContent={!!editorContent}
                />
              </TabPane>
              <TabPane tab="内容详情" key="3" disabled={!selectedContent}>
                {/* 内容详情 - 拆分为独立组件 */}
                <ContentDetail 
                  content={selectedContent}
                  viewMode={contentViewMode}
                  onViewModeChange={setContentViewMode}
                  onLoadContent={handleLoadContent}
                  variables={variables}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DemoPage;
