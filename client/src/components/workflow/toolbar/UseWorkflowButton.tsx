import React from 'react';
import { Button, Tooltip } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';

interface UseWorkflowButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 使用工作流按钮组件
 * 用于启动工作流运行页面
 */
const UseWorkflowButton: React.FC<UseWorkflowButtonProps> = ({
  onClick,
  disabled = false
}) => {
  return (
    <Tooltip title="使用工作流">
      <Button
        type="default"
        icon={<ExperimentOutlined />}
        onClick={onClick}
        disabled={disabled}
      >
        使用
      </Button>
    </Tooltip>
  );
};

export default UseWorkflowButton;
