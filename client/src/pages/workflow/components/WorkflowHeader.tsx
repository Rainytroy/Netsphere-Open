import React from 'react';
import { Typography, Button, Space, Divider } from 'antd';
import { ArrowLeftOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { Workflow } from '../../../services/workflowService';

const { Title } = Typography;

interface WorkflowHeaderProps {
  workflow: Workflow;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
}

/**
 * 工作流页面顶部标题和操作区
 */
const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({ 
  workflow, 
  onBack, 
  onEdit, 
  onSave 
}) => {
  return (
    <div style={{ marginBottom: 16, background: 'white' }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={onBack} 
              style={{ fontSize: 16, marginRight: 16, cursor: 'pointer' }}
            />
            <Title level={4} style={{ margin: 0 }}>
              使用: <span style={{ marginLeft: 8 }}>{workflow.name}</span>
            </Title>
          </div>
          
          <Space>
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={onEdit}
            >
              编辑
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={onSave}
            >
              保存
            </Button>
          </Space>
        </div>
        <Divider style={{ margin: '12px 0' }} />
      </Space>
    </div>
  );
};

export default WorkflowHeader;
