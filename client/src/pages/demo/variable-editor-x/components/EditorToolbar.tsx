import React from 'react';
import { Tooltip, Button, Space } from 'antd';
import { PlusCircleOutlined, EyeOutlined, SyncOutlined } from '@ant-design/icons';
import { ToolbarConfig } from '../types';

interface EditorToolbarProps {
  onInsertVariable: () => void;
  onShowPreview: () => void;
  onRefreshVariables?: () => void;
  config?: ToolbarConfig;
}

/**
 * 编辑器工具栏 (扁平化结构)
 * 提供变量插入按钮和预览按钮
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertVariable,
  onShowPreview,
  onRefreshVariables,
  config
}) => {
  // 解构配置项，使用默认值
  const {
    showInsertVariable = true,
    showPreview = true,
    showRefreshVariables = !!onRefreshVariables,
    showVersion = true,
    customButtons = null
  } = config || {};

  return (
    <div className="editor-toolbar">
      {/* 左侧按钮 - 极简风格 */}
      {showInsertVariable && (
        <Button 
          type="text" 
          size="small"
          className="editor-toolbar-btn" 
          onClick={onInsertVariable}
          icon={<PlusCircleOutlined />}
        >
          插入变量
        </Button>
      )}

      {showPreview && (
        <Button 
          type="text" 
          size="small"
          className="editor-toolbar-btn" 
          onClick={onShowPreview}
          icon={<EyeOutlined />}
        >
          解析值
        </Button>
      )}

      {showRefreshVariables && onRefreshVariables && (
        <Button 
          type="text" 
          size="small"
          className="editor-toolbar-btn" 
          onClick={onRefreshVariables}
          icon={<SyncOutlined />}
        >
          刷新
        </Button>
      )}

      {/* 自定义按钮 */}
      {customButtons}

      {/* 右侧版本号 */}
      {showVersion && <span className="toolbar-version">v1.1</span>}
    </div>
  );
};

export default EditorToolbar;
