import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import VariableEditorXWrapper, { VariableEditorXRef, VariableData } from '../../components/VariableEditorXWrapper';
import { convertToSystemIdentifiers } from '../../utils/templateUtils';

/**
 * VexPromptEditor适配器组件
 * 为VariableEditorXWrapper提供兼容旧版VariableEditor的API接口
 * 作为PromptTemplateManager和VEX编辑器的中间层
 */

// 对外暴露的组件引用接口
export interface VexPromptEditorRef {
  // 兼容旧API: 解析外部内容到编辑器
  parseExternalContent: (content: string) => void;
  
  // 兼容旧API: 获取富文本内容
  getRichContent: () => { html: string; rawText: string };
  
  // 兼容旧API: 获取原始内容
  getRawContent: () => string;
  
  // 兼容旧API: 更新内容
  updateContent: (content: string) => void;
  
  // 兼容旧API: 插入变量
  insertVariable: (variable: any) => void;
  
  // 获取编辑器中已使用的变量列表
  getUsedVariables: () => VariableData[];
}

// 组件Props定义
interface VexPromptEditorProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string | number;
  style?: React.CSSProperties;
  className?: string;
  variables?: any[];
  currentTaskName?: string;
  npcs?: any[]; // 添加npcs参数，用于标识符转换
}

/**
 * VexPromptEditor组件
 * 使用forwardRef将ref传递给内部的VariableEditorXWrapper
 */
