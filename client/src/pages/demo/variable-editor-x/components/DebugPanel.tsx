import React, { useState } from 'react';
import { Tabs, Button, Space, Card, Typography, Divider } from 'antd';
import { VariableData } from '../types';

const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface DebugPanelProps {
  editor: any;
  htmlContent: string;
  jsonContent: string;
  rawTextContent: string;
  resolvedContent: string;
  usedVariables: VariableData[];
  onReset: () => void;
}

/**
 * 调试面板
 * 显示不同格式的内容和调试信息
 */
const DebugPanel: React.FC<DebugPanelProps> = ({
  editor,
  htmlContent,
  jsonContent,
  rawTextContent,
  resolvedContent,
  usedVariables,
  onReset
}) => {
  const [activeKey, setActiveKey] = useState<string>('rawText');

  return (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <div className="debug-panel-title">测试面板</div>
        <Space>
          <Button size="small" danger onClick={onReset}>重置文本框内容为空</Button>
        </Space>
      </div>

      <Tabs 
        activeKey={activeKey} 
        onChange={setActiveKey}
        type="card"
        size="small"
        style={{ padding: '12px 16px' }}
      >
        <TabPane tab="HTML格式" key="html">
          <FormatDisplay title="HTML格式" content={htmlContent} language="html" />
        </TabPane>
        
        <TabPane tab="JSON格式" key="json">
          <FormatDisplay title="JSON格式" content={jsonContent} language="json" />
        </TabPane>
        
        <TabPane tab="rawText格式" key="rawText">
          <FormatDisplay title="rawText格式 (系统标识符)" content={rawTextContent} language="plaintext" />
        </TabPane>
        
        <TabPane tab="解析格式" key="resolved">
          <FormatDisplay title="解析格式 (变量值)" content={resolvedContent} language="plaintext" />
        </TabPane>
        
        <TabPane tab="变量列表" key="variables">
          <div className="debug-content">
            <Title level={5} style={{ margin: '0 0 16px 0' }}>使用的变量</Title>
            {usedVariables.length === 0 ? (
              <Text type="secondary">暂无使用的变量</Text>
            ) : (
              <div>
                {usedVariables.map((variable, index) => (
                  <Card 
                    key={`${variable.id}-${variable.field}-${index}`}
                    size="small" 
                    title={variable.displayIdentifier || `@${variable.sourceName}.${variable.field}#${variable.id.substring(0, 4)}`}
                    style={{ marginBottom: '8px' }}
                  >
                    <p><Text strong>系统标识符:</Text> {variable.identifier}</p>
                    <p><Text strong>ID:</Text> {variable.id}</p>
                    <p><Text strong>字段:</Text> {variable.field}</p>
                    <p><Text strong>来源:</Text> {variable.sourceName}</p>
                    <p><Text strong>类型:</Text> {variable.sourceType}</p>
                    <p><Text strong>值:</Text> {variable.value || '[无值]'}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabPane>
        
        <TabPane tab="编辑器状态" key="status">
          <div className="debug-content">
            <Title level={5} style={{ margin: '0 0 16px 0' }}>编辑器状态</Title>
            <p><Text strong>聚焦:</Text> {editor?.isFocused ? '是' : '否'}</p>
            <p><Text strong>可编辑:</Text> {editor?.isEditable ? '是' : '否'}</p>
            <p><Text strong>内容为空:</Text> {editor?.isEmpty ? '是' : '否'}</p>
            <p><Text strong>变量数量:</Text> {usedVariables.length}</p>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
};

// 格式展示组件
interface FormatDisplayProps {
  title: string;
  content: string;
  language: string;
}

const FormatDisplay: React.FC<FormatDisplayProps> = ({ title, content, language }) => {
  return (
    <div className="debug-content">
      <Title level={5} style={{ margin: '0 0 16px 0' }}>{title}</Title>
      <pre className="debug-code">
        <code>{content}</code>
      </pre>
    </div>
  );
};

export default DebugPanel;
