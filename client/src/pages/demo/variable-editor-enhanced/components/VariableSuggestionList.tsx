import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { List, Empty, Input, Tag } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './VariableSuggestionList.css';
import { TYPE_LABELS, TYPE_COLORS, VariableData } from '../types';
import { VariableType } from '../../../../services/variableService';
import VariableTag from '../../../../components/workTask/VariableTag';

// 组件属性接口
export interface VariableSuggestionListProps {
  items: VariableData[];
  command: (item: VariableData) => void;
}

// 组件引用接口
export interface VariableSuggestionListRef {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean;
}

// 变量分组函数
const groupVariablesByType = (items: VariableData[]) => {
  const groupedItems: Record<string, VariableData[]> = {};
  
  items.forEach(item => {
    const type = item.sourceType;
    if (!groupedItems[type]) {
      groupedItems[type] = [];
    }
    groupedItems[type].push(item);
  });
  
  return Object.entries(groupedItems).map(([type, items]) => ({
    type,
    items
  }));
};

// 变量选择列表组件
const VariableSuggestionList = forwardRef<VariableSuggestionListRef, VariableSuggestionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLElement | null)[]>([]);
    
    // 直接使用所有项目，无过滤
    const filteredItems = items;
    
    // 将过滤后的变量分组
    const groupedItems = groupVariablesByType(filteredItems);
    
    // 创建一个扁平的项目数组，用于键盘导航
    const flatItems = groupedItems.flatMap(group => group.items);
    
    // 重置item引用数组长度
    useEffect(() => {
      itemRefs.current = itemRefs.current.slice(0, flatItems.length);
    }, [flatItems.length]);

    // 当items变更时，重置选择索引
    useEffect(() => {
      setSelectedIndex(0);
      console.log('[VariableSuggestionList] 变量列表已更新，数量:', items.length);
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
    }, [selectedIndex, flatItems]);

    // 暴露键盘事件处理方法
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + flatItems.length - 1) % flatItems.length);
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % flatItems.length);
          return true;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          if (flatItems[selectedIndex]) {
            command(flatItems[selectedIndex]);
            return true;
          }
        }

        // 处理其他按键
        if (/^[a-zA-Z0-9]$/.test(event.key)) {
          return false; // 让事件继续传播
        }

        return false;
      },
    }));

    return (
      <div className="variable-suggestion-list-container" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: '4px', overflow: 'hidden' }}>
        <div className="variable-suggestion-list" ref={listRef}>
          {flatItems.length === 0 ? (
            <div className="empty-result">
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description="没有找到匹配的变量" 
                style={{ margin: '12px 0' }}
              />
            </div>
          ) : (
            groupedItems.map((group, groupIndex) => (
              <React.Fragment key={group.type}>
                <div className="variable-group-title">
                  {TYPE_LABELS[group.type as keyof typeof TYPE_LABELS] || group.type}
                </div>
                <List
                  size="small"
                  dataSource={group.items}
                  renderItem={(item, itemIndex) => {
                    // 计算在全局列表中的索引
                    const globalIndex = groupedItems
                      .slice(0, groupIndex)
                      .reduce((acc, g) => acc + g.items.length, 0) + itemIndex;
                    
                    return (
                      <List.Item
                        key={`${item.id}-${item.field}`}
                        className={`variable-item ${globalIndex === selectedIndex ? 'is-selected' : ''}`}
                        onClick={() => command(item)}
                        ref={(el) => itemRefs.current[globalIndex] = el as HTMLElement}
                      >
                        <div className="variable-item-content">
                          <div className="variable-identifier">
                            {/* 使用VariableTag组件来渲染变量 */}
                            <VariableTag
                              identifier={item.identifier}
                              displayIdentifier={`@${item.sourceName}.${item.field}#${item.id.substring(0, 4)}`}
                              type={item.sourceType as VariableType}
                              value={item.value}
                              readOnly={true}
                            />
                          </div>
                          <div className="variable-item-details">
                            <span className="variable-source">{item.value || ''}</span>
                          </div>
                        </div>
                      </List.Item>
                    );
                  }}
                />
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    );
  }
);

export default VariableSuggestionList;
