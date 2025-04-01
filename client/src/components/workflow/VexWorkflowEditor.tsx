import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import VariableEditorXWrapper, { VariableEditorXRef, VariableData } from '../../components/VariableEditorXWrapper';

/**
 * VexWorkflowEditor适配器组件
 * 为VariableEditorXWrapper提供与旧版VariableEditor2兼容的API接口
 * 专门用于工作流起点卡的编辑器组件
 */

// 编辑器引用接口 - 兼容原VariableEditorRef API
export interface VexWorkflowEditorRef {
  // 兼容旧API: 更新内容
  updateContent: (content: string) => void;
  
  // 兼容旧API: 获取富文本内容
  getRichContent: () => { html: string; rawText: string };
  
  // 兼容旧API: 获取原始内容
  getRawContent: () => string;
  
  // 兼容旧API: 焦点控制
  focusEditor: () => void;
  
  // 获取编辑器中已使用的变量列表
  getUsedVariables: () => VariableData[];
  
  // 获取解析后的内容 - 变量标识符被替换为实际值
  getResolvedContent: () => Promise<string>;
}

interface VexWorkflowEditorProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string | number;
  style?: React.CSSProperties;
  className?: string;
  variables?: any[];
  workflowId?: string; // 工作流ID，用于标识符生成
}

/**
 * VexWorkflowEditor组件
 * 工作流起点卡专用的VEX编辑器
 */
const VexWorkflowEditor = forwardRef<VexWorkflowEditorRef, VexWorkflowEditorProps>((props, ref) => {
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
  
  // 向外暴露兼容旧API的方法
  useImperativeHandle(ref, () => ({
    // 兼容旧API: updateContent
    updateContent: (content: string) => {
      if (editorRef.current && isMounted.current) {
        try {
          editorRef.current.setContent(content);
        } catch (error) {
          console.error('[VexWorkflowEditor] 更新内容失败:', error);
        }
      }
    },
    
    // 兼容旧API: getRichContent
    getRichContent: () => {
      if (!editorRef.current || !isMounted.current) {
        return { html: '', rawText: '' };
      }
      
      try {
        // 获取HTML内容和rawText
        const html = editorRef.current.getContent() || '';
        const rawText = editorRef.current.getRawText() || '';
        
        return { html, rawText };
      } catch (error) {
        console.error('[VexWorkflowEditor] 获取内容失败:', error);
        return { html: '', rawText: '' };
      }
    },
    
    // 兼容旧API: getRawContent
    getRawContent: () => {
      if (!editorRef.current || !isMounted.current) {
        return '';
      }
      
      try {
        return editorRef.current.getRawText() || '';
      } catch (error) {
        console.error('[VexWorkflowEditor] 获取原始内容失败:', error);
        return '';
      }
    },
    
    // 兼容旧API: focusEditor - 提供焦点控制
    focusEditor: () => {
      if (editorRef.current && isMounted.current) {
        try {
          // 使用setTimeout确保DOM已经渲染完成
          setTimeout(() => {
            if (editorRef.current) {
              // 尝试使用VEX内部的焦点方法
              if (typeof (editorRef.current as any).focus === 'function') {
                (editorRef.current as any).focus();
              }
            }
          }, 100);
        } catch (error) {
          console.error('[VexWorkflowEditor] 设置焦点失败:', error);
        }
      }
    },
    
    // 获取编辑器中已使用的变量列表
    getUsedVariables: () => {
      if (!editorRef.current || !isMounted.current) {
        return [];
      }
      
      try {
        return editorRef.current.getUsedVariables();
      } catch (error) {
        console.error('[VexWorkflowEditor] 获取已使用变量失败:', error);
        return [];
      }
    },
    
    // 获取解析后的内容 - 变量标识符被替换为实际值
    getResolvedContent: async () => {
      if (!editorRef.current || !isMounted.current) {
        return '';
      }
      
      try {
        return await editorRef.current.getResolvedContent();
      } catch (error) {
        console.error('[VexWorkflowEditor] 获取解析内容失败:', error);
        return '';
      }
    }
  }));
  
  // 提取和处理Props
  const {
    defaultValue = '',
    onChange,
    readOnly = false,
    placeholder = '请输入向用户显示的提示文本...',
    minHeight = '120px',
    style = {},
    className = '',
    variables = [],
    workflowId,
    ...otherProps
  } = props;
  
  // 处理onChange事件
  const handleChange = (content: string) => {
    if (onChange && isMounted.current) {
      onChange(content);
    }
  };
  
  // 合并样式
  const combinedStyle = {
    ...style,
    minHeight,
  };
  
  // 处理变量数据
  const preparedVariables = variables.map(convertToVexVariable);
  
  return (
    <VariableEditorXWrapper
      ref={editorRef}
      initialContent={defaultValue}
      contentFormat="rawText" // 确保使用rawText格式
      onChange={handleChange}
      readOnly={readOnly}
      placeholder={placeholder}
      height={typeof minHeight === 'number' ? minHeight : undefined}
      style={combinedStyle}
      className={`vex-workflow-editor ${className}`}
      toolbar={{
        insertVariable: true,
        preview: true,
        refresh: true
      }}
      variables={preparedVariables}
      {...otherProps}
    />
  );
});

// 添加组件显示名
VexWorkflowEditor.displayName = 'VexWorkflowEditor';

export default VexWorkflowEditor;
