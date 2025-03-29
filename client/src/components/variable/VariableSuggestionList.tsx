import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { List, Tag } from 'antd';
import './VariableSuggestionList.css';
import VariableTag from '../workTask/VariableTag';
import { VariableType } from '../../services/variableService';

// 变量数据接口
export interface VariableItem {
  id: string;
  identifier: string;
  sourceName: string;
  type: string;
  value?: string;
}

// 组件属性接口
export interface VariableSuggestionListProps {
  items: VariableItem[];
  command: (item: VariableItem) => void;
}

// 组件引用接口
export interface VariableSuggestionListRef {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean;
}

// 类型颜色映射
const getTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    npc: '#1890FF',
    task: '#52C41A',
    custom: '#FA8C16',
    file: '#13C2C2',
    workflow: '#722ED1',
    ai: '#722ED1',
  };
  return colorMap[type] || '#D9D9D9';
};

// 类型标签映射
const formatTypeLabel = (type: string): string => {
  const labelMap: Record<string, string> = {
    npc: 'NPC',
    task: '任务',
    custom: '自定义',
    file: '文件',
    workflow: '工作流',
    ai: 'AI服务',
  };
  return labelMap[type] || type;
};

// 变量建议列表组件
const VariableSuggestionList = forwardRef<VariableSuggestionListRef, VariableSuggestionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLElement | null)[]>([]);

    console.log('[VariableSuggestionList] 渲染建议列表, 项目数:', items.length);
    
    // 调试信息:显示所有可用变量
    useEffect(() => {
      if (items.length > 0) {
        console.log('[VariableSuggestionList] 可用变量列表:', 
          items.map(i => `${i.identifier} (${i.sourceName})`));
      }
    }, [items]);

    // 重置item引用数组长度
    useEffect(() => {
      itemRefs.current = itemRefs.current.slice(0, items.length);
    }, [items.length]);

    // 当items变更时，重置选择索引
    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    // 确保选中项在可视区域内
    useEffect(() => {
      if (selectedIndex >= 0 && itemRefs.current[selectedIndex] && listRef.current) {
        const selectedItem = itemRefs.current[selectedIndex];
        const container = listRef.current;
        
        if (selectedItem) {
          // 获取元素位置信息
          const itemRect = selectedItem.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // 检查元素是否在容器可见区域外
          if (itemRect.bottom > containerRect.bottom) {
            // 如果元素底部超出可见区域，滚动显示
            container.scrollTop += (itemRect.bottom - containerRect.bottom) + 8;
          } else if (itemRect.top < containerRect.top) {
            // 如果元素顶部在可见区域上方，滚动显示
            container.scrollTop -= (containerRect.top - itemRect.top) + 8;
          }
        }
      }
    }, [selectedIndex, items]);

    // 暴露键盘事件处理方法
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          if (items[selectedIndex]) {
            command(items[selectedIndex]);
            return true;
          }
        }

        return false;
      },
    }));

    return (
      <div className="variable-suggestion-list" ref={listRef}>
        <List
          size="small"
          dataSource={items}
          renderItem={(item, index) => (
            <List.Item
              key={item.id}
              className={`variable-item ${index === selectedIndex ? 'is-selected' : ''}`}
              onClick={() => command(item)}
              ref={(el) => itemRefs.current[index] = el as HTMLElement}
            >
              <div className="variable-item-content">
                <div className="variable-identifier">
                  {/* 使用VariableTag组件来渲染变量 */}
                  <VariableTag
                    identifier={item.identifier}
                    displayIdentifier={`@${item.sourceName}.${item.identifier.split('#')[0]}${item.id ? '#' + item.id.substring(0, 4) : ''}`}
                    type={item.type as VariableType}
                    value={item.value}
                    readOnly={true}
                  />
                </div>
                <div className="variable-item-details">
                  <span className="variable-source">{item.value || ''}</span>
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>
    );
  }
);

export default VariableSuggestionList;
