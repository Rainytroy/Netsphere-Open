import React from 'react';
import { Card, Space, Button } from 'antd';
import { BasicOperationProps } from './types';

/**
 * 基本操作按钮面板
 */
const BasicOperationPanel: React.FC<BasicOperationProps> = ({
  resolving,
  handleResolveVariables,
  handleReset,
  handleTestInsertVariable,
  handleRefreshEditor
}) => {
  return (
    <Card
      title="基本操作"
      size="small"
      bodyStyle={{ padding: '8px' }}
      style={{ marginBottom: '8px' }}
    >
      <Space>
        <Button 
          type="primary" 
          size="small"
          onClick={handleResolveVariables}
          loading={resolving}
        >
          解析变量
        </Button>
        <Button size="small" onClick={handleReset}>
          重置内容
        </Button>
        <Button size="small" onClick={handleTestInsertVariable}>
          插入测试变量
        </Button>
        <Button size="small" onClick={handleRefreshEditor}>
          刷新编辑器
        </Button>
      </Space>
    </Card>
  );
};

export default BasicOperationPanel;
