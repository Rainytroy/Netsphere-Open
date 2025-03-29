import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { VariableEditorRef } from '../variable/VariableEditorUtils';
import VariableEditorX from '../../pages/demo/variable-editor-enhanced/index';
import { VariableData, VariableEditorXRef } from '../../pages/demo/variable-editor-enhanced/types';
import { Variable } from './types';

/**
 * 适配器属性
 */
interface VariableEditorXAdapterProps {
  variables: Variable[];
  initialContent?: string;
  placeholder?: string;
  debug?: boolean;
  onChange?: (content: string) => void;
  onVariableInsert?: (variable: any) => void;
  style?: React.CSSProperties;
}

/**
 * 变量编辑器X适配器
 * 
 * 将VariableEditorX组件的接口适配到VariableEditorRef接口，
 * 使得可以在原有的VariableEditor2Demo中使用新的VariableEditorX组件
 */
const VariableEditorXAdapter = forwardRef<VariableEditorRef, VariableEditorXAdapterProps>((props, ref) => {
  // 获取新编辑器的引用
  const editorXRef = useRef<VariableEditorXRef>(null);
  
  // 日志跟踪
  console.log('[VariableEditorXAdapter] 渲染');
  console.log('[VariableEditorXAdapter] 变量数量:', props.variables?.length || 0);
  
  // 将变量转换为VariableData类型
  const convertVariables = (variables: Variable[]): VariableData[] => {
    if (!variables || variables.length === 0) return [];
    
    return variables.map(v => ({
      id: v.id,
      field: v.identifier.split('_').pop() || 'value',
      sourceName: v.sourceName,
      sourceType: v.type,
      value: v.value,
      get identifier() {
        return `@gv_${v.id}_${this.field}`;
      }
    }));
  };
  
  // 适配器接口，将VariableEditorXRef转换为VariableEditorRef
  useImperativeHandle(ref, () => ({
    // 获取原始内容
    getRawContent: () => {
      console.log('[VariableEditorXAdapter] getRawContent 调用');
      return editorXRef.current?.getContent() || '';
    },
    
    // 获取富文本内容
    getRichContent: () => {
      console.log('[VariableEditorXAdapter] getRichContent 调用');
      const content = editorXRef.current?.getContent() || '';
      return {
        html: content,
        rawText: content,
        plainText: content.replace(/<[^>]+>/g, '')
      };
    },
    
    // 更新内容
    updateContent: (content: string) => {
      console.log('[VariableEditorXAdapter] updateContent 调用');
      // X编辑器没有直接的updateContent方法，但可以使用clearContent后手动设置
      if (editorXRef.current) {
        editorXRef.current.clearContent();
        // 插入新内容
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        // 执行完成后模拟onChange事件
        if (props.onChange) {
          props.onChange(content);
        }
      }
    },
    
    // 更新富文本内容
    updateRichContent: (content: any) => {
      console.log('[VariableEditorXAdapter] updateRichContent 调用');
      if (editorXRef.current && content) {
        editorXRef.current.clearContent();
        if (props.onChange) {
          props.onChange(content.html || content.rawText || '');
        }
      }
    },
    
    // 解析外部内容
    parseExternalContent: (text: string) => {
      console.log('[VariableEditorXAdapter] parseExternalContent 调用:', text);
      // 简单实现，直接更新内容
      if (editorXRef.current && text) {
        editorXRef.current.clearContent();
        if (props.onChange) {
          props.onChange(text);
        }
      }
    },
    
    // 获取解析后的内容
    getResolvedContent: async () => {
      console.log('[VariableEditorXAdapter] getResolvedContent 调用');
      if (editorXRef.current) {
        return await editorXRef.current.getResolvedContent();
      }
      return '';
    },
    
    // 插入变量
    insertVariable: (variable: any) => {
      console.log('[VariableEditorXAdapter] insertVariable 调用:', variable);
      if (editorXRef.current) {
        const varData: VariableData = {
          id: variable.id,
          field: variable.identifier.split('_').pop() || 'value',
          sourceName: variable.sourceName,
          sourceType: variable.type,
          value: variable.value,
          get identifier() {
            return `@gv_${variable.id}_${this.field}`;
          }
        };
        
        editorXRef.current.insertVariable(varData);
      }
    },
    
    // 聚焦编辑器 (从focus重命名为focusEditor以匹配接口)
    focusEditor: () => {
      console.log('[VariableEditorXAdapter] focusEditor 调用');
      editorXRef.current?.focusEditor();
    },
    
    // 保留原focus方法用于兼容
    focus: () => {
      console.log('[VariableEditorXAdapter] focus 调用 (已废弃，请使用focusEditor)');
      editorXRef.current?.focusEditor();
    }
  }));
  
  return (
    <div className="variable-editor-x-adapter">
      <VariableEditorX
        ref={editorXRef}
        initialContent={props.initialContent}
        onChange={props.onChange}
        onVariableInsert={(variable) => {
          console.log('[VariableEditorXAdapter] onVariableInsert:', variable);
          if (props.onVariableInsert) {
            // 转换回旧格式变量
            const oldVariable = {
              id: variable.id,
              name: variable.field,
              identifier: variable.identifier,
              type: variable.sourceType,
              sourceId: variable.id,
              sourceName: variable.sourceName,
              value: variable.value
            };
            props.onVariableInsert(oldVariable);
          }
        }}
        placeholder={props.placeholder}
        debug={props.debug}
        style={props.style}
      />
      <div style={{ 
        marginTop: '4px', 
        fontSize: '12px', 
        color: '#1890ff',
        textAlign: 'right',
        padding: '2px 8px'
      }}>
        使用新版变量编辑器X (适配器模式)
      </div>
    </div>
  );
});

export default VariableEditorXAdapter;
