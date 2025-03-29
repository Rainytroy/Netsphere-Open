import React, { useState } from 'react';
import { Card, Avatar, Button, Tooltip, Typography, Space } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { Npc } from '../../services/npcService';
import DeleteConfirmModal from './DeleteConfirmModal';

const { Text } = Typography;

interface NpcCardProps {
  npc: Npc;
  onDelete: (id: string) => void;
  onClick: (id: string) => void;
}

/**
 * NPC卡片组件，用于在列表中展示NPC信息
 * 遵循统一的卡片设计风格
 */
const NpcCard: React.FC<NpcCardProps> = ({ npc, onDelete, onClick }) => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  
  // 显示删除确认对话框
  const showDeleteConfirm = (e: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发卡片点击事件
    e.stopPropagation();
    setDeleteModalVisible(true);
  };
  
  // 处理删除确认
  const handleDelete = () => {
    onDelete(npc.id);
    setDeleteModalVisible(false);
  };
  
  // 处理卡片点击，导航到编辑页面
  const handleCardClick = () => {
    onClick(npc.id);
  };

  // 处理编辑按钮点击
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(npc.id);
  };

  // 卡片样式，更强的悬停效果
  const cardStyle = {
    width: 280,
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };
  
  // 悬停效果样式
  const hoverStyles = `
    .custom-npc-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      transform: translateY(-3px);
    }
  `;
  
  return (
    <>
      <style>{hoverStyles}</style>
      <Card
        hoverable
        className="custom-npc-card"
        style={cardStyle}
        onClick={handleCardClick}
        actions={[
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={handleEditClick}
            />
          </Tooltip>,
          <Tooltip title="删除">
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              danger
              onClick={showDeleteConfirm}
            />
          </Tooltip>,
        ]}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {/* 头像和名称垂直居中排列 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Space direction="vertical" align="center" size={8}>
              {/* 使用固定的浅灰色圆形头像，内有白色NPC图标 */}
              <Avatar 
                icon={<UserOutlined />}
                style={{ 
                  backgroundColor: '#f0f0f0', 
                  color: '#FFFFFF'
                }}
                size={48}
              />
              <Text strong style={{ fontSize: 16 }}>{npc.name}</Text>
            </Space>
          </div>
          
          <div 
            style={{ 
              color: '#666', 
              fontSize: 14,
              height: 42, 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {npc.description || npc.knowledgeBackground.substring(0, 50) + '...'}
          </div>
        </Space>
      
        <DeleteConfirmModal
          visible={deleteModalVisible}
          onCancel={() => setDeleteModalVisible(false)}
          onConfirm={handleDelete}
          title="确认删除"
          content={`确定要删除 ${npc.name} 吗？`}
        />
      </Card>
    </>
  );
};

export default NpcCard;
