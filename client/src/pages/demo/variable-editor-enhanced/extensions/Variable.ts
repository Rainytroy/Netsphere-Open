import { Node, mergeAttributes } from '@tiptap/core';
import { resolveDisplayIdentifier } from '../../../../utils/VariableDisplayResolver';
import { TYPE_COLORS } from '../types';

export interface VariableOptions {
  HTMLAttributes: Record<string, any>,
}

/**
 * 变量节点扩展 - 用于在编辑器中显示特殊的变量标签
 * 
 * 这是一个自定义节点类型，专门用于表示和渲染UUID格式的变量标识符
 * 支持存储变量的id, field, sourceName, sourceType等属性
 */
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
    console.log('[Variable] 渲染变量节点，属性:', HTMLAttributes);
    
    // 处理ID - 去除可能的前缀 (如 "npc_")
    let rawId = HTMLAttributes.id || '';
    const purifiedId = rawId.includes('_') 
      ? rawId.substring(rawId.lastIndexOf('_') + 1) 
      : rawId;
    
    // 处理字段名 - 从可能的完整路径中提取简单字段名
    const rawField = HTMLAttributes.field || 'value';
    let simpleField = rawField;
    
    // 处理特殊格式的字段名
    if (rawField.startsWith('@gv_')) {
      const parts = rawField.split('_');
      if (parts.length > 2) {
        simpleField = parts[parts.length - 1];
      }
    } else if (rawField.includes('_')) {
      simpleField = rawField.substring(rawField.lastIndexOf('_') + 1);
    }
    
    // 构建UUID标识符 (用于内部存储)
    const systemIdentifier = `@gv_${purifiedId}_${simpleField}`;
    
    // 获取类型和源名称
    const sourceType = HTMLAttributes.sourceType || 'unknown';
    const sourceName = HTMLAttributes.sourceName || '变量';
    
    // 短ID用于显示
    const shortId = purifiedId.substring(0, 4);
    
    // 使用显式传递的文本内容（如果有）或构建默认显示标识符
    let displayText = HTMLAttributes.text || `@${sourceName}.${simpleField}#${shortId}`;
    
    // 打印调试信息
    console.log('[Variable] 渲染变量:', {
      id: rawId,
      field: simpleField,
      systemIdentifier,
      sourceName,
      sourceType,
      displayText
    });
    
    // 渲染变量标签结构 - 使用统一的CSS类而不是内联样式
    return ['span', mergeAttributes(this.options.HTMLAttributes, {
      'data-variable': '',
      'data-id': purifiedId, // 只存储纯ID部分
      'data-field': simpleField, // 只存储简单字段名
      'data-identifier': systemIdentifier,
      'data-type': sourceType,
      // 使用已定义的CSS类
      'class': `variable-tag variable-type-${sourceType}`,
      'contenteditable': 'false'
    }), displayText]
  },
  
  // 添加命令，支持通过命令API插入变量
  addCommands() {
    return {
      insertVariable: (attributes: Record<string, any>) => ({ chain }: { chain: any }) => {
        return chain()
          .insertContent({
            type: this.name,
            attrs: attributes
          })
          .run()
      },
    } as any;
  },
});

export default Variable;
