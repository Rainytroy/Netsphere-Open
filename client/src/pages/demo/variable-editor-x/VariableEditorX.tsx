import React, { forwardRef, useImperativeHandle, useState, useEffect, useCallback, useRef } from 'react';
import { VariableData, VariableEditorXProps, VariableEditorXRef } from './types';
import EditorCore, { EditorCoreRef } from './core/EditorCore';
import { Editor } from '@tiptap/react';
import EditorToolbar from './components/EditorToolbar';
import DebugPanel from './components/DebugPanel';
import VariableSelectorModal from './components/VariableSelectorModal';
import PreviewModal from './components/PreviewModal';
import { useVariableData } from './hooks/useVariableData';
import { useVariableParser } from './hooks/useVariableParser';
import { contentFormatManager } from './managers/ContentFormatManager';
import { rawTextToHtml, htmlToRawText } from './utils/formatters';

import './styles.css';

/**
 * 变量编辑器X (重构版)
 * 基于TipTap的富文本编辑器，支持变量插入、格式转换等功能
 * 采用模块化设计，将核心功能拆分为多个组件和管理器
 */
const VariableEditorX = forwardRef<VariableEditorXRef, VariableEditorXProps>((props, ref) => {
  // 解构属性
  const {
    initialContent = '<p>在此输入文本，使用@符号或点击插入变量按钮添加变量</p>',
    readOnly = false,
    onChange,
    onVariableInsert,
    placeholder = '在此输入文本，使用@符号触发变量选择',
    toolbar = true,
    debug = false,
    className = '',
    style = {},
  } = props;
  
  // 内部状态
  const [content, setContent] = useState<string>(initialContent);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [resolvedContent, setResolvedContent] = useState<string>('');
  const [jsonContent, setJsonContent] = useState<string>('{}');
  const [rawTextContent, setRawTextContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // 加载状态，控制遮罩层显示
  
  // 编辑器核心引用 - 公开为组件实例属性以便外部访问
  const editorRef = useRef<EditorCoreRef>(null);
  
  // 将引用作为公开属性，便于外部组件直接访问EditorCore
  (ref as any).current = {
    ...(ref as any).current || {},
    editorRef
  };
  
  // 获取变量数据
  const { variables, loading, refreshVariables } = useVariableData();
  
  // 获取变量解析器
  const { parseText } = useVariableParser();
  
  // 处理内容变化
  const handleContentChange = useCallback((html: string) => {
    setContent(html);
    
    // 更新其他格式
    if (editorRef.current) {
      const rawText = editorRef.current.getRawText();
      setRawTextContent(rawText);
      
      const json = editorRef.current.getJSON();
      setJsonContent(JSON.stringify(json, null, 2));
    }
    
    // 触发外部回调
    onChange?.(html);
  }, [onChange]);
  
  // 当rawTextContent变化时，更新resolvedContent
  useEffect(() => {
    const updateResolvedContent = async () => {
      if (rawTextContent) {
        const parsedContent = await parseText(rawTextContent);
        setResolvedContent(parsedContent);
      }
    };
    
    updateResolvedContent();
  }, [rawTextContent, parseText]);
  
  // 显示变量选择模态窗口
  const handleShowVariableSelector = useCallback(() => {
    setModalVisible(true);
  }, []);
  
  // 查找@符号位置，智能识别用户新输入的@符号而不是变量中的@
  const findAtSymbolPosition = useCallback((editor: Editor) => {
    try {
      // 1. 获取光标位置和选择信息
      const { selection } = editor.state;
      
      // 2. 直接使用活动光标前的字符来检测触发字符
      const $pos = selection.$from;
      const currentPos = $pos.pos;
      
      console.log('[VariableEditorX] 当前光标位置:', currentPos);
      
      // 3. 检查光标前一个位置的字符
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, currentPos - 1),
        currentPos,
        '\n'
      );
      
      console.log('[VariableEditorX] 光标前一个字符:', JSON.stringify(textBefore));
      
      // 4. 如果光标前一个字符是@，则很可能是用户刚刚输入的
      if (textBefore === '@') {
        console.log('[VariableEditorX] 在光标前找到@符号，位置:', currentPos - 1);
        return {
          found: true,
          position: {
            from: currentPos - 1,  // @符号的位置
            to: currentPos         // 光标当前位置
          }
        };
      }
      
      // 5. 如果不是，尝试在当前文本节点中查找最后一个@
      // 确保找到的不是变量标签内的@符号
      
      // 检查当前节点类型
      try {
        const currentNodeType = $pos.parent.type.name;
        console.log('[VariableEditorX] 当前节点类型:', currentNodeType);
        
        // 如果在变量节点内，不进行处理
        if (currentNodeType === 'variable') {
          console.log('[VariableEditorX] 当前在变量节点内，跳过@符号查找');
          return { found: false };
        }
      } catch (e) {
        console.warn('[VariableEditorX] 检查节点类型出错:', e);
      }
      
      // 获取当前段落内容和位置信息
      const currentNode = $pos.parent;
      const nodeText = currentNode.textContent;
      const nodeStartPos = $pos.start();
      const relativePos = currentPos - nodeStartPos;
      
      console.log('[VariableEditorX] 当前段落文本:', JSON.stringify(nodeText));
      console.log('[VariableEditorX] 段落起始位置:', nodeStartPos, '光标相对位置:', relativePos);
      
      // 获取光标前的文本
      const textBeforeCursor = nodeText.substring(0, relativePos);
      console.log('[VariableEditorX] 光标前文本:', JSON.stringify(textBeforeCursor));
      
      // 查找最近的@符号
      let lastAtIndex = -1;
      
      // 从后向前扫描@符号
      for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
        if (textBeforeCursor[i] === '@') {
          // 检查这个@符号是否可能在变量标签内
          // 如果@后面紧跟着变量名格式的文本，很可能是变量标签的一部分
          const isLikelyInVariableTag = i < textBeforeCursor.length - 1 && 
                                       /[A-Za-z0-9]/.test(textBeforeCursor[i+1]);
          
          if (!isLikelyInVariableTag) {
            lastAtIndex = i;
            break;
          }
        }
      }
      
      // 如果找到合适的@符号，返回其位置
      if (lastAtIndex !== -1) {
        const atSymbolPos = nodeStartPos + lastAtIndex;
        console.log('[VariableEditorX] 在文本中找到@符号，位置:', lastAtIndex, '绝对位置:', atSymbolPos);
        
        return {
          found: true,
          position: {
            from: atSymbolPos,
            to: atSymbolPos + 1, // @ 符号只有一个字符
          }
        };
      }
      
      console.log('[VariableEditorX] 未找到有效的@符号');
      return { found: false };
    } catch (error) {
      console.error('[VariableEditorX] 查找@符号位置出错:', error);
      return { found: false };
    }
  }, []);
  
  // 选择变量
  const handleSelectVariable = useCallback((variable: VariableData) => {
    console.log('[VariableEditorX] 选择变量:', variable);
    
    // 插入变量
    if (editorRef.current && editorRef.current.editor) {
      const editor = editorRef.current.editor;
      
      try {
        // 获取当前光标位置
        const { selection } = editor.state;
        const cursorPos = selection.from;
        
        // 检查光标前一个字符是否为@符号
        if (cursorPos > 0) {
          const charBeforeCursor = editor.state.doc.textBetween(
            cursorPos - 1,
            cursorPos,
            '\n'
          );
          
          console.log('[VariableEditorX] 光标前一个字符:', JSON.stringify(charBeforeCursor));
          
          // 如果光标前一个字符是@符号，则删除它
          if (charBeforeCursor === '@') {
            console.log('[VariableEditorX] 检测到@符号，位置:', cursorPos - 1);
            
            // 删除@符号
            editor.chain().focus().deleteRange({
              from: cursorPos - 1,
              to: cursorPos
            }).run();
            
            console.log('[VariableEditorX] 已删除@符号');
          }
        }
        
        // 插入变量标签
        console.log('[VariableEditorX] 插入变量:', variable.displayIdentifier);
        editorRef.current.insertVariable(variable);
        
        // 确保变量节点同步
        setTimeout(() => {
          if (editorRef.current) {
            const editorCoreRef = (editorRef.current as any)?.editorRef?.current;
            if (editorCoreRef && editorCoreRef.syncVariableNodes) {
              editorCoreRef.syncVariableNodes();
              console.log('[VariableEditorX] 变量节点已同步');
            }
          }
        }, 10);
      } catch (error) {
        console.error('[VariableEditorX] 处理变量插入出错:', error);
        // 出错时尝试直接插入变量
        editorRef.current.insertVariable(variable);
      }
    }
    
    // 关闭模态窗口
    setModalVisible(false);
    
    // 触发外部回调
    onVariableInsert?.(variable);
  }, [onVariableInsert]); // 移除findAtSymbolPosition依赖
  
  // 显示预览
  const handleShowPreview = useCallback(() => {
    setPreviewModalVisible(true);
  }, []);
  
  // 获取使用的变量
  const getUsedVariables = useCallback((): VariableData[] => {
    // 从编辑器获取原始文本，然后提取变量标识符
    if (!editorRef.current || !variables.length) return [];
    
    const rawText = editorRef.current.getRawText();
    
    // 匹配系统标识符
    const systemIdRegex = /@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)/g;
    const matches = rawText.match(systemIdRegex) || [];
    
    // 使用Set去重
    const uniqueIds = new Set<string>();
    const result: VariableData[] = [];
    
    matches.forEach(match => {
      // 提取ID和字段
      const parts = match.split('_');
      if (parts.length >= 3) {
        const id = parts[1];
        const field = parts[2];
        const key = `${id}_${field}`;
        
        // 如果没处理过这个变量
        if (!uniqueIds.has(key)) {
          uniqueIds.add(key);
          
          // 查找对应的变量
          const variable = variables.find(v => v.id === id && v.field === field);
          if (variable) {
            result.push(variable);
          }
        }
      }
    });
    
    return result;
  }, [variables]);
  
  // 重置编辑器内容
  const handleReset = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.clearContent();
    }
  }, []);
  
  // 保存编辑器内容
  const handleSave = useCallback(() => {
    try {
      const rawText = editorRef.current?.getRawText() || '';
      localStorage.setItem('variableEditorX-content', rawText);
      alert('编辑器内容已保存到本地存储');
    } catch (error) {
      console.error('保存内容失败:', error);
      alert('无法保存编辑器内容');
    }
  }, []);

  // 刷新变量函数 - 通过内容重建方式刷新变量标签，保留编辑内容结构
  const handleRefreshVariables = useCallback(async () => {
    if (!editorRef.current) return;
    
    // 首先确保编辑器获得焦点
    editorRef.current.focus();
    
    // 等待短暂时间确保焦点生效
    await new Promise(resolve => setTimeout(resolve, 50));
    
    console.log('[VariableEditorX] 开始刷新变量标签 (通过内容重建方式)');
    
    try {
      // 1. 记录当前选区位置，以便之后恢复
      let cursorPosition = null;
      if (editorRef.current.editor) {
        try {
          // 尝试获取当前选区
          cursorPosition = editorRef.current.editor.state.selection;
          console.log('[VariableEditorX] 已保存当前光标位置');
        } catch (e) {
          console.log('[VariableEditorX] 无法获取当前光标位置:', e);
        }
      }
      
      // 2. 刷新变量数据
      console.log('[VariableEditorX] 刷新变量数据');
      await refreshVariables();
      // 等待确保状态更新
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 3. 获取当前内容并转换为rawText格式
      const currentHtml = editorRef.current.getHTML() || '';
      const rawText = htmlToRawText(currentHtml);
      console.log('[VariableEditorX] 当前内容已转换为rawText格式');
      
      // 4. 使用最新变量数据将rawText转回HTML
      const updatedHtml = rawTextToHtml(rawText, variables);
      console.log('[VariableEditorX] rawText已重新转换为HTML，应用最新变量数据');
      
      // 5. 设置更新后的内容到编辑器
      editorRef.current.setContent(updatedHtml);
      console.log('[VariableEditorX] 已设置更新后的内容');
      
      // 6. 恢复焦点
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.focus();
          console.log('[VariableEditorX] 已恢复编辑器焦点');
        }
      }, 50);
      
      console.log('[VariableEditorX] 变量标签更新完成');
    } catch (error) {
      console.error('[VariableEditorX] 刷新变量数据失败:', error);
    }
  }, [variables, refreshVariables]);
  
  // 暴露API
  useImperativeHandle(ref, () => ({
    // 插入变量
    insertVariable: (variable: VariableData) => {
      if (editorRef.current) {
        editorRef.current.insertVariable(variable);
      }
    },
    
    // 获取HTML内容
    getContent: () => {
      return editorRef.current?.getHTML() || '';
    },
    
    // 获取原始文本
    getRawText: () => {
      return editorRef.current?.getRawText() || '';
    },
    
    // 获取解析后内容
    getResolvedContent: async () => {
      if (editorRef.current) {
        const rawText = editorRef.current.getRawText();
        return await parseText(rawText);
      }
      return '';
    },
    
    // 聚焦编辑器
    focusEditor: () => {
      editorRef.current?.focus();
    },
    
    // 清空内容
    clearContent: () => {
      editorRef.current?.clearContent();
    },
    
    // 获取使用的变量
    getUsedVariables: () => {
      return getUsedVariables();
    },
    
    // 刷新变量标签
    refreshVariables: () => {
      return handleRefreshVariables();
    },
    
    // 设置加载状态 - 新增，控制遮罩层
    setLoading: (loading: boolean) => {
      setIsLoading(loading);
    },
    
    // 设置内容 - 新增，直接暴露EditorCore的setContent方法
    setContent: (content: string) => {
      if (editorRef.current) {
        console.log('[VariableEditorX] 设置内容，长度:', content.length);
        editorRef.current.setContent(content);
        
        // 确保变量节点同步
        setTimeout(() => {
          if (editorRef.current) {
            console.log('[VariableEditorX] 内容设置后同步变量节点');
            editorRef.current.syncVariableNodes();
          }
        }, 50);
      }
    }
  }));
  
  // 编辑器部分和调试面板完全分离
  return (
    <>
      {/* 主编辑区 - 只包含编辑器和底部工具栏 */}
      <div className={`editor-core ${className}`} style={style}>
        <div className="editor-area">
          {/* 编辑器容器 */}
          <div className="editor-container">
            <EditorCore
              ref={editorRef}
              initialContent={initialContent}
              readOnly={readOnly}
              placeholder={placeholder}
              onChange={handleContentChange}
              onVariableSuggestionTrigger={handleShowVariableSelector}
            />
            
            {/* 加载遮罩层 */}
            {isLoading && (
              <div className="editor-loading-overlay">
                <div className="editor-loading-spinner">
                  <div className="spinner-icon"></div>
                  <div className="spinner-text">加载中...</div>
                </div>
              </div>
            )}
          </div>
          
          {/* 底部工具栏，不覆盖在编辑区上 */}
          {toolbar && (
            <div className="editor-bottom-toolbar">
              <EditorToolbar
                onInsertVariable={handleShowVariableSelector}
                onShowPreview={handleShowPreview}
                onRefreshVariables={handleRefreshVariables}
                config={typeof toolbar === 'boolean' ? undefined : toolbar}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* 调试面板 - 完全独立的组件，不在同一个容器内 */}
      {debug && (
        <DebugPanel
          editor={editorRef.current?.editor || null}
          htmlContent={content}
          jsonContent={jsonContent}
          rawTextContent={rawTextContent}
          resolvedContent={resolvedContent}
          usedVariables={getUsedVariables()}
          onReset={handleReset}
        />
      )}
      
      {/* 变量选择器模态窗口 */}
      <VariableSelectorModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSelect={handleSelectVariable}
        variables={variables}
        loading={loading}
      />
      
      {/* 预览模态窗口 */}
      <PreviewModal
        visible={previewModalVisible}
        content={resolvedContent}
        onClose={() => setPreviewModalVisible(false)}
      />
    </>
  );
});

export default VariableEditorX;
