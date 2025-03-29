# 变量编辑器VariableEditorX技术实现

**版本**: 1.0.0  
**创建日期**: 2025年3月23日  
**文档状态**: 设计阶段  

## 1. 核心扩展实现

VariableEditorX基于TipTap编辑器框架，通过自定义扩展实现变量处理功能。本节详细介绍两个关键扩展的技术实现。

### 1.1 Variable扩展

Variable扩展是一个自定义的TipTap节点类型，用于在编辑器中表示和渲染变量标签。

#### 1.1.1 扩展定义

```typescript
import { Node, mergeAttributes } from '@tiptap/core';
import { TYPE_COLORS } from '../types';

export interface VariableOptions {
  HTMLAttributes: Record<string, any>,
}

export const Variable = Node.create<VariableOptions>({
  name: 'variable',
  
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },
  
  group: 'inline',
  inline: true,
  atom: true, // 设置为atom，使其不可编辑内部
  
  addAttributes() {
    return {
      id: {
        default: null,
      },
      field: {
        default: null,
      },
      sourceName: {
        default: null,
      },
      sourceType: {
        default: 'unknown',
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-variable]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes }) {
    // 构建系统标识符
    const systemIdentifier = `@gv_${HTMLAttributes.id}_${HTMLAttributes.field}`;
    
    // 构建显示标识符
    const shortId = HTMLAttributes.id.substring(0, 4);
    const displayIdentifier = `@${HTMLAttributes.sourceName}.${HTMLAttributes.field}#${shortId}`;
    
    // 渲染变量标签
    return ['span', mergeAttributes(this.options.HTMLAttributes, {
      'data-variable': '',
      'data-id': HTMLAttributes.id,
      'data-field': HTMLAttributes.field,
      'data-identifier': systemIdentifier,
      'data-type': HTMLAttributes.sourceType,
      'class': `variable-tag variable-type-${HTMLAttributes.sourceType}`,
      'contenteditable': 'false'
    }), displayIdentifier];
  },
  
  // 添加命令，支持通过命令API插入变量
  addCommands() {
    return {
      insertVariable: (attributes) => ({ chain }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: attributes
          })
          .run();
      },
    };
  },
});
```

#### 1.1.2 关键技术点

1. **Atom节点**：通过设置`atom: true`，使变量标签作为一个整体，不可编辑内部
2. **属性定义**：存储变量的关键信息（ID、字段、源名称、类型）
3. **HTML渲染**：将变量信息渲染为带有数据属性的HTML标签
4. **命令支持**：提供`insertVariable`命令用于程序化插入变量

#### 1.1.3 使用方式

```typescript
// 在编辑器中插入变量
editor.chain().focus().insertVariable({
  id: 'f9c17d21-a0a0-476f-973e-433e08f7be38',
  field: 'actlv',
  sourceName: '云透',
  sourceType: 'npc'
}).run();
```

### 1.2 VariableSuggestion扩展

VariableSuggestion扩展用于实现@符号触发的变量选择功能。

#### 1.2.1 扩展定义

```typescript
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export const VariableSuggestion = Extension.create({
  name: 'variableSuggestion',

  addOptions() {
    return {
      suggestion: {
        char: '@', // 触发字符
        // 识别单独的@字符
        pattern: /@$/,
        allowSpaces: false,
        startOfLine: false, // 允许在任何位置触发@
        allowedPrefixes: null, // 允许任何前缀
        
        // 命令回调函数，将在配置时覆盖
        command: ({ editor, range }) => {
          // 删除输入的@
          editor.chain().focus().deleteRange(range).run();
          // 显示变量选择UI
          this.options.onAtKey?.();
        },
        
        // 渲染函数（由外部实现）
        render: () => ({
          onStart: () => {},
          onUpdate: () => {},
          onKeyDown: () => false,
          onExit: () => {},
        }),
      },
      
      // 自定义回调处理函数
      onAtKey: null,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
```

#### 1.2.2 关键技术点

1. **触发模式**：通过`pattern: /@$/`匹配单独的@字符
2. **自定义回调**：通过`onAtKey`选项提供自定义回调函数
3. **插件集成**：使用TipTap的Suggestion插件实现提示功能

#### 1.2.3 使用方式

```typescript
// 配置变量提示扩展
const editor = useEditor({
  extensions: [
    // 其他扩展...
    VariableSuggestion.configure({
      suggestion: {
        command: ({ editor, range }) => {
          // 删除@字符
          editor.chain().focus().deleteRange(range).run();
          // 显示变量选择UI
          handleShowVariableSelector();
        }
      }
    }),
  ],
  // 其他配置...
});
```

## 2. 数据处理实现

### 2.1 变量数据管理

变量数据获取和管理是编辑器的核心功能，通过自定义Hook实现。

#### 2.1.1 useVariableData Hook

```typescript
import { useState, useEffect } from 'react';
import { variableService } from '../../../services/variableService';
import { VariableData, VariableDataImpl } from '../types';

export const useVariableData = () => {
  const [variables, setVariables] = useState<VariableData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchVariables = async () => {
      try {
        setLoading(true);
        
        // 从API获取变量
        const response = await variableService.getVariables();
        
        if (response && response.data && Array.isArray(response.data)) {
          // 转换API返回的变量为VariableData格式
          const variableList = response.data.map(convertToVariableData);
          
          // 去重处理
          const uniqueVariables = removeDuplicateVariables(variableList);
          
          setVariables(uniqueVariables);
        } else {
          console.warn('变量数据格式异常，使用模拟数据');
          setVariables(getMockVariables());
        }
      } catch (error) {
        console.error('获取变量失败:', error);
        setError(error as Error);
        
        // 出错时使用模拟数据
        setVariables(getMockVariables());
      } finally {
        setLoading(false);
      }
    };
    
    fetchVariables();
  }, []);

  // 根据标识符查找变量
  const getVariableByIdentifier = (identifier: string): VariableData | undefined => {
    // 处理可能带@前缀的情况
    const normalizedIdentifier = identifier.startsWith('@') ? identifier.substring(1) : identifier;
    
    // 尝试直接匹配
    let variable = variables.find(v => 
      v.identifier === normalizedIdentifier || 
      v.identifier === identifier
    );
    
    if (variable) return variable;
    
    // 尝试解析标识符
    if (identifier.includes('_')) {
      // 解析@gv_id_field格式
      const parts = identifier.replace(/^@/, '').split('_');
      if (parts.length >= 3 && parts[0] === 'gv') {
        const idPart = parts[1];
        const fieldPart = parts[2];
        
        variable = variables.find(v => 
          v.id === idPart && v.field === fieldPart
        );
        
        if (variable) return variable;
      }
    }
    
    return undefined;
  };

  return { 
    variables, 
    loading, 
    error,
    getVariableByIdentifier
  };
};

// 辅助函数：转换API变量为VariableData格式
const convertToVariableData = (apiVar: any): VariableData => {
  // 实现变量格式转换
  // ...
};

// 辅助函数：移除重复变量
const removeDuplicateVariables = (variables: VariableData[]): VariableData[] => {
  // 实现去重逻辑
  // ...
};

// 辅助函数：生成模拟数据
const getMockVariables = (): VariableData[] => {
  // 返回模拟变量数据
  // ...
};
```

#### 2.1.2 关键技术点

1. **数据获取**：使用variableService获取变量列表
2. **数据转换**：将API返回的数据转换为内部VariableData格式
3. **错误处理**：API请求失败时使用模拟数据
4. **变量查找**：提供根据标识符查找变量的功能

### 2.2 变量解析

变量解析功能用于将系统标识符转换为实际值，实现为useVariableParser Hook。

#### 2.2.1 useVariableParser Hook

```typescript
import { useCallback } from 'react';
import { useVariableData } from './useVariableData';

export const useVariableParser = () => {
  const { variables, getVariableByIdentifier } = useVariableData();
  
  // 解析rawtext中的变量标识符
  const parseText = useCallback(async (text: string): Promise<string> => {
    if (!text) return text;
    
    // 匹配系统标识符
    const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g;
    let result = text;
    
    // 获取所有匹配项
    const matches = text.match(regex) || [];
    
    for (const match of matches) {
      // 查找变量
      const variable = getVariableByIdentifier(match);
      
      if (variable && variable.value) {
        // 替换为变量值
        result = result.replace(new RegExp(escapeRegExp(match), 'g'), variable.value);
      } else {
        // 变量不存在或无值时的处理
        result = result.replace(new RegExp(escapeRegExp(match), 'g'), `[未找到: ${match}]`);
      }
    }
    
    return result;
  }, [variables, getVariableByIdentifier]);
  
  // 将rawtext转换为HTML格式
  const convertToHtml = useCallback(async (text: string): Promise<string> => {
    if (!text) return text;
    
    // 匹配系统标识符
    const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g;
    let result = text;
    
    // 获取所有匹配项
    const matches = text.match(regex) || [];
    
    for (const match of matches) {
      // 查找变量
      const variable = getVariableByIdentifier(match);
      
      if (variable) {
        // 构建变量标签HTML
        const tagHtml = `<span data-variable="" data-id="${variable.id}" data-field="${variable.field}" data-identifier="${match}" data-type="${variable.sourceType}" class="variable-tag variable-type-${variable.sourceType}" contenteditable="false">${variable.displayIdentifier || `@${variable.sourceName}.${variable.field}#${variable.id.substring(0, 4)}`}</span>`;
        
        // 替换文本中的标识符
        result = result.replace(new RegExp(escapeRegExp(match), 'g'), tagHtml);
      }
    }
    
    // 将纯文本段落包装在<p>标签中
    if (!result.startsWith('<')) {
      result = `<p>${result}</p>`;
    }
    
    return result;
  }, [variables, getVariableByIdentifier]);
  
  // 将HTML格式转换为rawtext
  const convertToRawText = useCallback((html: string): string => {
    if (!html) return '';
    
    // 创建临时DOM元素
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 查找所有变量标签
    const variableTags = tempDiv.querySelectorAll('span[data-variable]');
    
    // 替换为系统标识符
    variableTags.forEach(tag => {
      const identifier = tag.getAttribute('data-identifier');
      if (identifier) {
        const textNode = document.createTextNode(identifier);
        tag.parentNode?.replaceChild(textNode, tag);
      }
    });
    
    return tempDiv.textContent || '';
  }, []);
  
  return {
    parseText,
    convertToHtml,
    convertToRawText
  };
};

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

#### 2.2.2 关键技术点

1. **正则匹配**：使用正则表达式识别系统标识符
2. **HTML处理**：使用DOM API处理HTML内容
3. **缓存优化**：使用useCallback优化函数性能
4. **错误处理**：处理变量不存在的情况

### 2.3 格式转换工具

独立的格式转换工具，用于在不同内容格式之间进行转换。

#### 2.3.1 formatters.ts

```typescript
import { VariableData } from '../types';

/**
 * HTML格式转换为rawtext格式
 */
export function htmlToRawText(html: string): string {
  if (!html) return '';
  
  // 创建临时DOM元素
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 查找所有变量标签
  const variableTags = tempDiv.querySelectorAll('span[data-variable]');
  
  // 替换为系统标识符
  variableTags.forEach(tag => {
    const identifier = tag.getAttribute('data-identifier');
    if (identifier) {
      const textNode = document.createTextNode(identifier);
      tag.parentNode?.replaceChild(textNode, tag);
    }
  });
  
  // 移除所有HTML标签，只保留文本内容
  return tempDiv.textContent || '';
}

/**
 * rawtext格式转换为HTML格式
 */
export async function rawTextToHtml(
  text: string, 
  getVariableByIdentifier: (identifier: string) => Promise<VariableData | null>
): Promise<string> {
  if (!text) return '';
  
  // 匹配系统标识符
  const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g;
  
  // 将纯文本包装在段落标签中
  let result = text.split('\n')
    .map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>')
    .join('');
  
  // 获取所有匹配项
  const matches = text.match(regex) || [];
  
  // 去重
  const uniqueMatches = Array.from(new Set(matches));
  
  for (const match of uniqueMatches) {
    try {
      // 获取变量信息
      const variable = await getVariableByIdentifier(match);
      
      if (variable) {
        // 构建变量标签HTML
        const tagHtml = `<span data-variable="" data-id="${variable.id}" data-field="${variable.field}" data-identifier="${match}" data-type="${variable.sourceType}" class="variable-tag variable-type-${variable.sourceType}" contenteditable="false">${variable.displayIdentifier}</span>`;
        
        // 替换所有出现的标识符
        result = result.replace(new RegExp(escapeRegExp(match), 'g'), tagHtml);
      }
    } catch (error) {
      console.error(`处理变量标识符 ${match} 时出错:`, error);
    }
  }
  
  return result;
}

/**
 * rawtext格式转换为解析格式
 */
export async function rawTextToResolvedText(
  text: string,
  getVariableByIdentifier: (identifier: string) => Promise<VariableData | null>
): Promise<string> {
  if (!text) return '';
  
  // 匹配系统标识符
  const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g;
  let result = text;
  
  // 获取所有匹配项
  const matches = text.match(regex) || [];
  
  // 去重
  const uniqueMatches = Array.from(new Set(matches));
  
  for (const match of uniqueMatches) {
    try {
      // 获取变量信息
      const variable = await getVariableByIdentifier(match);
      
      if (variable && variable.value) {
        // 替换为变量值
        result = result.replace(new RegExp(escapeRegExp(match), 'g'), variable.value);
      } else {
        // 变量不存在或无值
        result = result.replace(new RegExp(escapeRegExp(match), 'g'), `[未找到: ${match}]`);
      }
    } catch (error) {
      console.error(`解析变量 ${match} 时出错:`, error);
      // 错误处理，保留原标识符
      result = result.replace(new RegExp(escapeRegExp(match), 'g'), `[错误: ${match}]`);
    }
  }
  
  return result;
}

/**
 * HTML格式转换为JSON格式
 */
export function htmlToJson(html: string, editor: any): string {
  if (!editor) return JSON.stringify({}, null, 2);
  
  try {
    // 使用编辑器的getJSON方法
    return JSON.stringify(editor.getJSON(), null, 2);
  } catch (error) {
    console.error('转换HTML为JSON时出错:', error);
    return JSON.stringify({ error: '转换失败' }, null, 2);
  }
}

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

#### 2.3.2 关键技术点

1. **正则处理**：使用正则表达式匹配和替换文本
2. **DOM操作**：使用DOM API处理HTML内容
3. **异步处理**：支持异步获取变量信息
4. **错误处理**：提供友好的错误提示

## 3. 核心组件实现

### 3.1 VariableEditorX

VariableEditorX是编辑器的主要组件，负责协调各个子组件和功能。

#### 3.1.1 组件结构

```typescript
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { Variable, VariableSuggestion } from './extensions';
import EditorToolbar from './components/EditorToolbar';
import DebugPanel from './components/DebugPanel';
import { useVariableData } from './hooks/useVariableData';
import { useVariableParser } from './hooks/useVariableParser';
import { VariableData, VariableEditorXProps, VariableEditorXRef } from './types';
import VariableSelectorModal from './components/VariableSelectorModal';

import './styles.css';

const VariableEditorX = forwardRef<VariableEditorXRef, VariableEditorXProps>((props, ref) => {
  // 解构属性
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
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // 获取变量数据
  const { variables, getVariableByIdentifier } = useVariableData();
  
  // 获取变量解析器
  const { parseText, convertToHtml, convertToRawText } = useVariableParser();
  
  // 变量选择事件处理
  const handleSelectVariable = (variable: VariableData) => {
    if (editor) {
      editor.chain().focus().insertVariable({
        id: variable.id,
        field: variable.field,
        sourceName: variable.sourceName,
        sourceType: variable.sourceType
      }).run();
      
      if (onVariableInsert) {
        onVariableInsert(variable);
      }
    }
    
    setModalVisible(false);
  };
  
  // 显示变量选择器
  const handleShowVariableSelector = () => {
    setModalVisible(true);
  };
  
  // 显示解析预览
  const handleShowPreview = async () => {
    if (editor) {
      const html = editor.getHTML();
      const rawText = convertToRawText(html);
      const resolved = await parseText(rawText);
      setResolvedContent(resolved);
      setPreviewModalVisible(true);
    }
  };
  
  // 配置@触发变量选择
  const variableSuggestion = {
    char: '@',
    pattern: /@$/,
    command: ({ editor, range }: any) => {
      editor.chain().focus().deleteRange(range).run();
      setTimeout(() => {
        handleShowVariableSelector();
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
  
  // 暴露API
  useImperativeHandle(ref, () => ({
    // 插入变量
    insertVariable: (variable: VariableData) => {
      if (editor) {
        editor.chain().focus().insertVariable({
          id: variable.id,
          field: variable.field,
          sourceName: variable.sourceName,
          sourceType: variable.sourceType
        }).run();
      }
    },
    
    // 获取HTML内容
    getContent: () => editor?.getHTML() || '',
    
    // 获取系统标识符格式内容
    getRawText: () => convertToRawText(editor?.getHTML() || ''),
    
    // 获取解析后内容
    getResolvedContent: async () => parseText(convertToRawText(editor?.getHTML() || '')),
    
    // 聚焦编辑器
    focusEditor: () => editor?.commands.focus(),
    
    // 清空内容
    clearContent: () => editor?.commands.clearContent(),
    
    // 获取使用的变量
    getUsedVariables: () => {
      if (!editor) return [];
      
      // 获取编辑器JSON内容
      const editorContent = editor.getJSON();
      
      // 提取变量节点
      const variableAttrs = editorContent.content
        ?.flatMap(node => node.content || [])
        ?.filter(node => node.type === 'variable')
        ?.map(node => node.attrs) || [];
      
      // 将属性映射到变量数据
      return variableAttrs
        .map(attrs => {
          if (!attrs) return null;
          
          // 查找完整的变量数据
          const variable = variables.find(v => 
            v.id === attrs.id && v.field === attrs.field
          );
          
          return variable || null;
        })
        .filter(Boolean) as VariableData[];
    }
  }));
  
  // 渲染组件
  return (
    <div className={`variable-editor-x ${className}`} style={style}>
      {/* 编辑器容器 */}
      <div 
        className="editor-container"
        style={{ 
          border: `1px solid ${isFocused ? '#40a9ff' : '#d9d9d9'}`,
          borderRadius: '4px',
          transition: 'all 0.3s',
        }}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
        
        {/* 占位符 */}
        {!editor?.isFocused && !editor?.getText() && placeholder && (
          <div className="editor-placeholder">
            {placeholder}
          </div>
        )}
      </div>
      
      {/* 工具栏 */}
      {toolbar && (
        <EditorToolbar
          onInsertVariable={handleShowVariableSelector}
          onShowPreview={handleShowPreview}
        />
      )}
      
      {/* 调试面板 */}
      {debug && <DebugPanel editor={editor} />}
      
      {/* 变量选择器模态窗口 */}
      <VariableSelectorModal
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSelect={handleSelectVariable}
        variables={variables}
      />
      
      {/* 预览模态窗口 */}
      {previewModalVisible && (
        <div 
          className="preview-modal-overlay"
          onClick={() => setPreviewModalVisible(false)}
        >
          <div 
            className="preview-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="preview-modal-title">变量解析预览</div>
            <div className="preview-modal-content">
              {resolvedContent}
            </div>
            <div className="preview-modal-footer">
              <button onClick={() => setPreviewModalVisible(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default VariableEditorX;
```

#### 3.1.2 关键技术点

1. **Ref转发**：使用forwardRef和useImperativeHandle暴露API
2. **状态管理**：使用useState管理组件内部状态
3. **自定义Hook**：使用useVariableData和useVariableParser获取数据和功能
4. **编辑器配置**：配置TipTap编辑器及其扩展
5. **事件处理**：处理变量选择、内容更新等事件

### 3.2 EditorToolbar

工具栏组件，提供变量插入和解析预览功能。

#### 3.2.1 组件结构

```typescript
import React from 'react';
import { PlusCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

interface EditorToolbarProps {
  onInsertVariable: () => void;
  onShowPreview: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertVariable,
  onShowPreview
}) => {
  return (
    <div className="editor-toolbar">
      {/* 变量插入按钮 */}
      <Tooltip title="点击打开
