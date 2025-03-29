import React from 'react';
import { Button, Space, Divider, Tooltip, Dropdown, Menu } from 'antd';
import { 
  PlusOutlined, 
  ClearOutlined, 
  CodeOutlined, 
  BugOutlined,
  DownOutlined
} from '@ant-design/icons';
import { Editor } from '@tiptap/react';
import { VariableData } from '../types';

interface EditorToolbarProps {
  editor: Editor | null;
  variables: VariableData[];
  onInsertVariable?: (variable: VariableData) => void;
  onGetHTML?: () => void;
  onGetJSON?: () => void;
  onGetPlainText?: () => void;
  onClear?: () => void;
  showDebugTools?: boolean;
  showInsertButton?: boolean;
  showClearButton?: boolean;
  showExportButton?: boolean;
  customButtons?: React.ReactNode;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  variables,
  onInsertVariable,
  onGetHTML,
  onGetJSON,
  onGetPlainText,
  onClear,
  showDebugTools = false,
  showInsertButton = true,
  showClearButton = true,
  showExportButton = true,
  customButtons,
}) => {
  if (!editor) {
    return null;
  }

  // 插入随机变量函数
  const handleInsertRandomVariable = () => {
    if (variables.length > 0) {
      const randomIndex = Math.floor(Math.random() * variables.length);
      const variable = variables[randomIndex];
      
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'variable',
          attrs: {
            id: variable.id,
            field: variable.field,
            sourceName: variable.sourceName,
            sourceType: variable.sourceType,
          },
        })
        .run();
      
      if (onInsertVariable) {
        onInsertVariable(variable);
      }
    }
  };

  // 清空编辑器内容
  const handleClear = () => {
    editor.commands.clearContent();
    if (onClear) {
      onClear();
    }
  };

  // 获取HTML内容
  const handleGetHTML = () => {
    console.log('HTML内容:', editor.getHTML());
    if (onGetHTML) {
      onGetHTML();
    } else {
      alert('HTML内容已打印到控制台');
    }
  };

  // 获取JSON内容
  const handleGetJSON = () => {
    console.log('JSON内容:', editor.getJSON());
    if (onGetJSON) {
      onGetJSON();
    } else {
      alert('JSON内容已打印到控制台');
    }
  };

  // 获取纯文本内容
  const handleGetPlainText = () => {
    console.log('纯文本内容:', editor.getText());
    if (onGetPlainText) {
      onGetPlainText();
    } else {
      alert('纯文本内容已打印到控制台');
    }
  };

  // 导出菜单选项
  const exportMenu = (
    <Menu>
      <Menu.Item key="html" onClick={handleGetHTML}>导出HTML</Menu.Item>
      <Menu.Item key="json" onClick={handleGetJSON}>导出JSON</Menu.Item>
      <Menu.Item key="text" onClick={handleGetPlainText}>导出纯文本</Menu.Item>
    </Menu>
  );

  return (
    <div className="editor-toolbar" style={{ 
      padding: '8px', 
      borderBottom: '1px solid #f0f0f0', 
      background: '#fafafa',
      display: 'flex',
      justifyContent: 'space-between'
    }}>
      <Space>
        {showInsertButton && (
          <Tooltip title="插入随机变量">
            <Button 
              icon={<PlusOutlined />} 
              onClick={handleInsertRandomVariable}
              disabled={variables.length === 0}
            >
              插入变量
            </Button>
          </Tooltip>
        )}
        
        {showClearButton && (
          <Tooltip title="清空编辑器内容">
            <Button 
              icon={<ClearOutlined />} 
              onClick={handleClear}
            >
              清空
            </Button>
          </Tooltip>
        )}
        
        {showExportButton && (
          <Dropdown overlay={exportMenu}>
            <Button>
              导出 <DownOutlined />
            </Button>
          </Dropdown>
        )}
        
        {showDebugTools && (
          <>
            <Divider type="vertical" />
            <Tooltip title="查看HTML内容">
              <Button icon={<CodeOutlined />} onClick={handleGetHTML} />
            </Tooltip>
            <Tooltip title="查看编辑器状态">
              <Button icon={<BugOutlined />} onClick={handleGetJSON} />
            </Tooltip>
          </>
        )}
        
        {customButtons && (
          <>
            <Divider type="vertical" />
            {customButtons}
          </>
        )}
      </Space>
    </div>
  );
};

export default EditorToolbar;
