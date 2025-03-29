import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message, Typography, Space, Divider, Spin, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { npcService, Npc } from '../../services/npcService';
import NpcForm from '../../components/npc/NpcForm';

/**
 * NPC编辑页面
 */
const NpcEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [npc, setNpc] = useState<Npc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 加载NPC数据
  useEffect(() => {
    if (!id) {
      setError('未提供NPC ID');
      setLoading(false);
      return;
    }

    const fetchNpc = async () => {
      try {
        setLoading(true);
        const response = await npcService.getNpc(id);
        setNpc(response.data);
        setError(null);
      } catch (err) {
        console.error('获取NPC数据失败:', err);
        setError('无法加载NPC数据');
        setNpc(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNpc();
  }, [id]);

  // 处理表单提交
  const handleSubmit = async (values: any) => {
    if (!id || !npc) return;

    try {
      setSubmitting(true);
      
      // 调用API更新NPC
      await npcService.updateNpc(id, values);
      
      message.success('NPC更新成功');
      
      // 更新成功后返回列表页
      navigate('/npc/list');
    } catch (err) {
      console.error('更新NPC失败:', err);
      message.error('更新NPC失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 返回列表页
  const goBack = () => {
    navigate('/npc/list');
  };

  // 渲染加载状态
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  // 渲染错误状态
  if (error || !npc) {
    return (
      <div style={{ padding: '20px 0' }}>
        <Alert
          message="错误"
          description={error || '未找到NPC数据'}
          type="error"
          showIcon
          action={
            <div>
              <Space>
                <a onClick={goBack}>返回列表</a>
              </Space>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="npc-edit-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              编辑NPC: {npc.name}
            </Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>

      <NpcForm
        initialValues={npc}
        onSubmit={handleSubmit}
        submitButtonText="保存"
        loading={submitting}
      />
    </div>
  );
};

export default NpcEditPage;
