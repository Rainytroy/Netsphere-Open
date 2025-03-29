import React from 'react';
import { Button, Typography, Tooltip, Modal } from 'antd';
import { PlusCircleOutlined, EyeOutlined, ScanOutlined, SyncOutlined } from '@ant-design/icons';
import { PreviewData } from './VariableEditorUtils';

const { Text } = Typography;

// 工具栏组件
export const EditorToolbar = ({ 
  onOpenVariableSelector, 
  onShowPreview,
  onRecognizeVariables,
  onUpdateIdentifiers
}: {
  onOpenVariableSelector: () => void;
  onShowPreview: () => void;
  onRecognizeVariables?: () => void;
  onUpdateIdentifiers?: () => void;
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* 变量插入按钮 */}
      <Tooltip title="点击打开变量选择器">
        <div 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            marginTop: '4px',
            padding: '3px 8px 3px 4px',
            borderRadius: '4px',
            border: '1px solid #f0f0f0',
            backgroundColor: '#fafafa',
            cursor: 'pointer',
            width: 'fit-content',
          }}
          onClick={onOpenVariableSelector}
        >
          <PlusCircleOutlined style={{ marginRight: '4px', fontSize: '14px' }} />
          <Text type="secondary" style={{ 
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            输入@或点击插入变量
          </Text>
        </div>
      </Tooltip>
      
      {/* 显示解析值按钮 */}
      <Tooltip title="显示解析后的变量值">
        <div 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            marginTop: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid #f0f0f0',
            backgroundColor: '#fafafa',
            cursor: 'pointer',
            width: 'fit-content',
          }}
          onClick={onShowPreview}
        >
          <EyeOutlined style={{ marginRight: '4px', fontSize: '14px' }} />
          <Text type="secondary" style={{ 
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}>
            显示解析值
          </Text>
        </div>
      </Tooltip>
      
      {/* 识别变量按钮 */}
      {onRecognizeVariables && (
        <Tooltip title="识别文本中的变量并格式化">
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              marginTop: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #f0f0f0',
              backgroundColor: '#fafafa',
              cursor: 'pointer',
              width: 'fit-content',
            }}
            onClick={onRecognizeVariables}
          >
            <ScanOutlined style={{ marginRight: '4px', fontSize: '14px' }} />
            <Text type="secondary" style={{ 
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}>
              识别变量
            </Text>
          </div>
        </Tooltip>
      )}
      
      {/* 更新标识符按钮 */}
      {onUpdateIdentifiers && (
        <Tooltip title="更新变量标识符，保持与最新命名一致">
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              marginTop: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #f0f0f0',
              backgroundColor: '#fafafa',
              cursor: 'pointer',
              width: 'fit-content',
            }}
            onClick={onUpdateIdentifiers}
          >
            <SyncOutlined style={{ marginRight: '4px', fontSize: '14px' }} />
            <Text type="secondary" style={{ 
              fontSize: '12px',
              whiteSpace: 'nowrap'
            }}>
              更新标识符
            </Text>
          </div>
        </Tooltip>
      )}
    </div>
  );
};

// 预览模态窗组件
export const PreviewModal = ({
  visible,
  onClose,
  loading,
  previewData
}: {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  previewData: PreviewData;
}) => {
  return (
    <Modal
      title="变量解析预览"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={500}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>加载中...</div>
      ) : (
        <div style={{ 
          padding: '16px',
          backgroundColor: '#fafafa', 
          borderRadius: '4px',
        }}>
          {/* 解析预览结果对比 */}
          <div style={{ marginBottom: '8px' }}>
            <Typography.Title level={5}>变量解析</Typography.Title>
            
            {/* 原始文本（变量标识符） */}
            <div>
              <Typography.Text strong style={{ fontSize: '14px' }}>原始输入:</Typography.Text>
              <div style={{ 
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                maxHeight: '120px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.5',
                fontFamily: 'monospace',
                border: '1px solid #e8e8e8',
                marginTop: '8px',
                marginBottom: '16px'
              }}>
                {previewData.rawText}
              </div>
            </div>
            
            {/* 解析后文本 */}
            <div>
              <Typography.Text strong style={{ fontSize: '14px' }}>解析后输入:</Typography.Text>
              <div style={{ 
                padding: '12px',
                backgroundColor: '#f0f7ff',
                borderRadius: '4px',
                maxHeight: '120px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.5',
                fontFamily: 'monospace',
                border: '1px solid #d6e8ff',
                marginTop: '8px'
              }}>
                {previewData.resolvedText}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

// 编辑器容器组件
export const EditorContainer = ({
  className,
  minHeight,
  isFocused,
  onClick,
  children,
  showUpdateOverlay = false  // 新增遮罩层控制参数
}: {
  className?: string;
  minHeight?: string;
  isFocused: boolean;
  onClick: () => void;
  children: React.ReactNode;
  showUpdateOverlay?: boolean;  // 新增参数，控制遮罩层显示
}) => {
  return (
    <div 
      className={`variable-editor-container ${className || ''}`}
      style={{ 
        position: 'relative',
        border: `1px solid ${isFocused ? '#40a9ff' : '#d9d9d9'}`,
        borderRadius: '4px',
        padding: '0px 11px', // 减少上下内边距
        transition: 'all 0.3s',
        minHeight: minHeight || '150px',
        boxShadow: isFocused ? '0 0 0 2px rgba(24, 144, 255, 0.2)' : 'none',
        cursor: 'text', // 设置鼠标指针为文本输入样式
      }}
      onClick={onClick}
    >
      {/* 添加变量标识符更新遮罩层 */}
      <div className={`editor-update-overlay ${showUpdateOverlay ? 'visible' : ''}`}>
        <div className="editor-update-spinner"></div>
      </div>
      
      {children}
    </div>
  );
};
