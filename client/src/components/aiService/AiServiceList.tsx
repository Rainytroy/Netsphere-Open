import React, { useState } from 'react';
import { Card, Avatar, Typography, Tag, Tooltip, Button, Space, Empty, Spin, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, StarOutlined, StarFilled, ApiOutlined } from '@ant-design/icons';
import { AiService, AiServiceType, getServiceTypeLabel } from '../../services/aiServiceService';
import DeleteConfirmModal from '../npc/DeleteConfirmModal';

interface AiServiceListProps {
  services: AiService[];
  loading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

/**
 * AI服务列表组件，用于展示已配置的服务
 */
const AiServiceList: React.FC<AiServiceListProps> = ({
  services,
  loading = false,
  onEdit,
  onDelete,
  onSetDefault
}) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<AiService | null>(null);
  
  // 显示删除确认对话框
  const showDeleteConfirm = (service: AiService) => {
    setSelectedService(service);
    setDeleteModalVisible(true);
  };
  
  // 处理删除确认
  const handleDelete = () => {
    if (selectedService && onDelete) {
      onDelete(selectedService.id);
    }
    setDeleteModalVisible(false);
  };
  
  // 服务类型图标映射
  const serviceTypeIcons = {
    [AiServiceType.DEEPSEEK]: <ApiOutlined style={{ color: '#0078D7' }} />,
    [AiServiceType.ANTHROPIC]: <ApiOutlined style={{ color: '#6B21A8' }} />
  };
  
  // Avatar背景色样式
  const avatarStyle = {
    backgroundColor: '#F5F7FA' // 最浅的灰色
  };
  
  // 掩码化API密钥，只显示前4位和后4位
  const maskApiKey = (apiKey: string): string => {
    if (!apiKey) return '••••••••';
    
    if (apiKey.length <= 8) {
      return '••••••••';
    }
    
    return `${apiKey.substring(0, 4)}${'•'.repeat(apiKey.length - 8)}${apiKey.substring(apiKey.length - 4)}`;
  };
  
  // 渲染服务卡片
  const renderServiceCard = (service: AiService) => {
    return (
      <Card
        key={service.id}
        style={{ 
          width: 400,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
        actions={[
          <Tooltip title="编辑">
            <EditOutlined key="edit" onClick={() => onEdit(service.id)} />
          </Tooltip>,
          <Tooltip title="删除">
            <DeleteOutlined 
              key="delete" 
              style={{ color: '#FF4D4F' }}
              onClick={() => showDeleteConfirm(service)} 
            />
          </Tooltip>,
          service.isDefault ? (
            <Tooltip title="默认服务">
              <StarFilled key="default" style={{ color: '#FAAD14' }} />
            </Tooltip>
          ) : (
            <Tooltip title="设为默认">
              <StarOutlined key="set-default" onClick={() => onSetDefault(service.id)} />
            </Tooltip>
          )
        ]}
      >
        <Card.Meta
          avatar={
            <Avatar icon={serviceTypeIcons[service.type] || <ApiOutlined />} style={avatarStyle} />
          }
          title={
            <Space>
              {service.name}
              {service.isDefault && (
                <Tag color="gold">默认</Tag>
              )}
            </Space>
          }
          description={
            <>
              <div>类型: {getServiceTypeLabel(service.type)}</div>
              <div>模型: {service.defaultModel}</div>
              <div>API密钥: <Typography.Text code>{maskApiKey(service.apiKey)}</Typography.Text></div>
              {service.baseUrl && <div>URL: {service.baseUrl}</div>}
            </>
          }
        />
      </Card>
    );
  };
  
  return (
    <div>
      {loading ? (
        <Spin tip="加载中..." />
      ) : services.length === 0 ? (
        <Empty 
          description="暂无AI服务配置" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '24px',
          alignItems: 'flex-start'
        }}>
          {services.map(service => (
            <div key={service.id}>
              {renderServiceCard(service)}
            </div>
          ))}
        </div>
      )}
      
      <DeleteConfirmModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDelete}
        title="确认删除"
        content={`确定要删除AI服务 ${selectedService?.name} 吗？删除后无法恢复。`}
      />
    </div>
  );
};

export default AiServiceList;
