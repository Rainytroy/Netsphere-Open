import React, { useState, useEffect } from 'react';
import { message, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { CreateWorkflowParams, workflowService, Workflow } from '../../services/workflowService';
import WorkflowEditor from '../../components/workflow/WorkflowEditor';

/**
 * 工作流编辑页面
 * 加载已有工作流并使用工作流编辑器进行编辑
 */
const WorkflowEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 加载工作流数据
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (!id) return;
      
      console.log('[WorkflowEditPage] 开始加载工作流, ID:', id);
      
      try {
        setIsLoading(true);
        const data = await workflowService.getWorkflow(id);
        console.log('[WorkflowEditPage] 获取到工作流数据:', data);
        console.log('[WorkflowEditPage] 工作流元数据:', data.metadata);
        setWorkflow(data);
      } catch (error) {
        console.error('[WorkflowEditPage] 加载工作流失败:', error);
        message.error('加载工作流失败，请重试');
        navigate('/workflow');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkflow();
  }, [id, navigate]);
  
  // 处理保存
  const handleSave = async (data: CreateWorkflowParams) => {
    if (!id) return;
    
    console.log('[WorkflowEditPage] 开始保存工作流, ID:', id);
    console.log('[WorkflowEditPage] 保存前的数据:', data);
    
    setLoading(true);
    try {
      // 添加更新时间到元数据
      const now = new Date().toISOString();
      data.metadata = {
        ...data.metadata,
        updatedAt: now,
        version: (workflow?.metadata?.version || 0) + 1
      };
      
      console.log('[WorkflowEditPage] 处理后的metadata:', data.metadata);
      
      // 更新工作流
      await workflowService.updateWorkflow(id, data);
      message.success('工作流保存成功');
      
      // 关键修改：不重新加载数据，只更新本地状态
      // 这样可以避免画布重置问题
      setWorkflow(prev => {
        if (!prev) return prev; // 防止null错误
        
        return {
          ...prev,
          metadata: data.metadata,
          name: data.name,
          description: data.description || '',
          isActive: data.isActive || false,
          updatedAt: now
          // id和createdAt属性保持原样，从prev中继承
        } as Workflow;
      });
      
      return;
    } catch (error) {
      console.error('[WorkflowEditPage] 保存工作流失败:', error);
      message.error('保存工作流失败，请重试');
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // 返回列表页
  const handleBack = () => {
    navigate('/workflow');
  };
  
  // 跳转到使用页面
  const handleUse = () => {
    navigate(`/workflow/${id}/use`);
  };
  
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Spin tip="加载工作流..." size="large" />
      </div>
    );
  }
  
  if (!workflow) {
    return null;
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <WorkflowEditor
        workflow={workflow}
        onSave={handleSave}
        onBack={handleBack}
        onUse={handleUse}
        loading={loading}
      />
    </div>
  );
};

export default WorkflowEditPage;