const VexPromptEditor = forwardRef<VexPromptEditorRef, VexPromptEditorProps>((props, ref) => {
  // 引用内部的VariableEditorXWrapper
  const editorRef = useRef<VariableEditorXRef>(null);
  
  // 标记组件是否已挂载
  const isMounted = useRef<boolean>(false);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // 转换变量格式：从旧版变量格式转换为VEX变量格式
  const convertToVexVariable = (variable: any): VariableData => {
    return {
      id: variable.id || variable.sourceId || '',
      field: variable.field || variable.name || '',
      sourceName: variable.sourceName || variable.source?.name || 'Unknown',
      sourceType: variable.type || variable.source?.type || 'custom',
      value: variable.value || '',
      displayIdentifier: variable.displayIdentifier,
      
      // 不在变量参数中存在时，通过getter自动生成
      get identifier() {
        return `@gv_${this.id}_${this.field}`;
      }
    };
  };
  
// 移除内部的convertToSystemIdentifiers函数，改用从templateUtils导入的函数

// 定义一个强化的刷新函数，确保标识符正确转换
  const refreshAndConvertContent = () => {
    if (!editorRef.current || !isMounted.current || !props.npcs?.length) return;
    
    try {
      // 获取当前内容
      const currentContent = editorRef.current.getRawText();
      if (!currentContent) return;
      
      // 执行强制转换
      console.log('[VexPromptEditor] 执行强制标识符转换...');
      const convertedContent = convertToSystemIdentifiers(currentContent, props.npcs);
      
      // 如果内容有变化，更新编辑器
      if (convertedContent !== currentContent) {
        console.log('[VexPromptEditor] 内容已转换为系统标识符格式');
        editorRef.current.setContent(convertedContent);
        
        // 等待内容更新，然后刷新变量节点
        setTimeout(() => {
          if (editorRef.current) {
            console.log('[VexPromptEditor] 刷新变量节点...');
            editorRef.current.refreshVariables();
          }
        }, 100);
      } else {
        // 即使内容没变化，也刷新变量节点
        console.log('[VexPromptEditor] 内容无需转换，仅刷新变量节点');
        editorRef.current.refreshVariables();
      }
    } catch (error) {
      console.error('[VexPromptEditor] 内容刷新转换错误:', error);
    }
  };

// 向外暴露兼容旧API的方法
  useImperativeHandle(ref, () => ({
    // 兼容旧API: parseExternalContent - 使用正确的标识符转换逻辑
    parseExternalContent: (content: string) => {
      if (editorRef.current && isMounted.current) {
        try {
          // 确保我们有NPC数据用于转换
          if (!props.npcs?.length) {
            console.warn('[VexPromptEditor] NPC数据尚未加载，无法转换标识符');
            // 直接设置内容，等待后续有NPC数据时再转换
            editorRef.current.setContent(content);
            return;
          }
          
          // 使用从templateUtils导入的函数，传入npcs数组
          const processedContent = convertToSystemIdentifiers(content, props.npcs);
          
          // 记录内容变化
          if (processedContent !== content) {
            console.log('[VexPromptEditor] 内容已转换为系统标识符格式');
          }
          
          // 设置内容到编辑器
          editorRef.current.setContent(processedContent);
          
          // 确保变量节点同步 - 使用更长延迟确保编辑器状态稳定
          setTimeout(() => {
            try {
              // 获取当前内容
              const editor = editorRef.current;
              if (!editor) return;
              
              // 立即刷新变量
              console.log('[VexPromptEditor] 执行变量刷新');
              editor.refreshVariables();
            } catch (refreshError) {
              console.error('[VexPromptEditor] 变量刷新错误:', refreshError);
            }
          }, 150); // 使用更长延迟确保稳定
        } catch (error) {
          console.error('[VexPromptEditor] 内容处理错误:', error);
          // 降级处理，直接设置原内容
          editorRef.current.setContent(content);
        }
      }
    },
    
    // 新增: 刷新并转换标识符 - 供外部调用
    refreshVariables: () => {
      refreshAndConvertContent();
    },
    
    // 兼容旧API: getRichContent
    getRichContent: () => {
      if (!editorRef.current || !isMounted.current) {
        return { html: '', rawText: '' };
      }
      
      // 获取HTML内容和rawText
      const html = editorRef.current.getContent() || '';
      const rawText = editorRef.current.getRawText() || '';
      
      return { html, rawText };
    },
    
    // 兼容旧API: getRawContent
    getRawContent: () => {
      if (!editorRef.current || !isMounted.current) {
        return '';
      }
      
      return editorRef.current.getRawText() || '';
    },
    
    // 兼容旧API: updateContent
    updateContent: (content: string) => {
      if (editorRef.current && isMounted.current) {
        editorRef.current.setContent(content);
      }
    },
    
    // 兼容旧API: insertVariable
    insertVariable: (variable: any) => {
      if (!editorRef.current || !isMounted.current) {
        return;
      }
      
      try {
        // 转换变量格式并插入
        const vexVariable = convertToVexVariable(variable);
        editorRef.current.insertVariable(vexVariable);
      } catch (error) {
        console.error('插入变量失败:', error);
      }
    },
    
    // 获取编辑器中已使用的变量列表 - 委托给内部VariableEditorXWrapper
    getUsedVariables: () => {
      if (!editorRef.current || !isMounted.current) {
        return [];
      }
      
      try {
        // 委托给内部的VariableEditorXWrapper
        return editorRef.current.getUsedVariables();
      } catch (error) {
        console.error('获取已使用变量失败:', error);
        return [];
      }
    }
  }));
  
  // 提取和处理Props
  const {
    defaultValue = '',
    onChange,
    readOnly = false,
    placeholder = '请输入提示词模板，使用@符号引用变量',
    minHeight = '120px',
    style = {},
    className = '',
    variables = [],
    currentTaskName = '',
    ...otherProps
  } = props;
  
  // 处理onChange事件
  const handleChange = (content: string) => {
    if (onChange && editorRef.current) {
      onChange(content);
    }
  };
  
  // 合并样式
  const combinedStyle = {
    ...style,
    minHeight,
  };
  
  // 当编辑器挂载后，自动触发内容转换
  useEffect(() => {
    if (editorRef.current && isMounted.current && defaultValue) {
      // 延迟执行，确保初始化完成
      const timer = setTimeout(() => {
        try {
          // 获取当前内容
          const editor = editorRef.current;
          if (!editor) return;
          
          const currentContent = editor.getRawText();
          
          // 如果内容包含非系统标识符，执行转换并更新
          if (currentContent.includes('@') && !currentContent.includes('@gv_') && props.npcs?.length) {
            console.log('[VexPromptEditor] 检测到非系统标识符，执行转换');
            const convertedContent = convertToSystemIdentifiers(currentContent, props.npcs);
            if (convertedContent !== currentContent) {
              editor.setContent(convertedContent);
              // 刷新变量节点
              setTimeout(() => editor.refreshVariables(), 50);
            }
          }
        } catch (error) {
          console.error('[VexPromptEditor] 初始化内容转换错误:', error);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [defaultValue, props.npcs]); // 依赖defaultValue和npcs变化

  return (
    <VariableEditorXWrapper
      ref={editorRef}
      initialContent={defaultValue}
      contentFormat="rawText"
      onChange={handleChange}
      readOnly={readOnly}
      placeholder={placeholder}
      height={typeof minHeight === 'number' ? minHeight : undefined}
      style={combinedStyle}
      className={`vex-prompt-editor ${className}`}
      toolbar={{
        insertVariable: true,
        preview: true,
        refresh: true
      }}
      {...otherProps}
    />
  );
});

// 添加组件显示名
VexPromptEditor.displayName = 'VexPromptEditor';

export default VexPromptEditor;
