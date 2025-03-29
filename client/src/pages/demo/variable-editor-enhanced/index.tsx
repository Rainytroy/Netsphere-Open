import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button, Tooltip } from 'antd';
import { PlusCircleOutlined, EyeOutlined } from '@ant-design/icons';
import './styles.css';

// 导入扩展
import { Variable, VariableSuggestion } from './extensions';

// 导入组件
import DebugPanel from './components/DebugPanel';

// 导入hooks
import useVariableData from './hooks/useVariableData';

// 导入类型
import { VariableData, VariableEditorXProps, VariableEditorXRef } from './types';

// 引入变量选择器模态窗口
import VariableSelectorModal from '../../../components/variable/VariableSelectorModal';

/**
 * 变量编辑器X组件 - 增强版
 * 
 * 一个支持UUID变量标识符的富文本编辑器，样式与VariableEditor2保持一致
 */
const VariableEditorX = forwardRef<VariableEditorXRef, VariableEditorXProps>((props, ref) => {
  const {
    initialContent = '<p>在此输入文本，使用@符号触发变量选择</p>',
    readOnly = false,
    onChange,
    onVariableInsert,
    placeholder,
    toolbar = true,
    debug = false,
    className = '',
    style = {},
  } = props;
  
  // 状态
  const [content, setContent] = useState<string>(initialContent);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [resolvedContent, setResolvedContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // 获取变量数据
  const { variables, loading } = useVariableData();
  
  // 处理@键按下事件，打开变量选择模态窗口
  const handleAtKey = () => {
    console.log('[VariableEditorX] @键被按下，打开变量选择器');
    setModalVisible(true);
  };
  
  // 创建一个函数，通过系统标识符获取完整的变量信息
  const getVariableByIdentifier = (identifier: string): VariableData => {
    // 处理可能带@前缀的情况
    const normalizedIdentifier = identifier.startsWith('@') ? identifier.substring(1) : identifier;
    
    // 首先尝试直接从变量列表中查找
    let variable = variables.find(v => 
      v.identifier === normalizedIdentifier || 
      v.identifier === identifier
    );
    
    // 如果找到，直接返回
    if (variable) {
      return variable;
    }
    
    // 如果未找到，尝试解析identifier
    if (identifier.includes('_')) {
      // 尝试解析形如 @gv_id_field 的格式
      const parts = identifier.replace(/^@/, '').split('_');
      if (parts.length >= 3) {
        const idPart = parts[1]; // 取出id部分
        const fieldPart = parts[2]; // 取出field部分
        
        // 尝试用id和field匹配
        variable = variables.find(v => 
          v.id === idPart && v.field === fieldPart
        );
        
        if (variable) {
          return variable;
        }
      }
    }
    
    // 如果仍然找不到，创建一个临时变量对象
    let id = '';
    let field = 'value';
    let sourceName = '变量';
    let sourceType = 'custom';
    
    if (identifier.startsWith('@gv_') && identifier.includes('_')) {
      const parts = identifier.replace(/^@gv_/, '').split('_');
      if (parts.length >= 2) {
        id = parts[0];
        field = parts[1];
      }
    }
    
    // 创建一个临时变量对象
    return {
      id: id || `tmp-${Date.now()}`,
      field: field,
      sourceName: sourceName,
      sourceType: sourceType,
      displayIdentifier: `@${sourceName}.${field}#${id.substring(0, 4) || 'xxxx'}`,
      get identifier() { return `@gv_${this.id}_${this.field}`; }
    };
  };
  
  // 创建一个函数，用于将变量对象转换为HTML字符串
  const renderVariableToHtml = (variable: VariableData): string => {
    // 确保ID存在
    const id = variable.id || `tmp-${Date.now()}`;
    // 确保字段名存在
    const field = variable.field || 'value';
    // 确保源名称存在
    const sourceName = variable.sourceName || '变量';
    // 确保源类型存在
    const sourceType = variable.sourceType || 'custom';
    // 创建完整的系统标识符
    const systemIdentifier = `@gv_${id}_${field}`;
    // 短ID用于显示
    const shortId = id.substring(0, 4);
    // 使用传入的显示标识符或构建一个
    const displayIdentifier = variable.displayIdentifier || `@${sourceName}.${field}#${shortId}`;
    
    // 构建变量标签的HTML
    return `<span 
      data-variable="" 
      data-id="${id}" 
      data-field="${field}" 
      data-identifier="${systemIdentifier}" 
      data-type="${sourceType}" 
      class="variable-tag variable-type-${sourceType}" 
      contenteditable="false"
    >${displayIdentifier}</span>`;
  };
  
  // 变量选择事件
  const handleSelectVariable = (identifier: string, displayIdentifier?: string) => {
    console.log('[VariableEditorX] 选择变量:', identifier, '显示标识符:', displayIdentifier);
    
    // 获取完整的变量信息
    let selectedVariable = getVariableByIdentifier(identifier);
    
    // 如果提供了显示标识符，使用它
    if (displayIdentifier && selectedVariable) {
      selectedVariable.displayIdentifier = displayIdentifier;
    }
    
    if (editor && selectedVariable) {
      console.log('[VariableEditorX] 插入变量:', selectedVariable);
      
      // 删除可能已输入的@字符
      deleteAtCharacter();
      
      // 将变量对象渲染为HTML
      const variableHtml = renderVariableToHtml(selectedVariable);
      console.log('[VariableEditorX] 生成的变量HTML:', variableHtml);
      
      // 直接插入HTML
      editor
        .chain()
        .focus()
        .insertContent(variableHtml)
        .run();
      
      if (onVariableInsert) {
        onVariableInsert(selectedVariable);
      }
    }
  };
  
  // 删除编辑器中光标前的@字符
  const deleteAtCharacter = () => {
    if (!editor) return;
    
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    if ($from.pos > 0) {
      const textBefore = state.doc.textBetween($from.pos - 1, $from.pos);
      if (textBefore === '@') {
        editor
          .chain()
          .focus()
          .deleteRange({ from: $from.pos - 1, to: $from.pos })
          .run();
      }
    }
  };
  
  // 配置@键触发变量选择
  const variableSuggestion = {
    char: '@',
    // 简化正则表达式，匹配单独的@字符
    pattern: /@$/,
    allowSpaces: false,
    startOfLine: false,
    command: ({ editor, range }: any) => {
      // 删除@字符
      editor.chain().focus().deleteRange(range).run();
      
      // 显示变量选择模态窗口，延迟执行以避免键盘事件冲突
      setTimeout(() => {
        handleAtKey();
      }, 10);
    }
  };

  // 初始化编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Variable,
      VariableSuggestion.configure({
        suggestion: variableSuggestion,
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      if (onChange) {
        onChange(html);
      }
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  });

  // 插入变量的辅助方法
  const insertVariable = (variable: VariableData) => {
    if (editor) {
      // 构建显示标识符
      const shortId = variable.id.substring(0, 4);
      const displayName = variable.displayIdentifier || 
                          `@${variable.sourceName}.${variable.field}#${shortId}`;
                          
      console.log('[VariableEditorX] 插入变量，显示标识符:', displayName);
      
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'variable',
          attrs: {
            id: variable.id,
            field: variable.field,
            sourceName: variable.sourceName,
            sourceType: variable.sourceType,
            // 添加显示标识符作为直接内容
            text: displayName
          },
        })
        .run();
      
      if (onVariableInsert) {
        onVariableInsert(variable);
      }
    }
  };

  // 解析内容中的变量标识符，返回解析后的文本
  const resolveContent = async (html: string): Promise<string> => {
    // 简单实现，实际应该使用VariableResolver服务
    let result = html;
    
    // 对每个变量执行替换
    variables.forEach(variable => {
      const pattern = new RegExp(`<span[^>]*data-identifier="@gv_${variable.id}_${variable.field}"[^>]*>[^<]*</span>`, 'g');
      result = result.replace(pattern, variable.value || '');
    });
    
    // 移除剩余的HTML标签
    result = result.replace(/<[^>]*>/g, '');
    
    return result;
  };

  // 提取编辑器中的变量
  const getUsedVariables = (): VariableData[] => {
    if (!editor) return [];
    
    // 获取编辑器JSON内容
    const editorContent = editor.getJSON();
    
    // 寻找所有变量节点并提取其属性
    const variableAttrs = editorContent.content
      ?.flatMap(node => node.content || [])
      ?.filter(node => node.type === 'variable')
      ?.map(node => node.attrs) || [];
    
    // 将属性映射到变量数据
    return variableAttrs.map(attrs => {
      if (!attrs) return null;
      
      // 找到完整的变量数据
      const matchedVar = variables.find(v => 
        v.id === attrs.id && 
        v.field === attrs.field
      );
      
      // 如果找到则返回完整数据，否则从属性构建
      return matchedVar || {
        id: attrs.id || '',
        field: attrs.field || '',
        sourceName: attrs.sourceName || '',
        sourceType: attrs.sourceType || 'unknown',
        get identifier() {
          return `@gv_${attrs.id || ''}_${attrs.field || ''}`;
        }
      };
    }).filter(Boolean) as VariableData[];
  };
  
  // 显示解析后的变量预览
  const handleShowPreview = async () => {
    try {
      setPreviewLoading(true);
      
      if (editor) {
        const html = editor.getHTML();
        const resolvedText = await resolveContent(html);
        setResolvedContent(resolvedText);
        setPreviewModalVisible(true);
      }
    } catch (error) {
      console.error('[VariableEditorX] 预览解析变量失败:', error);
    } finally {
      setPreviewLoading(false);
    }
  };
  
  // 打开变量选择器
  const handleOpenVariableSelector = () => {
    setModalVisible(true);
  };

  // 暴露API
  useImperativeHandle(ref, () => ({
    insertVariable,
    getContent: () => editor?.getHTML() || '',
    getResolvedContent: async () => resolveContent(editor?.getHTML() || ''),
    focusEditor: () => editor?.commands.focus(),
    clearContent: () => editor?.commands.clearContent(),
    getUsedVariables,
  }));

  return (
    <div className={`variable-editor-x-container ${className}`} style={style}>
      {/* 编辑器容器 */}
      <div 
        className="editor-container"
        style={{ 
          position: 'relative',
          border: `1px solid ${isFocused ? '#40a9ff' : '#d9d9d9'}`,
          borderRadius: '4px',
          padding: '0px 11px',
          transition: 'all 0.3s',
          minHeight: '150px',
          boxShadow: isFocused ? '0 0 0 2px rgba(24, 144, 255, 0.2)' : 'none',
          cursor: 'text',
        }}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent 
          editor={editor} 
          style={{
            margin: '4px 0',
            outline: 'none',
          }}
        />
        
        {/* 占位符 */}
        {!editor?.isFocused && !editor?.getText() && placeholder && (
          <div 
            className="editor-placeholder"
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              pointerEvents: 'none',
              color: '#aaa',
            }}
          >
            {placeholder}
          </div>
        )}
      </div>
      
      {/* 底部工具栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        {/* 变量插入按钮 */}
        <Tooltip title="点击打开变量选择器">
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              padding: '3px 8px 3px 4px',
              borderRadius: '4px',
              border: '1px solid #f0f0f0',
              backgroundColor: '#fafafa',
              cursor: 'pointer',
              width: 'fit-content',
            }}
            onClick={handleOpenVariableSelector}
          >
            <PlusCircleOutlined style={{ marginRight: '4px', fontSize: '14px' }} />
            <span style={{ 
              fontSize: '12px',
              whiteSpace: 'nowrap',
              color: 'rgba(0, 0, 0, 0.45)'
            }}>
              输入@或点击插入变量
            </span>
          </div>
        </Tooltip>
        
        {/* 显示解析值按钮 */}
        <Tooltip title="显示解析后的变量值">
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #f0f0f0',
              backgroundColor: '#fafafa',
              cursor: 'pointer',
              width: 'fit-content',
            }}
            onClick={handleShowPreview}
          >
            <EyeOutlined style={{ marginRight: '4px', fontSize: '14px' }} />
            <span style={{ 
              fontSize: '12px',
              whiteSpace: 'nowrap',
              color: 'rgba(0, 0, 0, 0.45)'
            }}>
              显示解析值
            </span>
          </div>
        </Tooltip>
      </div>
      
      {/* 调试面板 */}
      {debug && <DebugPanel editor={editor} />}
      
      {/* 变量选择器模态窗口 */}
      <VariableSelectorModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSelect={handleSelectVariable}
      />
      
      {/* 变量解析预览模态窗口 */}
      {previewModalVisible && (
        <div 
          className="preview-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onClick={() => setPreviewModalVisible(false)}
        >
          <div 
            className="preview-modal"
            style={{
              width: '500px',
              backgroundColor: '#fff',
              borderRadius: '4px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px', fontWeight: 'bold' }}>
              变量解析预览
            </div>
            
            <div style={{ 
              padding: '12px',
              backgroundColor: '#f0f7ff',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.5',
              marginBottom: '16px',
              border: '1px solid #d6e8ff',
            }}>
              {previewLoading ? '加载中...' : resolvedContent}
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <Button onClick={() => setPreviewModalVisible(false)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default VariableEditorX;
