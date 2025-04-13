import React, { useState, useEffect, useRef } from 'react';
import { Button, Tooltip, message } from 'antd';
import {
  SaveOutlined,
  CloudUploadOutlined,
  SyncOutlined,
  DatabaseOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { SaveWorkflowPhase } from '../../../services/workflowService';

interface SaveButtonWhiteProps {
  onClick: () => void;
  onNavigate?: () => void; // 新增：用于跳转到使用页面
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
 * 白底保存按钮组件
 * 用于显示工作流保存状态和处理保存操作，使用白色背景
 * 支持保存后自动跳转到使用页面
 */
const SaveButtonWhite: React.FC<SaveButtonWhiteProps> = ({
  onClick,
  onNavigate,
  loading = false,
  disabled = false,
  savePhase,
  saveMessage
}) => {
  // 保存上一次的保存阶段
  const [waitingForComplete, setWaitingForComplete] = useState(false);
  const prevPhaseRef = useRef(savePhase);
  
  // 监听保存阶段变化
  useEffect(() => {
    // 如果不是在等待完成状态，直接返回
    if (!waitingForComplete) return;
    
    // 如果进入了完成状态，而且有跳转函数
    if (savePhase === SaveWorkflowPhase.COMPLETED && prevPhaseRef.current !== SaveWorkflowPhase.COMPLETED) {
      // 短暂延迟再跳转（让用户看到完成状态）
      
      // 确保数据完全同步后再跳转
      setTimeout(() => {
        if (onNavigate) {
          onNavigate();
        }
        // 重置等待状态
        setWaitingForComplete(false);
      }, 300);
    }
    
    // 更新前一个状态引用
    prevPhaseRef.current = savePhase;
  }, [savePhase, onNavigate, waitingForComplete]);
  
  // 自定义点击事件处理器，先保存然后等待完成信号
  const handleSaveAndNavigate = () => {
    // 设置等待完成状态
    setWaitingForComplete(true);
    
    // 调用原始保存函数
    onClick();
    
    // 设置等待保存完成
    
    // 如果5秒内没有收到完成信号，强制跳转（容错处理）
    setTimeout(() => {
      if (waitingForComplete && onNavigate) {
        // 超时处理，直接跳转
        onNavigate();
        setWaitingForComplete(false);
      }
    }, 5000);
  };
  
  const tooltipTitle = savePhase === SaveWorkflowPhase.COMPLETED 
    ? '已成功保存工作流' 
    : '保存当前工作流并跳转到使用页面';
  
  return (
    <Tooltip title={tooltipTitle}>
      <Button
        type="default"  // 改为default类型，使用白色背景
        icon={getSaveIcon(savePhase)}
        onClick={handleSaveAndNavigate}
        loading={loading}
        disabled={disabled}
      >
        {getSaveButtonText(savePhase, saveMessage)}
      </Button>
    </Tooltip>
  );
};

export default SaveButtonWhite;
