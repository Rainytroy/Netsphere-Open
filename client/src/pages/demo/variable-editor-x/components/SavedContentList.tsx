import React from 'react';
import { List, Button, Tooltip, Badge, Tag, Input } from 'antd';
import { EyeOutlined, DeleteOutlined, SaveOutlined, LoadingOutlined, QuestionCircleOutlined } from '@ant-design/icons';

// 保存的内容项类型
export interface SavedContentItem {
  id: string;
  name: string;
  content: string;
  htmlContent?: string;
  rawContent?: string;
  htmlPreview?: string;
  timestamp: number;
  contentType: 'rawText' | 'html';
  variableCount?: number;
}

interface SavedContentListProps {
  savedContents: SavedContentItem[];
  saveName: string;
  saving: boolean;
  onSaveNameChange: (name: string) => void;
  onSaveContent: () => void;
  onViewContent: (item: SavedContentItem) => void;
  onLoadContent: (item: SavedContentItem) => void;
  onDeleteContent: (id: string) => void;
  onShowFormatInfo: () => void;
  editorHasContent: boolean;
}

/**
 * 保存内容列表组件
 * 显示已保存的内容列表，提供查看、加载和删除操作
 */
const SavedContentList: React.FC<SavedContentListProps> = ({
  savedContents,
  saveName,
  saving,
  onSaveNameChange,
  onSaveContent,
  onViewContent,
  onLoadContent,
  onDeleteContent,
  onShowFormatInfo,
  editorHasContent
}) => {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Input 
          placeholder="输入保存名称" 
          value={saveName}
          onChange={e => onSaveNameChange(e.target.value)}
          style={{ marginBottom: 8 }}
        />
      </div>
      
      {savedContents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#888' }}>
          暂无保存内容
        </div>
      ) : (
        <List
          dataSource={savedContents}
          renderItem={item => (
            <List.Item
              key={item.id}
              actions={[
                <Tooltip title="查看内容">
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => onViewContent(item)}
                  />
                </Tooltip>,
                <Tooltip title="加载内容">
                  <Button 
                    type="primary"
                    size="small" 
                    onClick={() => onLoadContent(item)}
                  >
                    加载
                  </Button>
                </Tooltip>,
                <Tooltip title="删除">
                  <Button 
                    type="text" 
                    size="small" 
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onDeleteContent(item.id)}
                  />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                title={
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {item.name}
                    {item.variableCount && item.variableCount > 0 && (
                      <Badge 
                        count={item.variableCount} 
                        style={{ 
                          backgroundColor: '#52c41a',
                          marginLeft: 8,
                          fontSize: '12px'
                        }} 
                        title={`包含${item.variableCount}个变量`}
                      />
                    )}
                  </div>
                }
                description={
                  <div>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: '#666', 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      fontFamily: 'monospace',
                      border: '1px solid #eee',
                      padding: '2px 4px',
                      background: '#f9f9f9'
                    }}>
                      {/* 显示友好的变量标识符格式或原始内容 */}
                      {item.contentType === 'rawText' 
                        ? item.content.replace(/@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)/g, '@变量')
                        : item.content.substring(0, 40) + (item.content.length > 40 ? '...' : '')}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default SavedContentList;
