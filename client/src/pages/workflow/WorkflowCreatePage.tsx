import React, { useState } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { CreateWorkflowParams, workflowService } from '../../services/workflowService';
import WorkflowEditor from '../../components/workflow/WorkflowEditor';

/**
 * 工作流创建页面
 * 使用新版工作流编辑器直接创建工作流
 */
const WorkflowCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // 处理保存
  const handleSave = async (data: CreateWorkflowParams) => {
    setLoading(true);
    try {
      // 添加创建时间到元数据
      const now = new Date().toISOString();
      data.metadata = {
        ...data.metadata,
        createdAt: now,
        updatedAt: now,
        version: 1
      };
      
      // 创建工作流
      const workflow = await workflowService.createWorkflow(data);
      message.success('工作流保存成功');
      
      // 创建成功后跳转到编辑页面
      navigate(`/workflow/${workflow.id}/edit`);
      return;
    } catch (error) {
      console.error('创建工作流失败:', error);
      message.error('创建工作流失败，请重试');
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
    message.info('请先保存工作流后再使用');
  };

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <WorkflowEditor
        onSave={handleSave}
        onBack={handleBack}
        onUse={handleUse}
        loading={loading}
      />
    </div>
  );
};

export default WorkflowCreatePage;
