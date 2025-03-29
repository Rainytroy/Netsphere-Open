import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Space, Divider, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import AiServiceList from '../../components/aiService/AiServiceList';
import { aiServiceService, AiService } from '../../services/aiServiceService';

/**
 * AI服务列表页面
 */
const AiServiceListPage: React.FC = () => {
  const [services, setServices] = useState<AiService[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // 加载AI服务列表
  useEffect(() => {
    loadServices();
  }, []);
  
  const loadServices = async () => {
    setLoading(true);
    try {
      const response = await aiServiceService.getServices();
      setServices(response.data);
    } catch (error) {
      console.error('加载AI服务列表失败:', error);
      message.error('加载AI服务列表失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理编辑服务
  const handleEditService = (id: string) => {
    navigate(`/ai-service/edit/${id}`);
  };
  
  // 处理删除服务
  const handleDeleteService = async (id: string) => {
    try {
      await aiServiceService.deleteService(id);
      message.success('删除成功');
      loadServices(); // 重新加载列表
    } catch (error) {
      message.error('删除失败');
    }
  };
  
  // 设置默认服务
  const handleSetDefault = async (id: string) => {
    try {
      await aiServiceService.setDefault(id);
      message.success('已设置为默认服务');
      loadServices(); // 重新加载列表
    } catch (error) {
      message.error('设置默认服务失败');
    }
  };
  
  return (
    <div className="ai-service-list-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>AI服务</Typography.Title>
              <Typography.Text type="secondary">配置和管理系统中使用的AI服务</Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/ai-service/create')}
              style={{ backgroundColor: '#1A1F2C' }}
            >
              添加AI服务
            </Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card>
        <AiServiceList
          services={services}
          loading={loading}
          onEdit={handleEditService}
          onDelete={handleDeleteService}
          onSetDefault={handleSetDefault}
        />
      </Card>
    </div>
  );
};

export default AiServiceListPage;
