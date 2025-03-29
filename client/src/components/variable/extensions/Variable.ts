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
    const type = HTMLAttributes.type || 'unknown';
    
    // 清理标识符，确保不会包含重复部分
    // 例如，如果标识符是 "@云透.description#3ac599@云透.description#3ac599"，
    // 这将只保留第一个 "@云透.description#3ac599"
    let cleanedIdentifier = identifier;
    
    // 检查并处理重复的标识符
    if (identifier.indexOf('@') !== identifier.lastIndexOf('@')) {
      // 更新正则表达式以匹配6位十六进制ID格式
      const match = identifier.match(/@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+(?:#[a-f0-9]{6})?/);
      if (match) {
        cleanedIdentifier = match[0];
        console.log('[Variable] 清理重复标识符:', identifier, '->', cleanedIdentifier);
      }
    }
    
    // 移除任何HTML标签
    const withoutHtml = cleanedIdentifier.replace(/<[^>]+>/g, '');
    if (withoutHtml !== cleanedIdentifier) {
      console.log('[Variable] 移除HTML标签:', cleanedIdentifier, '->', withoutHtml);
      cleanedIdentifier = withoutHtml;
    }
    
    // 确保标识符符合规范格式 (即使单个标识符也进行检查)
    if (!/@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+(?:#[a-f0-9]{6})?$/.test(cleanedIdentifier)) {
      // 如果不符合规范，尝试提取出有效部分
      const validMatch = cleanedIdentifier.match(/@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+(?:#[a-f0-9]{6})?/);
      if (validMatch) {
        cleanedIdentifier = validMatch[0];
        console.log('[Variable] 规范化标识符格式:', identifier, '->', cleanedIdentifier);
      }
    }
    
    // 调试信息 - 记录变量类型信息
    console.log('[Variable] 变量标签渲染:', cleanedIdentifier, '类型:', type);
    
    // 使用纯文本方式渲染变量标签，避免特殊字符问题
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-variable': '',
      'data-identifier': cleanedIdentifier,
      'data-type': type,     // 确保data-type和type保持一致
      'type': type,          // 保留type属性以兼容旧代码
      'class': 'variable-tag',
      'contenteditable': 'false', // 确保变量内容不可编辑
    }), cleanedIdentifier]
  },
  
  // 添加命令，支持通过命令API插入变量
  addCommands() {
    return {
      // 我们使用as any来避免类型错误，保持原有功能不变
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
