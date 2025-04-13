import React from 'react';
import { Button, Tooltip, message } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';

interface SaveAndUseButtonProps {
  onNavigate: () => void; // 仅用于跳转的函数
  disabled?: boolean;
}

/**
 * 使用按钮组件
 * 纯粹负责跳转到使用页面，不包含保存逻辑
 */
const SaveAndUseButton: React.FC<SaveAndUseButtonProps> = ({
  onNavigate,
  disabled = false
}) => {
  // 处理跳转 - 直接跳转，不显示任何提示
  const handleUse = () => {
    // 直接跳转，不再显示任何提示信息
    onNavigate();
  };
  
  const tooltipTitle = '跳转到使用页面';
  
  return (
    <Tooltip title={tooltipTitle}>
      <Button
        type="primary"
        icon={<ExperimentOutlined />}
        onClick={handleUse}
        disabled={disabled}
      >
        使用
      </Button>
    </Tooltip>
  );
};

export default SaveAndUseButton;
