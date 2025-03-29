import React from 'react';
import { Button, Card, List, Tag, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// 变量类型颜色映射
const typeColors: Record<string, string> = {
  npc: '#1890FF',
  task: '#52C41A',
  custom: '#FA8C16',
  file: '#13C2C2',
  workflow: '#722ED1',
  ai: '#722ED1',
};

// 调试面板属性
interface VariableDebugPanelProps {
  variables: any[];
  onCopyIdentifier?: (identifier: string) => void;
  visible?: boolean;
}

/**
 * 变量调试面板
 * 显示当前可用的变量列表，用于开发调试
 */
const VariableDebugPanel: React.FC<VariableDebugPanelProps> = ({
  variables = [],
  onCopyIdentifier,
  visible = true
}) => {
  if (!visible) return null;
  
  return (
    <Card 
      title="变量调试面板" 
      size="small" 
      style={{ marginTop: 16 }}
      extra={<Text type="secondary">总数: {variables.length}</Text>}
    >
      {variables.length === 0 ? (
        <Text type="warning">未加载任何变量</Text>
      ) : (
        <List
          size="small"
          dataSource={variables}
          renderItem={(item) => (
            <List.Item
              key={item.id}
              actions={[
                <Button 
                  type="text" 
                  size="small" 
                  icon={<CopyOutlined />}
                  onClick={() => onCopyIdentifier?.(item.identifier)}
                />
              ]}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Text code>{item.identifier}</Text>
                    <Tag 
                      color={typeColors[item.type] || '#d9d9d9'} 
                      style={{ marginLeft: 8 }}
                    >
                      {item.type}
                    </Tag>
                  </div>
                }
                description={
                  <Text type="secondary" ellipsis>
                    来源: {item.sourceName || '系统变量'}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
};

export default VariableDebugPanel;
