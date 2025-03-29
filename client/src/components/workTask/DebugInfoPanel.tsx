import * as React from 'react';
import { Collapse, Typography } from 'antd';

const { Text } = Typography;

interface DebugInfo {
  originalInput: string;
  resolvedInput: string;
  originalTemplate: string;
  resolvedTemplate: string;
  fullPrompt: string;
}

interface DebugInfoPanelProps {
  debugInfo: DebugInfo | null;
  visible: boolean;
}

/**
 * 调试信息面板组件
 * 封装调试信息显示区域，包括输入变量解析、提示词模板解析等内容
 */
const DebugInfoPanel: React.FC<DebugInfoPanelProps> = ({
  debugInfo,
  visible
}) => {
  if (!debugInfo || !visible) {
    return null;
  }

  return (
    <div 
      style={{
        border: '1px solid #e8e8e8', 
        borderRadius: 4, 
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#f9f9f9'
      }}
    >
      <Collapse defaultActiveKey={['input']}>
        <Collapse.Panel header="输入变量解析" key="input">
          <div style={{ marginBottom: 8 }}>
            <Text strong>原始输入:</Text>
            <div 
              style={{ 
                backgroundColor: '#fff', 
                padding: 8, 
                border: '1px solid #f0f0f0',
                borderRadius: 2,
                marginTop: 4,
                marginBottom: 8,
                whiteSpace: 'pre-wrap'
              }}
            >
              {debugInfo.originalInput}
            </div>
            
            <Text strong>解析后输入:</Text>
            <div 
              style={{
                backgroundColor: '#fff', 
                padding: 8, 
                border: '1px solid #f0f0f0',
                borderRadius: 2,
                marginTop: 4,
                marginBottom: 8,
                whiteSpace: 'pre-wrap'
              }}
            >
              {debugInfo.resolvedInput}
            </div>
          </div>
        </Collapse.Panel>
        
        <Collapse.Panel header="提示词模板解析" key="template">
          <div style={{ marginBottom: 8 }}>
            <Text strong>原始模板:</Text>
            <div 
              style={{
                backgroundColor: '#fff', 
                padding: 8, 
                border: '1px solid #f0f0f0',
                borderRadius: 2,
                marginTop: 4,
                marginBottom: 8,
                whiteSpace: 'pre-wrap'
              }}
            >
              {debugInfo.originalTemplate}
            </div>
            
            <Text strong>解析后模板:</Text>
            <div 
              style={{
                backgroundColor: '#fff', 
                padding: 8, 
                border: '1px solid #f0f0f0',
                borderRadius: 2,
                marginTop: 4,
                marginBottom: 8,
                whiteSpace: 'pre-wrap'
              }}
            >
              {debugInfo.resolvedTemplate}
            </div>
          </div>
        </Collapse.Panel>
        
        <Collapse.Panel header="完整提示词" key="full">
          <div 
            style={{
              backgroundColor: '#fff', 
              padding: 8, 
              border: '1px solid #f0f0f0',
              borderRadius: 2,
              marginTop: 4,
              whiteSpace: 'pre-wrap'
            }}
          >
            {debugInfo.fullPrompt}
          </div>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default DebugInfoPanel;
