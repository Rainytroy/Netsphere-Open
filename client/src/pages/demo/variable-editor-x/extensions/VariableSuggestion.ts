import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

/**
 * 变量提示扩展
 * 提供@符号触发的变量选择功能
 * v1.1.1 - 修复版本，修复@符号触发回调函数问题
 */
export const VariableSuggestion = Extension.create({
  name: 'variableSuggestion',

  addOptions() {
    return {
      // 自定义回调处理函数，将由EditorCore传入
      onVariableTrigger: null,
      
      // Suggestion插件配置
      suggestion: {
        char: '@', // 触发字符
        // 使用简单的正则表达式匹配@
        pattern: /@/,
        allowSpaces: false,
        startOfLine: false, // 允许在任何位置触发@
        allowedPrefixes: null, // 允许任何前缀
        
        // 需要为Suggestion提供items，即使我们不使用内联建议
        items: () => [], // 返回空数组，因为我们使用自定义模态窗口
        
        // 命令回调函数 - 这个函数会在输入@触发时被调用
        command: function({ editor, range }: any) {
          console.log('[VariableSuggestion] 命令被触发 - 范围:', range);
          
          try {
            // 删除输入的@符号
            editor.chain().focus().deleteRange(range).run();
            console.log('[VariableSuggestion] @符号已删除');
            
            // 关键修复：使用闭包引用选项
            // 使用具名函数而不是箭头函数确保this绑定到正确的扩展实例
            // @ts-ignore - TipTap类型定义不完整
            const extension = this;
            // @ts-ignore - 运行时能够访问但TypeScript无法识别
            const onVariableTrigger = extension.options?.onVariableTrigger;
            
            if (typeof onVariableTrigger === 'function') {
              console.log('[VariableSuggestion] 调用变量触发回调');
              onVariableTrigger();
            } else {
              console.warn('[VariableSuggestion] 未提供变量触发回调');
            }
          } catch (error) {
            console.error('[VariableSuggestion] 命令执行错误:', error);
          }
        },
        
        // 渲染函数需要提供
        render: () => {
          // 我们不使用内联建议UI，但需要提供这些回调
          return {
            onStart: () => {
              console.log('[VariableSuggestion] 开始触发');
            },
            onUpdate: () => {
              console.log('[VariableSuggestion] 更新触发');
            },
            onKeyDown: (props: { event: KeyboardEvent }) => {
              console.log('[VariableSuggestion] 按键事件', props.event.key);
              
              // 如果是回车键，立即触发命令
              if (props.event.key === 'Enter') {
                console.log('[VariableSuggestion] 检测到回车键');
                return true; // 告诉TipTap我们已处理此事件
              }
              
              return false; // 让TipTap处理其他键盘事件
            },
            onExit: () => {
              console.log('[VariableSuggestion] 退出触发');
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    // 直接传递配置，包括回调函数
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default VariableSuggestion;
