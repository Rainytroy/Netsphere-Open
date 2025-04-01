import React, { useState } from 'react';
import { Card, Typography, Button, Space, Modal, Tabs } from 'antd';
import { EyeOutlined, CodeOutlined } from '@ant-design/icons';

const { Text, Paragraph, Title } = Typography;
const { TabPane } = Tabs;

interface DebugPanelProps {
  title?: string;
  content?: string;
  html?: string;
  rawText?: string;
  variableIds?: string[];
}

/**
 * 调试面板组件
 * 用于在开发和测试过程中显示各种内容格式，特别是变量编辑器相关的内容
 */
const DebugPanel: React.FC<DebugPanelProps> = ({
  title = '调试面板',
  content = '',
  html = '',
  rawText = '',
  variableIds = []
}) => {
  const [visible, setVisible] = useState(false);

  const showModal = () => {
    setVisible(true);
  };

  const handleCancel = () => {
    setVisible(false);
  };

  // 检测内容中是否包含变量标签
  const hasVariableTags = html.includes('data-variable-id') || rawText.includes('@');
  
  // 格式化HTML以便于阅读
  const formatHtml = (html: string) => {
    if (!html) return '';
    try {
      // 简单的格式化，在每个>后添加换行和缩进
      return html
        .replace(/>/g, '>\n')
        .replace(/</g, '\n<')
        .split('\n')
        .filter(line => line.trim().length > 0)
        .join('\n');
    } catch (error) {
      console.error('格式化HTML失败:', error);
      return html;
    }
  };

  // 将变量标识符渲染为变量标签样式
  const renderVariableTags = (text: string) => {
    if (!text) return text;
    
    // 匹配变量标识符，渲染为类似于编辑器中的变量标签样式
    return text.replace(
      /(@[a-zA-Z0-9\.\-_]+)/g, 
      `<span style="
        background-color: #FFF7E6; 
        border: 1px solid #FA8C16; 
        border-radius: 4px; 
        padding: 2px 8px; 
        color: #FA8C16; 
        display: inline-flex; 
        align-items: center; 
        font-size: 12px; 
        font-weight: 500; 
        line-height: 1.5; 
        white-space: nowrap; 
        margin: 0 4px 0 0;
      ">$1</span>`
    );
  };

  return (
    <>
      <Card
        title={title}
        size="small"
        extra={
          <Space>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={showModal}
              size="small"
            >
              查看详情
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Paragraph ellipsis={{ rows: 2 }}>
          {content || (html ? '包含HTML内容' : '无内容')}
        </Paragraph>
        {hasVariableTags && (
          <Text type="success">检测到变量标签</Text>
        )}
      </Card>

      <Modal
        title={`${title} - 详细信息`}
        open={visible}
        onCancel={handleCancel}
        footer={[
          <Button key="close" onClick={handleCancel}>
            关闭
          </Button>
        ]}
        width={800}
        style={{ top: 20 }}
        bodyStyle={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        <Tabs defaultActiveKey="content">
          {content && (
            <TabPane tab="内容" key="content">
              <Card>
                <Paragraph>
                  <div dangerouslySetInnerHTML={{ __html: renderVariableTags(content) }} />
                </Paragraph>
              </Card>
            </TabPane>
          )}
          {html && (
            <TabPane tab="HTML" key="html">
              <Card>
                <Paragraph>
                  <Text code>{formatHtml(html)}</Text>
                </Paragraph>
              </Card>
            </TabPane>
          )}
          {rawText && (
            <TabPane tab="原始文本" key="rawText">
              <Card>
                <Paragraph>
                  <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {rawText}
                  </pre>
                </Paragraph>
              </Card>
            </TabPane>
          )}
          {variableIds.length > 0 && (
            <TabPane tab="变量ID" key="variableIds">
              <Card>
                <ul>
                  {variableIds.map((id, index) => (
                    <li key={index}>
                      <Text code>{id}</Text>
                    </li>
                  ))}
                </ul>
              </Card>
            </TabPane>
          )}
        </Tabs>
      </Modal>
    </>
  );
};

export default DebugPanel;
