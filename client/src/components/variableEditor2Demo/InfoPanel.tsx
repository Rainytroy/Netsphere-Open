import React from 'react';
import { Card, Tabs, Spin, Alert } from 'antd';
import { InfoPanelProps, DebugInfo } from './types';

/**
 * 信息面板组件 - 显示解析结果、调试信息和变量列表
 */
const InfoPanel: React.FC<InfoPanelProps> = ({
  resolving,
  resolvedContent,
  debugInfo,
  variables
}) => {
  return (
    <Card
      title="其他信息"
      size="small"
      bodyStyle={{ padding: '8px' }}
      style={{ marginBottom: '8px' }}
    >
      <Tabs defaultActiveKey="result" size="small">
        <Tabs.TabPane tab="解析结果" key="result">
          {resolving ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin tip="正在解析变量..." />
            </div>
          ) : resolvedContent ? (
            <div
              style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#f9f9f9' }}
            >
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', maxHeight: '150px', overflow: 'auto' }}>
                {resolvedContent}
              </pre>
            </div>
          ) : (
            <Alert
              message="尚未解析"
              description="点击解析变量按钮查看解析结果"
              type="info"
              showIcon
            />
          )}
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="调试信息" key="debug">
          <pre
            style={{
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: '#f0f0f0',
              overflow: 'auto',
              maxHeight: '150px',
              fontSize: '12px'
            }}
          >
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </Tabs.TabPane>
        
        <Tabs.TabPane tab="变量列表" key="variables">
          {variables.length > 0 ? (
            <div
              style={{
                maxHeight: '150px',
                overflow: 'auto',
                padding: '8px',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #f0f0f0' }}>名称</th>
                    <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #f0f0f0' }}>标识符</th>
                    <th style={{ textAlign: 'left', padding: '4px', borderBottom: '1px solid #f0f0f0' }}>来源</th>
                  </tr>
                </thead>
                <tbody>
                  {variables.map((variable, index) => (
                    <tr key={variable.id || index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                      <td style={{ padding: '4px', borderBottom: '1px solid #f0f0f0' }}>{variable.name}</td>
                      <td style={{ padding: '4px', borderBottom: '1px solid #f0f0f0' }}>{variable.identifier}</td>
                      <td style={{ padding: '4px', borderBottom: '1px solid #f0f0f0' }}>{variable.sourceName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert
              message="无变量数据"
              description="未加载到任何变量数据"
              type="warning"
              showIcon
            />
          )}
        </Tabs.TabPane>
      </Tabs>
    </Card>
  );
};

export default InfoPanel;
