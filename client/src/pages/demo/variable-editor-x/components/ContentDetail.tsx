import React from 'react';
import { Button, Space, Typography } from 'antd';
import { SavedContentItem } from './SavedContentList';
import { rawTextToHtml } from '../utils/formatters';
import { VariableData } from '../types';

const { Text } = Typography;

interface ContentDetailProps {
  content: SavedContentItem | null;
  viewMode: 'preview' | 'raw' | 'html';
  onViewModeChange: (mode: 'preview' | 'raw' | 'html') => void;
  onLoadContent: (item: SavedContentItem) => void;
  variables: VariableData[];
}

/**
 * 内容详情组件
 * 显示选中内容的详细信息，支持不同查看模式
 */
const ContentDetail: React.FC<ContentDetailProps> = ({
  content,
  viewMode,
  onViewModeChange,
  onLoadContent,
  variables
}) => {
  if (!content) {
    return null;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            type={viewMode === 'preview' ? 'primary' : 'default'} 
            size="small"
            onClick={() => onViewModeChange('preview')}
          >
            预览
          </Button>
          <Button 
            type={viewMode === 'raw' ? 'primary' : 'default'} 
            size="small"
            onClick={() => onViewModeChange('raw')}
          >
            原始内容
          </Button>
          <Button 
            type={viewMode === 'html' ? 'primary' : 'default'} 
            size="small"
            onClick={() => onViewModeChange('html')}
          >
            HTML
          </Button>
        </Space>
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <Text strong>{content.name}</Text>
        <div style={{ fontSize: 12, color: '#999' }}>
          {new Date(content.timestamp).toLocaleString()}
        </div>
      </div>
      
      <div style={{ 
        border: '1px solid #eee', 
        padding: 8, 
        borderRadius: 4,
        background: '#f9f9f9',
        fontFamily: viewMode === 'preview' ? 'inherit' : 'monospace',
        fontSize: viewMode === 'preview' ? 'inherit' : '12px',
        whiteSpace: viewMode === 'preview' ? 'inherit' : 'pre-wrap',
        maxHeight: 300,
        overflow: 'auto'
      }}>
        {viewMode === 'preview' && (
          <div dangerouslySetInnerHTML={{ 
            __html: content.contentType === 'rawText' 
              ? rawTextToHtml(content.content, variables)
              : content.htmlPreview || '' 
          }} />
        )}
        {viewMode === 'raw' && content.content}
        {viewMode === 'html' && content.htmlContent}
      </div>
      
      <div style={{ marginTop: 16 }}>
        <Button 
          type="primary" 
          size="small" 
          onClick={() => onLoadContent(content)}
        >
          加载此内容
        </Button>
      </div>
    </div>
  );
};

export default ContentDetail;
