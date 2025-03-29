import React, { useRef, useState } from 'react';
import { Card, Divider, Typography, Space, Switch, Tabs, Button } from 'antd';
import VariableEditorX from './index';
import { VariableData, VariableEditorXRef } from './types';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

/**
 * 变量编辑器X演示页面
 */
const VariableEditorEnhancedDemo: React.FC = () => {
  // 状态
  const [readOnly, setReadOnly] = useState(false);
  const [debug, setDebug] = useState(true);
  const [content, setContent] = useState<string>('');
  const [resolvedContent, setResolvedContent] = useState<string>('');
  
  // 引用
  const editorRef = useRef<VariableEditorXRef>(null);
  
  // 获取解析后的内容
  const handleGetResolvedContent = async () => {
    if (editorRef.current) {
      const resolved = await editorRef.current.getResolvedContent();
      setResolvedContent(resolved);
    }
  };
  
  // 变量插入处理
  const handleVariableInsert = (variable: VariableData) => {
    console.log('插入变量:', variable);
  };
  
  // 内容变更处理
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  return (
    <div className="variable-editor-enhanced-demo" style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <Typography>
        <Title level={2}>变量编辑器X演示</Title>
        <Paragraph>
          这是一个全新设计的变量编辑器，支持UUID格式变量标识符(<Text code>@gv_UUID_field</Text>)。使用<Text code>@</Text>触发变量选择。
        </Paragraph>
        <Space>
          <Switch 
            checked={readOnly} 
            onChange={setReadOnly}
            checkedChildren="只读" 
            unCheckedChildren="编辑" 
          />
          <Switch 
            checked={debug} 
            onChange={setDebug}
            checkedChildren="调试开启" 
            unCheckedChildren="调试关闭" 
          />
        </Space>
      </Typography>

      <Divider />

      {/* 变量编辑器 */}
      <VariableEditorX
        ref={editorRef}
        readOnly={readOnly}
        onChange={handleContentChange}
        onVariableInsert={handleVariableInsert}
        debug={debug}
        placeholder="在此输入文本，使用@触发变量选择..."
      />

      {/* 解析内容 */}
      <div style={{ marginTop: '16px' }}>
        <Space style={{ marginBottom: '8px' }}>
          <Button onClick={handleGetResolvedContent}>获取解析后内容</Button>
        </Space>
        
        {resolvedContent && (
          <Card title="解析后内容" size="small">
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-all',
              backgroundColor: '#f5f5f5', 
              padding: '12px',
              borderRadius: '4px',
              fontSize: '12px',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {resolvedContent}
            </pre>
          </Card>
        )}
      </div>

      <Divider />
      
      <Typography>
        <Title level={3}>使用说明</Title>
        <ul>
          <li>
            <Text strong>输入@字符:</Text> 触发变量选择器，可以搜索和选择变量。
          </li>
          <li>
            <Text strong>点击插入变量按钮:</Text> 随机插入一个变量示例。
          </li>
          <li>
            <Text strong>变量标签:</Text> 鼠标悬停在变量标签上可查看详细信息。
          </li>
          <li>
            <Text strong>调试面板:</Text> 打开调试模式可查看HTML、JSON等内容。
          </li>
          <li>
            <Text strong>内容解析:</Text> 点击"获取解析后内容"可以将变量标识符解析为实际值。
          </li>
        </ul>
      </Typography>
    </div>
  );
};

export default VariableEditorEnhancedDemo;
