import React, { useState, useEffect } from 'react';
import { Card, Button, message, Typography, Space, Divider, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import AiServiceForm from '../../components/aiService/AiServiceForm';
import { aiServiceService, AiService } from '../../services/aiServiceService';

/**
 * AI服务编辑页面
 */
const AiServiceEditPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [service, setService] = useState<AiService | null>(null);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // 加载AI服务数据
  useEffect(() => {
    if (id) {
      loadService(id);
    }
  }, [id]);
  
  const loadService = async (serviceId: string) => {
    setLoading(true);
    try {
      const response = await aiServiceService.getService(serviceId);
      setService(response.data);
    } catch (error) {
      console.error('加载AI服务失败:', error);
      message.error('加载AI服务失败');
      // 导航回列表页
      navigate('/ai-service');
    } finally {
      setLoading(false);
    }
  };
  
  // 返回列表页
  const goBack = () => {
    navigate('/ai-service');
  };
  
  // 处理更新提交
  const handleSubmit = async (values: any) => {
    if (!id) return;
    
    setSubmitting(true);
    try {
      await aiServiceService.updateService(id, values);
      message.success('AI服务更新成功');
      navigate('/ai-service');
    } catch (error) {
      console.error('更新AI服务失败:', error);
      message.error('更新AI服务失败');
    } finally {
      setSubmitting(false);
    }
  };
  
  // 处理连接测试
  const handleTestConnection = async (values: any) => {
    try {
      const response = await aiServiceService.testConnection({
        ...values,
        id
      });
      return response.data;
    } catch (error) {
      console.error('测试连接失败:', error);
      return {
        success: false,
        message: '连接测试失败: ' + (error instanceof Error ? error.message : '未知错误')
      };
    }
  };
  
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin tip="加载中..." />
      </div>
    );
  }
  
  if (!service) {
    return null;
  }
  
  return (
    <div className="ai-service-edit-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              {service ? `编辑AI服务: ${service.name}` : '编辑AI服务'}
            </Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card>
        <AiServiceForm
          initialValues={service}
          onSubmit={handleSubmit}
          onTestConnection={handleTestConnection}
          submitButtonText="保存修改"
          loading={submitting}
        />
      </Card>
    </div>
  );
};

export default AiServiceEditPage;
