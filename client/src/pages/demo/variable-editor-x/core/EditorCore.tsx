import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { Variable, VariableSuggestion, VariableKey } from '../extensions';
import { contentFormatManager } from '../managers/ContentFormatManager';
import { variableNodeManager } from '../managers/VariableNodeManager';
import { VariableData } from '../types';

/**
 * EditorCore组件属性
 */
export interface EditorCoreProps {
  initialContent?: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (html: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onVariableSuggestionTrigger?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * EditorCore引用接口
 */
export interface EditorCoreRef {
  editor: Editor | null;
  getHTML: () => string;
  getJSON: () => object;
  getRawText: () => string;
  insertVariable: (variable: VariableData) => void;
  syncVariableNodes: () => void;
  focus: () => void;
  clearContent: () => void;
  isEmpty: () => boolean;
  setContent: (content: string) => void;
}

/**
 * 编辑器核心组件
 * 提供基础的TipTap编辑器功能，不包含额外的UI和变量处理逻辑
 * 拆分自VariableEditorX组件
 */
const EditorCore = forwardRef<EditorCoreRef, EditorCoreProps>((props, ref) => {
  // 解构属性
  const {
    initialContent = '<p></p>',
    readOnly = false,
    placeholder,
    onChange,
    onFocus,
    onBlur,
    onVariableSuggestionTrigger,
    className = '',
    style = {},
  } = props;

  // 状态
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // 处理编辑器粘贴事件
  const handlePaste = useCallback(({ editor, event }: any) => {
    // 安全检查：确保editor存在且可编辑
    if (!editor || typeof editor.isEditable !== 'boolean' || !editor.isEditable) {
      console.warn('[EditorCore.handlePaste] 编辑器为空或不可编辑，跳过自定义粘贴处理');
      return; // 直接返回，允许默认的粘贴行为
    }
    
    // 定义在最外层，确保在所有代码块中可访问
    let pastedText = '';
    let pastedHtml = '';
    
    try {
      // 阻止默认行为
      event.preventDefault();
      
      // 获取剪贴板数据
      const clipboardData = event.clipboardData || (window as any).clipboardData;
      pastedText = clipboardData.getData('text/plain') || '';
      pastedHtml = clipboardData.getData('text/html') || '';
      
      // 先获取粘贴内容
      const contentToProcess = pastedHtml || pastedText;
      if (!contentToProcess) {
        console.warn('[EditorCore.handlePaste] 粘贴内容为空');
        return;
      }
      
      // 检测内容类型
      const contentType = contentFormatManager.detectContentType(contentToProcess);
      console.log('[EditorCore.handlePaste] 粘贴内容类型:', contentType);
      
      // 根据类型处理
      let processedContent;
      
      if (contentType === 'html') {
        // 直接插入HTML，但需要确保变量标签被正确处理
        processedContent = contentToProcess;
      } else if (contentType === 'text') {
        // 文本可能包含变量标识符，转换为HTML
        processedContent = contentFormatManager.convertTextToHtml(contentToProcess);
      } else {
        // 不支持直接粘贴JSON，回退到纯文本
        processedContent = pastedText;
      }
      
      // 插入处理后的内容
      editor.chain().focus().insertContent(processedContent).run();
      
      // 立即同步变量节点，确保一致性
      setTimeout(() => {
        if (editor) {
          variableNodeManager.syncVariableNodes(editor);
        }
      }, 50);
    } catch (error) {
      console.error('[EditorCore.handlePaste] 处理粘贴内容出错:', error);
      // 出错时回退到默认粘贴行为
      if (editor) {
        try {
          editor.chain().focus().insertContent(pastedText).run();
        } catch (e) {
          console.error('[EditorCore.handlePaste] 回退粘贴也失败:', e);
        }
      }
    }
  }, []);
  
  // 初始化编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Variable,
      // 使用VariableKey替代VariableSuggestion，采用更简单直接的键盘事件监听方法
      VariableKey.configure({
        onAtKey: () => {
          console.log('[EditorCore] @ 键按下，触发变量选择器');
          // 触发父组件的回调函数显示变量选择器
          if (onVariableSuggestionTrigger) {
            console.log('[EditorCore] 调用父组件回调');
            onVariableSuggestionTrigger();
          } else {
            console.warn('[EditorCore] 未提供变量选择器回调');
          }
        }
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    
    // 更新事件
    onUpdate: ({ editor }) => {
      // 获取HTML内容
      const html = editor.getHTML();
      
      // 触发变更回调
      onChange?.(html);
    },
    
    // 粘贴事件处理
    onPaste: handlePaste,
    
    // 聚焦和失焦事件
    onFocus: () => {
      setIsFocused(true);
      onFocus?.();
    },
    onBlur: () => {
      setIsFocused(false);
      onBlur?.();
    },
  });
  
  // 当初始内容变化时处理
  useEffect(() => {
    if (!editor || !initialContent) return;
    
    const contentType = contentFormatManager.detectContentType(initialContent);
    console.log('[EditorCore] 初始内容类型:', contentType);
    
    // 根据内容类型处理
    if (contentType === 'json') {
      try {
        // 解析JSON
        const json = typeof initialContent === 'string' 
          ? JSON.parse(initialContent) 
          : initialContent;
        
        // 设置内容
        editor.commands.setContent(json);
      } catch (e) {
        console.error('[EditorCore] JSON解析失败:', e);
        // 回退到默认处理
        editor.commands.setContent(initialContent);
      }
    } else if (contentType === 'text') {
      // 转换文本到HTML
      const html = contentFormatManager.convertTextToHtml(initialContent);
      editor.commands.setContent(html);
    } else {
      // HTML内容直接设置
      editor.commands.setContent(initialContent);
    }
    
    // 同步变量节点
    setTimeout(() => {
      if (editor) {
        variableNodeManager.syncVariableNodes(editor);
      }
    }, 100);
  }, [editor, initialContent]);
  
  // 当readOnly属性变化时更新编辑器
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);
  
  // 暴露API
  useImperativeHandle(ref, () => ({
    // 获取编辑器实例
    editor: editor || null,
    
    // 获取HTML内容
    getHTML: () => {
      if (!editor) return '';
      
      // 先同步变量节点，确保内容一致性
      variableNodeManager.syncVariableNodes(editor);
      return editor.getHTML();
    },
    
    // 获取JSON内容
    getJSON: () => {
      if (!editor) return {};
      return editor.getJSON();
    },
    
    // 获取原始文本内容
    getRawText: () => {
      if (!editor) return '';
      return contentFormatManager.getRawTextFromEditor(editor);
    },
    
    // 插入变量
    insertVariable: (variable: VariableData) => {
      if (!editor) return;
      variableNodeManager.insertVariable(editor, variable);
    },
    
    // 同步变量节点
    syncVariableNodes: () => {
      if (!editor) return;
      variableNodeManager.syncVariableNodes(editor);
    },
    
    // 聚焦编辑器
    focus: () => {
      if (editor) {
        editor.commands.focus();
      }
    },
    
    // 清空内容
    clearContent: () => {
      if (editor) {
        editor.commands.clearContent();
      }
    },
    
    // 检查是否为空
    isEmpty: () => {
      if (!editor) return true;
      return editor.isEmpty;
    },
    
    // 设置内容
    setContent: (content: string) => {
      if (!editor) return;
      
      const contentType = contentFormatManager.detectContentType(content);
      
      if (contentType === 'json') {
        try {
          const json = typeof content === 'string' ? JSON.parse(content) : content;
          editor.commands.setContent(json);
        } catch (e) {
          console.error('[EditorCore.setContent] JSON解析失败:', e);
          editor.commands.setContent(content);
        }
      } else if (contentType === 'text') {
        const html = contentFormatManager.convertTextToHtml(content);
        editor.commands.setContent(html);
      } else {
        editor.commands.setContent(content);
      }
      
      // 同步变量节点
      setTimeout(() => variableNodeManager.syncVariableNodes(editor), 50);
    }
  }));
  
  // 渲染
  return (
    <div 
      className={`editor-core ${className}`} 
      style={{ 
        position: 'relative',
        width: '100%',
        ...style
      }}
    >
      <EditorContent 
        editor={editor}
        className="tiptap-content-wrapper"
      />
      
      {/* 占位符 */}
      {editor && !isFocused && editor.isEmpty && placeholder && (
        <div 
          className="editor-placeholder"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            userSelect: 'none',
            color: '#aaa',
            padding: '1rem',
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
});

export default EditorCore;
