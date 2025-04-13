import React from 'react';
import { Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

interface BackButtonProps {
  onClick: () => void;
}

/**
 * 返回按钮组件
 * 用于从工作流编辑页面返回
 */
const BackButton: React.FC<BackButtonProps> = ({ onClick }) => {
  return (
    <Tooltip title="返回工作流列表">
      <ArrowLeftOutlined 
        onClick={onClick} 
        style={{ fontSize: 16, marginRight: 16, cursor: 'pointer' }}
      />
    </Tooltip>
  );
};

export default BackButton;
