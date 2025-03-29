import React, { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Card, Tabs, Typography, Button } from 'antd';
import { SyncOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;
const { Paragraph, Text } = Typography;

interface DebugPanelProps {
  editor: Editor | null;
}

/**
 * 调试面板组件
 * 
 * 用于在开发过程中显示编辑器的各种状态，方便调试和开发
 */
const DebugPanel: React.FC<DebugPanelProps> = ({ editor }) => {
  const [html, setHtml] = useState<string>('');
  const [json, setJson] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string>('html');

  // 更新调试信息
  const updateDebugInfo = () => {
    if (editor) {
      setHtml(editor.getHTML());
      setJson(JSON.stringify(editor.getJSON(), null, 2));
      setText(editor.getText());
    }
  };

  // 当编辑器内容变化时更新调试信息
  useEffect(() => {
    if (editor) {
      // 初始化
      updateDebugInfo();

      // 监听变化
      editor.on('update', updateDebugInfo);
      
      // 清理
      return () => {
        editor.off('update', updateDebugInfo);
      };
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <Card 
      title="调试面板" 
      size="small" 
      style={{ marginTop: '16px' }}
      extra={
        <Button 
          icon={<SyncOutlined />} 
          size="small" 
          onClick={updateDebugInfo}
          title="刷新调试信息"
        >
          刷新
        </Button>
      }
    >
      <Tabs activeKey={activeKey} onChange={setActiveKey}>
        <TabPane tab="HTML" key="html">
          <div className="debug-content">
            <Paragraph>
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
                {html || <Text type="secondary">空内容</Text>}
              </pre>
            </Paragraph>
          </div>
        </TabPane>
        <TabPane tab="JSON" key="json">
          <div className="debug-content">
            <Paragraph>
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
                {json || <Text type="secondary">空内容</Text>}
              </pre>
            </Paragraph>
          </div>
        </TabPane>
        <TabPane tab="纯文本" key="text">
          <div className="debug-content">
            <Paragraph>
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
                {text || <Text type="secondary">空内容</Text>}
              </pre>
            </Paragraph>
          </div>
        </TabPane>
        <TabPane tab="变量" key="variables">
          <div className="debug-content">
            <Paragraph>
              <Text type="secondary">检测到的变量：</Text>
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
                {JSON.stringify(
                  // 提取编辑器中的变量节点
                  editor?.getJSON().content
                    ?.flatMap(node => node.content || [])
                    ?.filter(node => node.type === 'variable')
                    ?.map(node => node.attrs) || [],
                  null,
                  2
                ) || <Text type="secondary">未检测到变量</Text>}
              </pre>
            </Paragraph>
          </div>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default DebugPanel;
