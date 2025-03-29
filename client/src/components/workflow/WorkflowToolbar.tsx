import React from 'react';
import { Input, Button, Space, Divider, Modal, Typography, Tooltip } from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  ExperimentOutlined, 
  CloseOutlined, 
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface WorkflowToolbarProps {
  name: string;
  isEditingName: boolean;
  setName: (name: string) => void;
  setIsEditingName: (isEditing: boolean) => void;
  onBack: () => void; // 将复用onExit的逻辑
  onSave: () => void;
  onUse: () => void;
  onExit: () => void;
  toggleCardPanel: () => void;
  cardPanelVisible: boolean;
  loading?: boolean;
  isNewWorkflow?: boolean;
}

/**
 * 工作流编辑器工具栏组件
 * 包含工具栏上的按钮和操作
 */
const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  name,
  isEditingName,
  setName,
  setIsEditingName,
  onBack,
  onSave,
  onUse,
  onExit,
  toggleCardPanel,
  cardPanelVisible,
  loading = false,
  isNewWorkflow = false
}) => {
  // 处理名称编辑
  const handleNameEdit = () => {
    setIsEditingName(true);
  };
  
  // 处理名称保存
  const handleNameSave = () => {
    setIsEditingName(false);
  };
  
  return (
    <div style={{ background: 'white' }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={onExit} // 使用onExit代替onBack，这样会触发保存确认弹窗
              style={{ fontSize: 16, marginRight: 16, cursor: 'pointer' }}
            />
            <Title level={4} style={{ margin: 0 }}>
              {isNewWorkflow ? '创建' : '编辑'}: <span style={{ marginLeft: 8 }}>
              {isEditingName ? (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameSave}
                  onPressEnter={handleNameSave}
                  style={{ width: '300px' }}
                  autoFocus
                />
              ) : (
                <Space>
                  <span>{name}</span>
                  <Tooltip title="编辑名称">
                    <EditOutlined onClick={handleNameEdit} style={{ cursor: 'pointer' }} />
                  </Tooltip>
                </Space>
              )}
              </span>
            </Title>
          </div>
          
          <Space>
            <Button 
              type="primary" 
              icon={<ExperimentOutlined />} 
              onClick={onUse}
            >
              使用
            </Button>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={onSave}
              loading={loading}
            >
              保存
            </Button>
            <Button 
              icon={<CloseOutlined />} 
              onClick={onExit}
            >
              退出
            </Button>
            <Button
              icon={cardPanelVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={toggleCardPanel}
              type="text"
            />
          </Space>
        </div>
        <Divider style={{ margin: '12px 0 0' }} />
      </Space>
    </div>
  );
};

export default WorkflowToolbar;
