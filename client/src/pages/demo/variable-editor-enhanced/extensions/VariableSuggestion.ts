import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

/**
 * 变量提示扩展 - 提供@符号触发的变量选择功能
 * 
 * 用于在编辑器中输入@时触发变量选择器模态窗口，支持UUID格式变量的插入
 */
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
        
        // 定制化回调函数 - 将在配置时被覆盖
        command: ({ editor, range }: any) => {
          // 删除输入的@
          editor.chain().focus().deleteRange(range).run();
        },
        
        // 空的默认渲染器
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

export default VariableSuggestion;
