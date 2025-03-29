import React, { useState } from 'react';
import { Card, message, Typography, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AiServiceForm from '../../components/aiService/AiServiceForm';
import { aiServiceService } from '../../services/aiServiceService';

/**
 * AI服务创建页面
 */
const AiServiceCreatePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // 返回列表页
  const goBack = () => {
    navigate('/ai-service');
  };
  
  // 处理创建提交
  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await aiServiceService.createService(values);
      message.success('AI服务创建成功');
      navigate('/ai-service');
    } catch (error) {
      console.error('创建AI服务失败:', error);
      message.error('创建AI服务失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理连接测试
  const handleTestConnection = async (values: any) => {
    try {
      const response = await aiServiceService.testConnection(values);
      return response.data;
    } catch (error) {
      console.error('测试连接失败:', error);
      return {
        success: false,
        message: '连接测试失败: ' + (error instanceof Error ? error.message : '未知错误')
      };
    }
  };
  
  return (
    <div className="ai-service-create-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>创建AI服务</Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card>
        <AiServiceForm
          onSubmit={handleSubmit}
          onTestConnection={handleTestConnection}
          submitButtonText="创建服务"
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default AiServiceCreatePage;
