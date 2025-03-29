import { Node, mergeAttributes } from '@tiptap/core';

export interface VariableOptions {
  HTMLAttributes: Record<string, any>,
}

/**
 * 变量节点扩展 - 用于在编辑器中显示特殊的变量标签
 * 
 * 这是一个自定义节点类型，专门用于表示和渲染变量标识符
 * 支持存储变量的identifier, sourceName, type等属性
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
      identifier: {
        default: null,
      },
      sourceName: {
        default: null,
      },
      type: {
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
    // 为变量节点添加特殊样式类和数据属性
    const identifier = HTMLAttributes.identifier || '变量';
    
    // 使用纯文本方式渲染变量标签，避免特殊字符问题
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-variable': '',
      'data-identifier': identifier,
      'data-type': HTMLAttributes.type || 'unknown',
      'class': 'variable-tag',
      'contenteditable': 'false', // 确保变量内容不可编辑
    }), identifier]
  },
  
  // 添加命令，支持通过命令API插入变量
  addCommands() {
    return {
      // 使用as any来避免类型错误，保持原有功能不变
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
})

export default Variable;
