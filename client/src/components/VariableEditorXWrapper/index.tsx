import React, { forwardRef, useImperativeHandle, useRef, useMemo, useState, CSSProperties, useCallback, useEffect } from 'react';
import EditorCore, { EditorCoreRef } from '../../pages/demo/variable-editor-x/core/EditorCore';
import { VariableEditorXWrapperProps } from './types';
import { VariableEditorXRef, VariableData } from './types';
import { useVariableData } from '../../pages/demo/variable-editor-x/hooks/useVariableData';
import formatUtils from './utils';
import CustomToolbar from './CustomToolbar';
import VariableSelectorModal from '../../pages/demo/variable-editor-x/components/VariableSelectorModal';
import PreviewModal from '../../pages/demo/variable-editor-x/components/PreviewModal';
import { useVariableParser } from '../../pages/demo/variable-editor-x/hooks/useVariableParser';
import './styles.css';

/**
 * VariableEditorXWrapper
 * 对VariableEditorX的NPC风格封装，提供更简洁的API和更统一的使用方式
 * 使用扁平化设计，与NPC模板编辑器保持一致的视觉风格
 * V1.2 版本采用EditorCore直接集成，优化DOM结构和错误处理
 */
const VariableEditorXWrapper = forwardRef<VariableEditorXRef, VariableEditorXWrapperProps>((props, ref) => {
  // 解构属性，设置默认值
  const {
    initialContent = '',
    contentFormat = 'rawText',
    onChange,
    readOnly = false,
    className = '',
    style = {},
    height = 200,
    placeholder = '在此输入文本，使用@符号触发变量选择',
    toolbar = true,
  } = props;
  
  // 编辑器核心引用 - 直接使用EditorCore
  const editorRef = useRef<EditorCoreRef>(null);
  
  // 模态窗口状态
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [resolvedContent, setResolvedContent] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  
  // 获取变量数据，解析器和刷新函数
  const { variables, loading, refreshVariables } = useVariableData();
  const { parseText } = useVariableParser();

  // 组件加载状态监控
  useEffect(() => {
    setIsReady(true);
    
    return () => {
      setIsReady(false);
    };
  }, []);
  
  // 根据contentFormat处理初始内容
  const processedInitialContent = useMemo(() => {
    try {
      if (contentFormat === 'rawText' && initialContent) {
        // 转换rawText为HTML供编辑器渲染
        return formatUtils.rawTextToHtml(initialContent, variables);
      }
      return initialContent;
    } catch (error) {
      console.error('[VEX-1.2] 初始内容处理错误:', error);
      // 出错时返回空内容，避免组件崩溃
      return '';
    }
  }, [initialContent, contentFormat, variables]);
  
// 处理内容变更
const handleContentChange = useCallback((content: string) => {
  if (onChange && typeof onChange === 'function') {
    try {
      if (contentFormat === 'rawText' && editorRef.current) {
        // 直接获取rawText并传递给onChange
        const rawText = editorRef.current.getRawText();
        // 添加详细日志，追踪内容变化
        console.log('[VariableEditorXWrapper] 内容变更(rawText模式):', {
          htmlLength: content.length,
          rawTextLength: rawText.length,
          hasValidContent: !!rawText
        });
        onChange(rawText); // 传递rawText而不是HTML
      } else {
        // 原有行为，传递HTML内容
        console.log('[VariableEditorXWrapper] 内容变更(HTML模式):', {
          contentLength: content.length,
        });
        onChange(content);
      }
    } catch (error) {
      console.error('[VEX-1.2] 内容变更回调错误:', error);
      // 降级处理：至少返回某种形式的内容
      if (content) {
        onChange(content);
      }
    }
  }
}, [onChange, contentFormat]);
  
  // 处理工具栏配置
  const toolbarConfig = useMemo(() => {
    if (typeof toolbar === 'boolean') {
      return toolbar ? undefined : false;
    }
    
    // 转换简化的工具栏配置为原始组件的格式
    return {
      showInsertVariable: toolbar.insertVariable !== false,
      showPreview: toolbar.preview !== false,
      showRefreshVariables: toolbar.refresh !== false,
      showVersion: true
    };
  }, [toolbar]);
  
  // 计算样式
  const combinedStyle: CSSProperties = useMemo(() => ({
    ...style,
    // 只有在未明确设置自动高度时才使用固定高度
    height: style.height === 'auto' ? 'auto' : height
  }), [style, height]);
  
  // 暴露API
  useImperativeHandle(ref, () => ({
    // 插入变量
    insertVariable: (variable: VariableData) => {
      if (editorRef.current && isReady) {
        try {
          editorRef.current.insertVariable(variable);
        } catch (error) {
          console.error('[VEX-1.2] 插入变量错误:', error);
        }
      }
    },
    
    // 获取HTML内容
    getContent: () => {
      if (!editorRef.current || !isReady) return '';
      
      try {
        return editorRef.current.getHTML();
      } catch (error) {
        console.error('[VEX-1.2] 获取内容错误:', error);
        return '';
      }
    },
    
    // 获取原始文本（系统标识符格式）
    getRawText: () => {
      if (!editorRef.current || !isReady) return '';
      
      try {
        return editorRef.current.getRawText();
      } catch (error) {
        console.error('[VEX-1.2] 获取原始文本错误:', error);
        return '';
      }
    },
    
    // 获取解析后内容
    getResolvedContent: async () => {
      if (!editorRef.current || !isReady) return '';
      
      try {
        const rawText = editorRef.current.getRawText();
        return await parseText(rawText);
      } catch (error) {
        console.error('[VEX-1.2] 获取解析内容错误:', error);
        return '';
      }
    },
    
    // 聚焦编辑器
    focusEditor: () => {
      if (editorRef.current && isReady) {
        try {
          editorRef.current.focus();
        } catch (error) {
          console.error('[VEX-1.2] 聚焦编辑器错误:', error);
        }
      }
    },
    
    // 清空内容
    clearContent: () => {
      if (editorRef.current && isReady) {
        try {
          editorRef.current.clearContent();
        } catch (error) {
          console.error('[VEX-1.2] 清空内容错误:', error);
        }
      }
    },
    
    // 获取使用的变量
    getUsedVariables: () => {
      if (!editorRef.current || !isReady || !variables.length) return [];
      
      try {
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
      } catch (error) {
        console.error('[VEX-1.2] 获取使用的变量错误:', error);
        return [];
      }
    },
    
    // 刷新变量
    refreshVariables: async () => {
      if (!isReady) return;
      
      try {
        // 首先刷新变量数据
        await refreshVariables();
        
        // 等待确保状态更新
        await new Promise(resolve => setTimeout(resolve, 150));
        
        if (editorRef.current) {
          const rawText = editorRef.current.getRawText();
          
          // 使用最新变量数据将rawText转回HTML
          const updatedHtml = formatUtils.rawTextToHtml(rawText, variables);
          
          // 设置更新后的内容到编辑器
          editorRef.current.setContent(updatedHtml);
          
          // 同步变量节点
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.syncVariableNodes();
            }
          }, 50);
        }
      } catch (error) {
        console.error('[VEX-1.2] 刷新变量错误:', error);
      }
    },
    
    // 设置加载状态
    setLoading: (loading: boolean) => {
      // 此API仅为兼容性保留
      console.log('[VEX-1.2] setLoading已废弃，此方法不执行任何操作');
    },
    
    // 设置内容
    setContent: (content: string) => {
      if (!editorRef.current || !isReady) return;
      
      try {
        // 根据contentFormat处理内容
        if (contentFormat === 'rawText' && content) {
          const htmlContent = formatUtils.rawTextToHtml(content, variables);
          editorRef.current.setContent(htmlContent);
        } else {
          editorRef.current.setContent(content);
        }
        
        // 确保变量节点同步
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.syncVariableNodes();
          }
        }, 50);
      } catch (error) {
        console.error('[VEX-1.2] 设置内容错误:', error);
      }
    }
  }), [isReady, variables, parseText, refreshVariables, contentFormat]);
  
  // 处理变量选择器显示
  const handleShowVariableSelector = useCallback(() => {
    setModalVisible(true);
  }, []);
  
  // 处理变量选择
  const handleSelectVariable = useCallback((variable: VariableData) => {
    if (!editorRef.current || !isReady) {
      setModalVisible(false);
      return;
    }
    
    try {
      editorRef.current.insertVariable(variable);
      setModalVisible(false);
    } catch (error) {
      console.error('[VEX-1.2] 选择变量错误:', error);
      setModalVisible(false);
    }
  }, [isReady]);
  
  // 处理预览显示
  const handleShowPreview = useCallback(async () => {
    if (!editorRef.current || !isReady) return;
    
    try {
      const rawText = editorRef.current.getRawText();
      const parsed = await parseText(rawText);
      setResolvedContent(parsed);
      setPreviewModalVisible(true);
    } catch (error) {
      console.error('[VEX-1.2] 显示预览错误:', error);
    }
  }, [parseText, isReady]);
  
  // 刷新变量处理
  const handleRefreshVariables = useCallback(async () => {
    try {
      await refreshVariables();
      
      // 如果编辑器已准备好，更新内容
      if (editorRef.current && isReady) {
        const rawText = editorRef.current.getRawText();
        
        // 用最新变量数据将rawText转回HTML
        const updatedHtml = formatUtils.rawTextToHtml(rawText, variables);
        
        // 设置更新后的内容到编辑器
        editorRef.current.setContent(updatedHtml);
        
        // 同步变量节点
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.syncVariableNodes();
          }
        }, 50);
      }
    } catch (error) {
      console.error('[VEX-1.2] 刷新变量错误:', error);
    }
  }, [refreshVariables, variables, isReady]);
  
  // 构建工具栏配置对象
  const toolbarProps = useMemo(() => {
    if (typeof toolbar === 'boolean' && !toolbar) {
      return null; // 不显示工具栏
    }
    
    return {
      onInsertVariable: handleShowVariableSelector,
      onShowPreview: handleShowPreview,
      onRefreshVariables: handleRefreshVariables,
      config: typeof toolbar === 'object' ? {
        showInsertVariable: toolbar.insertVariable !== false,
        showPreview: toolbar.preview !== false, 
        showRefreshVariables: toolbar.refresh !== false,
        showVersion: true
      } : undefined
    };
  }, [toolbar, handleShowVariableSelector, handleShowPreview, handleRefreshVariables]);
  
  // 渲染更健壮的编辑器结构，扁平化DOM
  return (
    <div className={`vex-container ${className}`} style={combinedStyle}>
      {/* 编辑器内容区域 - 极简结构，直接使用EditorCore */}
      <div className="editor-content">
        <EditorCore
          ref={editorRef}
          initialContent={processedInitialContent}
          readOnly={readOnly}
          onChange={handleContentChange}
          placeholder={placeholder}
          onVariableSuggestionTrigger={handleShowVariableSelector}
          className=""
          style={{ height: "100%" }}
        />
      </div>
      
      {/* 自定义工具栏 */}
      {toolbarProps && (
        <CustomToolbar
          onInsertVariable={toolbarProps.onInsertVariable}
          onShowPreview={toolbarProps.onShowPreview}
          onRefreshVariables={toolbarProps.onRefreshVariables}
          config={toolbarProps.config}
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
    </div>
  );
});

// 为了更好的DevTools显示
VariableEditorXWrapper.displayName = 'VariableEditorXWrapper';

// 导出组件和类型
export default VariableEditorXWrapper;
export type { VariableEditorXRef, VariableData };
