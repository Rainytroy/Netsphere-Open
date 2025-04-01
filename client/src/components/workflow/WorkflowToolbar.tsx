import React from 'react';
import { Input, Button, Space, Divider, Modal, Typography, Tooltip } from 'antd';
import { 
  ArrowLeftOutlined, 
  SaveOutlined, 
  ExperimentOutlined, 
  CloseOutlined, 
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import { SaveWorkflowPhase } from '../../services/workflowService';

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
  savePhase?: SaveWorkflowPhase; // 添加保存阶段
  saveMessage?: string; // 阶段描述消息
}

/**
 * 根据保存阶段获取对应的图标
 * @param phase 保存阶段
 * @returns 对应的图标组件
 */
const getSaveIcon = (phase?: SaveWorkflowPhase) => {
  if (!phase || phase === SaveWorkflowPhase.IDLE) {
    return <SaveOutlined />;
  }

  switch (phase) {
    case SaveWorkflowPhase.SAVING:
      return <CloudUploadOutlined spin />;
    case SaveWorkflowPhase.VERIFYING:
      return <SyncOutlined spin />;
    case SaveWorkflowPhase.SYNCING_VARIABLES:
      return <DatabaseOutlined spin />;
    case SaveWorkflowPhase.BROADCASTING:
      return <SyncOutlined spin />;
    case SaveWorkflowPhase.COMPLETED:
      return <CheckCircleOutlined />;
    default:
      return <SaveOutlined />;
  }
};

/**
 * 根据保存阶段获取按钮文本
 * @param phase 保存阶段
 * @param message 可选的自定义消息
 * @returns 按钮文本
 */
const getSaveButtonText = (phase?: SaveWorkflowPhase, message?: string) => {
  if (!phase || phase === SaveWorkflowPhase.IDLE) {
    return '保存';
  }

  if (message) {
    return message;
  }

  switch (phase) {
    case SaveWorkflowPhase.SAVING:
      return '正在保存...';
    case SaveWorkflowPhase.VERIFYING:
      return '验证中...';
    case SaveWorkflowPhase.SYNCING_VARIABLES:
      return '同步变量...';
    case SaveWorkflowPhase.BROADCASTING:
      return '广播更新...';
    case SaveWorkflowPhase.COMPLETED:
      return '已保存';
    default:
      return '保存';
  }
};

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
  isNewWorkflow = false,
  savePhase,
  saveMessage
}) => {
  // 处理名称编辑
  const handleNameEdit = () => {
    setIsEditingName(true);
  };
  
  // 处理名称保存
  const handleNameSave = () => {
    setIsEditingName(false);
  };
  
  // 简化保存按钮状态管理 - 只考虑loading参数
  const isSaveButtonDisabled = false;
  const isSaveButtonLoading = loading;
  
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
              icon={getSaveIcon(savePhase)}
              onClick={onSave}
              loading={isSaveButtonLoading}
              disabled={isSaveButtonDisabled}
            >
              {getSaveButtonText(savePhase, saveMessage)}
            </Button>
            {/* 移除了展开/折叠按钮，因为已经由卡片面板的最小化功能替代 */}
          </Space>
        </div>
        <Divider style={{ margin: '12px 0 0' }} />
      </Space>
    </div>
  );
};

export default WorkflowToolbar;
