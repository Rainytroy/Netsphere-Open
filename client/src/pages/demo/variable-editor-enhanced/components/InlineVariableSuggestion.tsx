import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { VariableData } from '../types';
import VariableSuggestionList, { VariableSuggestionListRef } from './VariableSuggestionList';

interface InlineVariableSuggestionProps {
  items: VariableData[];
  command: (item: VariableData) => void;
  clientRect: () => DOMRect;
  editor: any;
}

/**
 * 内联变量选择器组件
 * 
 * 直接跟随光标显示，而不是使用弹窗
 */
const InlineVariableSuggestion = forwardRef<VariableSuggestionListRef, InlineVariableSuggestionProps>(
  ({ items, command, clientRect, editor }, ref) => {
    const [style, setStyle] = useState<React.CSSProperties>({
      position: 'absolute',
      top: '0px',
      left: '0px',
      zIndex: 50,
      maxHeight: '300px',
      overflow: 'auto',
      backgroundColor: 'white',
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1)',
      borderRadius: '6px',
      width: '300px'
    });

    // 转发ref到VariableSuggestionList
    const suggestionListRef = React.useRef<VariableSuggestionListRef>(null);
    useImperativeHandle(ref, () => ({
      onKeyDown: (props: { event: KeyboardEvent }) => {
        return suggestionListRef.current?.onKeyDown(props) || false;
      }
    }));

    // 更新位置函数
    const updatePosition = useCallback(() => {
      if (!clientRect) return;

      const rect = clientRect();
      const editorRect = editor.view.dom.getBoundingClientRect();
      
      // 计算相对于编辑器的位置
      const left = rect.left - editorRect.left;
      const top = rect.bottom - editorRect.top + 5; // 添加5px的偏移量

      // 更新样式
      setStyle(prev => ({
        ...prev,
        top: `${top}px`,
        left: `${left}px`
      }));
    }, [clientRect, editor]);

    // 监听滚动和大小变化
    useEffect(() => {
      updatePosition();

      // 添加滚动监听
      const handleScroll = () => updatePosition();
      editor.view.dom.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);

      return () => {
        editor.view.dom.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }, [updatePosition, editor]);

    return (
      <div className="inline-variable-suggestion" style={style}>
        <VariableSuggestionList
          ref={suggestionListRef}
          items={items}
          command={command}
        />
      </div>
    );
  }
);

export default InlineVariableSuggestion;
