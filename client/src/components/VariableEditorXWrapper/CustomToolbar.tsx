import React from 'react';
import { Button, Tooltip } from 'antd';
import { PlusCircleOutlined, EyeOutlined, SyncOutlined } from '@ant-design/icons';
import { ToolbarConfig } from '../../pages/demo/variable-editor-x/types';

interface CustomToolbarProps {
  onInsertVariable: () => void;
  onShowPreview: () => void;
  onRefreshVariables?: () => void;
  config?: ToolbarConfig | boolean;
}

/**
 * 自定义工具栏组件 - v3.0版本
 * 支持变量插入、预览和更新标识符功能
 */
const CustomToolbar: React.FC<CustomToolbarProps> = ({
  onInsertVariable,
  onShowPreview,
  onRefreshVariables, // 实际上是更新标识符功能
  config
}) => {
  // 转换配置项
  const toolbarConfig = typeof config === 'boolean' ? undefined : config;
  
  // 解构配置项，使用默认值
  const {
    showInsertVariable = true,
    showPreview = true,
    showRefreshVariables = !!onRefreshVariables,
    showVersion = true,
    customButtons = null
  } = toolbarConfig || {};

  return (
    <div className="editor-toolbar">
      {/* 左侧按钮区域 */}
      {showInsertVariable && (
        <Button 
          type="text" 
          size="small"
          className="vex-toolbar-btn" 
          onClick={onInsertVariable}
          icon={<PlusCircleOutlined />}
        >
          输入@或点击插入变量
        </Button>
      )}

      {/* 预览按钮 */}
      {showPreview && (
        <Button 
          type="text" 
          size="small"
          className="vex-toolbar-btn" 
          onClick={onShowPreview}
          icon={<EyeOutlined />}
        >
          解析值
        </Button>
      )}

      {/* 刷新变量按钮 */}
      {showRefreshVariables && onRefreshVariables && (
        <Button 
          type="text" 
          size="small"
          className="vex-toolbar-btn" 
          onClick={onRefreshVariables}
          icon={<SyncOutlined />}
        >
          更新标识符
        </Button>
      )}

      {/* 自定义按钮 */}
      {customButtons}

      {/* 版本号显示在右侧 */}
      {showVersion && <span className="vex-toolbar-version">VEX 1.2</span>}
    </div>
  );
};

export default CustomToolbar;
