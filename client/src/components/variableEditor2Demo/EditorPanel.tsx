import React from 'react';
import { Card, Spin, Button, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import VariableEditor2 from '../variable/VariableEditor2';
import { EditorPanelExtendedProps } from './types';

/**
 * 编辑器面板组件
 */
const EditorPanel: React.FC<EditorPanelExtendedProps> = ({
  loading,
  editorVersion,
  variables,
  editorRef,
  handleEditorChange,
  updateOutputs,
  handleSaveContent
}) => {
  return (
    <Card
      title="编辑器"
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
          <VariableEditor2
            ref={editorRef}
            variables={variables}
            placeholder="请输入文本，使用@符号插入变量..."
            defaultValue="这是一个变量编辑器演示，你可以输入@触发变量选择"
            onChange={handleEditorChange}
            minHeight="120px"
          />
        </div>
      )}
    </Card>
  );
};

export default EditorPanel;
