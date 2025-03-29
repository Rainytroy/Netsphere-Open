import React from 'react';
import { Card, Spin, Button, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { EditorPanelExtendedProps } from './types';
import VariableEditorXAdapter from './VariableEditorXAdapter';

/**
 * 编辑器面板组件 - 使用增强版X编辑器
 */
const EditorPanelRefactored: React.FC<EditorPanelExtendedProps> = ({
  loading,
  editorVersion,
  variables,
  editorRef,
  handleEditorChange,
  updateOutputs,
  handleSaveContent
}) => {
  // 调试跟踪
  console.log('[EditorPanel.refactored] 渲染，使用VariableEditorX组件');
  console.log('[EditorPanel.refactored] 变量数量:', variables?.length || 0);

  return (
    <Card
      title="编辑器 (X版本)"
      size="small"
      bodyStyle={{ padding: '8px' }}
      style={{ marginBottom: '8px' }}
      extra={
        <Button 
          icon={<SaveOutlined />} 
          size="small" 
          type="primary"
          onClick={handleSaveContent}
          disabled={loading}
        >
          保存
        </Button>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="加载变量列表..." />
        </div>
      ) : (
        <div key={`editor-instance-${editorVersion}`}>
          <VariableEditorXAdapter
            ref={editorRef}
            variables={variables}
            initialContent="这是一个变量编辑器演示，你可以输入@触发变量选择"
            onChange={handleEditorChange}
            onVariableInsert={(variable: any) => {
              console.log('[EditorPanelRefactored] 变量已插入:', variable);
              // 更新输出显示
              setTimeout(updateOutputs, 0);
            }}
            debug={true}
            placeholder="请输入文本，使用@符号插入变量..."
            style={{ minHeight: "120px" }}
          />
          <div style={{ 
            margin: '4px 0', 
            padding: '4px 8px', 
            background: '#f0f9ff', 
            borderRadius: '4px',
            fontSize: '12px',
            color: '#1890ff' 
          }}>
            当前使用: VariableEditorX组件 (新版)
          </div>
        </div>
      )}
    </Card>
  );
};

export default EditorPanelRefactored;
