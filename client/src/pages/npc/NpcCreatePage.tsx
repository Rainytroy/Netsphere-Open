import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Typography, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { npcService } from '../../services/npcService';
import NpcForm from '../../components/npc/NpcForm';

/**
 * NPC创建页面
 */
const NpcCreatePage: React.FC = () => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const navigate = useNavigate();

  // 处理创建NPC的表单提交
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // 调用API创建NPC
      await npcService.createNpc(values);
      
      message.success('NPC创建成功');
      
      // 创建成功后返回列表页
      navigate('/npc/list');
    } catch (error) {
      console.error('创建NPC失败:', error);
      message.error('创建NPC失败');
    } finally {
      setLoading(false);
    }
  };

  // 返回列表页
  const goBack = () => {
    navigate('/npc/list');
  };

  return (
    <div className="npc-create-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>创建NPC</Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>

      <NpcForm
        onSubmit={handleSubmit}
        submitButtonText="创建"
        loading={loading}
      />
    </div>
  );
};

export default NpcCreatePage;
