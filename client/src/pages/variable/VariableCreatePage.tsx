import React, { useState } from 'react';
import { Card, message, Typography, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import VariableForm from '../../components/variable/VariableForm';
import { variableService } from '../../services/variableService';

/**
 * 创建自定义变量页面
 */
const VariableCreatePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // 处理表单提交
  const handleSubmit = async (values: { name: string; value: string }) => {
    setLoading(true);
    try {
      await variableService.createVariable(values);
      message.success('创建成功');
      navigate('/variable/list');
    } catch (error: any) {
      console.error('创建变量失败:', error);
      
      // 处理不同类型的错误
      if (error.response?.status === 409) {
        message.error('变量标识符已存在，请使用其他名称');
      } else {
        message.error('创建失败: ' + (error.response?.data?.message || '未知错误'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 返回列表页
  const goBack = () => {
    navigate('/variable/list');
  };

  return (
    <div className="variable-create-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>创建全局变量</Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card>
        <VariableForm
          onSubmit={handleSubmit}
          submitButtonText="创建"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default VariableCreatePage;
