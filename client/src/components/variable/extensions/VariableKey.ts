import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * VariableKey扩展
 * 处理@键按下时触发变量选择模态窗口
 */
export const VariableKey = Extension.create({
  name: 'variableKey',

  addOptions() {
    return {
      onAtKey: () => {}, // 在@键按下时调用的回调函数
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('variableKey'),
        props: {
          handleKeyDown: (view, event) => {
            // 监听@符号按键
            if (event.key === '@') {
              console.log('[VariableKey] @ 键按下');
              // 调用回调函数
              this.options.onAtKey();
              // 不阻止默认行为，允许@字符输入到编辑器
              return false;
            }
            
            return false;
          },
        },
      }),
    ];
  },
});

export default VariableKey;
