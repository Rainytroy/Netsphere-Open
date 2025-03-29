import React, { useState } from 'react';
import { Card, Tabs, List, Badge, Typography } from 'antd';
import { DragOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';

const { Text } = Typography;

// 卡片类型定义
export enum CardType {
  PROCESS = 'process',
  TASK = 'task'
}

// 卡片数据接口
export interface CardData {
  id: string;
  type: CardType;
  title: string;
  description: string;
  icon?: React.ReactNode;
  usageCount: number;
  metadata?: Record<string, any>;
}

// 默认流程卡列表
const defaultProcessCards: CardData[] = [
  {
    id: 'start',
    type: CardType.PROCESS,
    title: '起点卡',
    description: '工作流的起点，提供用户输入',
    usageCount: 0,
    metadata: {
      required: true,
      maxCount: 1
    }
  },
  {
    id: 'assign',
    type: CardType.PROCESS,
    title: '赋值卡',
    description: '将一个全局变量的值赋给另一个变量',
    usageCount: 0
  },
  {
    id: 'loop',
    type: CardType.PROCESS,
    title: '循环卡',
    description: '根据条件判断工作流方向',
    usageCount: 0
  },
  {
    id: 'display',
    type: CardType.PROCESS,
    title: '展示卡',
    description: '展示指定变量的内容',
    usageCount: 0
  }
];

interface CardSelectorProps {
  processCards?: CardData[];
  taskCards?: CardData[];
  onCardSelect: (card: CardData) => void;
}

/**
 * 卡片选择器组件
 * 显示流程卡和工作任务卡，支持拖拽到画布
 */
const CardSelector: React.FC<CardSelectorProps> = ({
  processCards = defaultProcessCards,
  taskCards = [],
  onCardSelect
}) => {
  const [activeTab, setActiveTab] = useState<string>('process');

  // 处理卡片选择
  const handleCardSelect = (card: CardData) => {
    onCardSelect(card);
  };

  // 标签页配置
  const tabItems: TabsProps['items'] = [
    {
      key: 'process',
      label: '流程卡',
      children: (
        <List
          dataSource={processCards}
          split={false}
          renderItem={(card) => (
            <List.Item
              key={card.id}
              style={{ cursor: 'move' }}
              onClick={() => handleCardSelect(card)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify(card));
                e.dataTransfer.effectAllowed = 'move';
              }}
            >
              <Card 
                hoverable 
                style={{ width: '100%' }}
                bodyStyle={{ padding: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <DragOutlined style={{ marginRight: 8 }} />
                      <Text strong>{card.title}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{card.description}</Text>
                  </div>
                  {card.usageCount > 0 && (
                    <Badge count={card.usageCount} color="#001529" />
                  )}
                </div>
              </Card>
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'task',
      label: '工作任务卡',
      children: (
        <List
          dataSource={taskCards}
          split={false}
          renderItem={(card) => (
            <List.Item
              key={card.id}
              style={{ cursor: 'move' }}
              onClick={() => handleCardSelect(card)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify(card));
                e.dataTransfer.effectAllowed = 'move';
              }}
            >
              <Card 
                hoverable 
                style={{ width: '100%' }}
                bodyStyle={{ padding: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <DragOutlined style={{ marginRight: 8 }} />
                      <Text strong>{card.title}</Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{card.description}</Text>
                  </div>
                  {card.usageCount > 0 && (
                    <Badge count={card.usageCount} color="#001529" />
                  )}
                </div>
              </Card>
            </List.Item>
          )}
          locale={{ emptyText: '暂无可用的工作任务卡' }}
        />
      ),
    },
  ];

  return (
    <div className="card-selector">
      <Tabs 
        activeKey={activeTab}
        items={tabItems}
        onChange={setActiveTab}
      />
    </div>
  );
};

export default CardSelector;
