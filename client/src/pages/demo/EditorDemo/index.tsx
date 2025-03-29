import React, { useState } from 'react';
import { Card, Divider, Switch, Typography } from 'antd';
import VariableEditor from './components/VariableEditor';

const { Title, Paragraph, Text } = Typography;

const EditorDemo: React.FC = () => {
  const [readOnly, setReadOnly] = useState(false);
  const [editorContent, setEditorContent] = useState('');

  const handleContentChange = (content: string) => {
    setEditorContent(content);
  };

  return (
    <div className="editor-demo-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <Typography>
        <Title level={2}>变量富文本编辑器演示</Title>
        <Paragraph>
          这是一个支持变量标签的富文本编辑器，可以方便地在文本中插入和管理变量。
          使用<Text code>@</Text>符号触发变量提示功能。
        </Paragraph>
        <Paragraph>
          <Text strong>主要功能：</Text>
        </Paragraph>
        <ul>
          <li>支持基本富文本编辑功能</li>
          <li>可以输入<Text code>@</Text>触发变量选择器</li>
          <li>变量显示为特殊样式标签</li>
          <li>支持通过按钮随机插入变量</li>
          <li>可以获取HTML或JSON格式的内容</li>
          <li>支持只读模式切换</li>
        </ul>
      </Typography>

      <Divider />

      <div style={{ marginBottom: '16px' }}>
        <Switch
          checked={readOnly}
          onChange={setReadOnly}
          checkedChildren="只读模式"
          unCheckedChildren="编辑模式"
        />
      </div>

      <VariableEditor
        readOnly={readOnly}
        onChange={handleContentChange}
      />

      {editorContent && (
        <Card title="编辑器当前内容" style={{ marginTop: '24px' }}>
          <div>
            <Typography.Title level={5}>原始HTML:</Typography.Title>
            <pre style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
              {editorContent}
            </pre>
          </div>
          <Divider />
          <div>
            <Typography.Title level={5}>渲染效果:</Typography.Title>
            <div
              style={{ padding: '12px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
              dangerouslySetInnerHTML={{ __html: editorContent }}
            />
          </div>
        </Card>
      )}
      
      <div style={{ marginTop: '24px' }}>
        <Typography.Paragraph type="secondary">
          <Text strong>提示：</Text>
          在编辑器中输入<Text code>@</Text>字符可以触发变量选择器弹出，使用上下键浏览变量列表，Enter键选择变量。
          也可以直接点击"插入随机变量"按钮随机添加一个变量标签。
        </Typography.Paragraph>
      </div>
    </div>
  );
};

export default EditorDemo;
