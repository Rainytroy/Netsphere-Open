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
 * 自定义工具栏组件 - 适用于VEX 1.2
 * 支持变量插入、预览和刷新功能
 * 与原始CustomToolbar保持相同的API，只修改了类名和版本显示
 * 1.2版本进行了DOM结构优化，减少了嵌套层级
 */
const CustomToolbarV1_1: React.FC<CustomToolbarProps> = ({
  onInsertVariable,
  onShowPreview,
  onRefreshVariables,
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

      {/* 版本号显示在右侧 - 注意这里更新为1.2版本 */}
      {showVersion && <span className="vex-toolbar-version">VEX 1.2</span>}
    </div>
  );
};

export default CustomToolbarV1_1;
