import React from 'react';
import { Button, Tooltip } from 'antd';
import {
  SaveOutlined,
  CloudUploadOutlined,
  SyncOutlined,
  DatabaseOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { SaveWorkflowPhase } from '../../../services/workflowService';

interface SaveButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  savePhase?: SaveWorkflowPhase;
  saveMessage?: string;
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
 * 保存按钮组件
 * 用于显示工作流保存状态和处理保存操作
 */
const SaveButton: React.FC<SaveButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  savePhase,
  saveMessage
}) => {
  const tooltipTitle = savePhase === SaveWorkflowPhase.COMPLETED 
    ? '已成功保存工作流' 
    : '保存当前工作流';
  
  return (
    <Tooltip title={tooltipTitle}>
      <Button
        type="primary"
        icon={getSaveIcon(savePhase)}
        onClick={onClick}
        loading={loading}
        disabled={disabled}
      >
        {getSaveButtonText(savePhase, saveMessage)}
      </Button>
    </Tooltip>
  );
};

export default SaveButton;
