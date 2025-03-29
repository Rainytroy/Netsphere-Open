import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

// VariableSuggestion扩展 - 提供@符号触发的变量提示功能
export const VariableSuggestion = Extension.create({
  name: 'variableSuggestion',

  addOptions() {
    return {
      suggestion: {
        char: '@', // 触发字符
        // 使用简单正则表达式匹配任意位置的@
        pattern: /@(\w*)$/,
        allowSpaces: true, // 允许空格
        startOfLine: false, // 允许在任何位置触发@
        allowedPrefixes: null, // 使用正则表达式替代前缀列表
        command: ({ editor, range, props }: any) => {
          // 删除输入的@和后面的文本
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'variable', // 插入变量节点
              attrs: props, // 传递变量属性
            })
            .run();
        },
      },
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

export default VariableSuggestion;
