import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

/**
 * VariableKey扩展
 * 处理@键按下时触发变量选择模态窗口
 * 参考VariableEditor2的实现方式，采用简单直接的键盘事件处理
 * v1.0.0 - 简单版本，仅监听@键，不存储位置
 */
export const VariableKey = Extension.create({
  name: 'variableKey',

  addOptions() {
    return {
      // 在@键按下时调用的回调函数
      onAtKey: () => {
        console.log('[VariableKey] 未提供onAtKey回调');
      },
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
              console.log('[VariableKey] @ 键按下，触发变量选择器');
              
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
