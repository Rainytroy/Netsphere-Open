import React from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import IdentifierTester from '../../components/variable/IdentifierTester';

/**
 * 变量调试工具页面
 * 从变量编辑器X中分离出来的独立页面，方便变量调试
 */
const VariableDebugPage: React.FC = () => {
  const navigate = useNavigate();

  // 返回列表页并确保左侧导航焦点在变量列表
  const goBack = () => {
    navigate('/variable/list');
  };

  return (
    <div className="variable-debug-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              系统标识符测试工具
            </Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <IdentifierTester />
    </div>
  );
};

export default VariableDebugPage;
