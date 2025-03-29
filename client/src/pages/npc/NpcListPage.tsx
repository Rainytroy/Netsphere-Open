import * as React from 'react';
import { Row, Col, message, Spin, Empty, Button, Typography, Space, Divider, Card } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { npcService, Npc } from '../../services/npcService';
import NpcCard from '../../components/npc/NpcCard';

/**
 * NPC列表页面
 */
const NpcListPage: React.FC = () => {
  const [npcs, setNpcs] = React.useState<Npc[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const navigate = useNavigate();

  // 页面加载时获取NPC列表
  React.useEffect(() => {
    loadNpcs();
  }, []);

  // 加载NPC列表数据
  const loadNpcs = async () => {
    try {
      setLoading(true);
      const response = await npcService.getNpcs();
      setNpcs(response.data);
    } catch (error) {
      console.error('加载NPC列表失败:', error);
      message.error('加载NPC列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理NPC删除
  const handleDeleteNpc = async (id: string) => {
    try {
      await npcService.deleteNpc(id);
      message.success('NPC删除成功');
      // 重新加载列表
      loadNpcs();
    } catch (error) {
      console.error('删除NPC失败:', error);
      message.error('删除NPC失败');
    }
  };

  // 跳转到NPC编辑页面
  const handleEditNpc = (id: string) => {
    navigate(`/npc/edit/${id}`);
  };

  // 跳转到NPC创建页面
  const handleCreateNpc = () => {
    navigate('/npc/create');
  };

  return (
    <div className="npc-list-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>NPC管理</Typography.Title>
              <Typography.Text type="secondary">创建和管理系统中的NPC角色</Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateNpc}
              style={{ backgroundColor: '#1A1F2C' }}
            >
              创建NPC
            </Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin tip="加载中..." />
        </div>
      ) : npcs.length === 0 ? (
        <Empty
          description="暂无NPC数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Card>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '24px',
            alignItems: 'flex-start'
          }}>
            {npcs.map((npc) => (
              <div key={npc.id}>
                <NpcCard
                  npc={npc}
                  onDelete={handleDeleteNpc}
                  onClick={handleEditNpc}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default NpcListPage;
