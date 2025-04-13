import React from 'react';
import { Input, Space, Tooltip, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface WorkflowNameEditorProps {
  name: string;
  isEditingName: boolean;
  isNewWorkflow?: boolean;
  setName: (name: string) => void;
  setIsEditingName: (isEditing: boolean) => void;
}

/**
 * 工作流名称编辑器组件
 * 处理工作流名称的展示和编辑
 */
const WorkflowNameEditor: React.FC<WorkflowNameEditorProps> = ({
  name,
  isEditingName,
  isNewWorkflow = false,
  setName,
  setIsEditingName
}) => {
  // 处理名称编辑
  const handleNameEdit = () => {
    setIsEditingName(true);
  };
  
  // 处理名称保存
  const handleNameSave = () => {
    setIsEditingName(false);
  };
  
  return (
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
  );
};

export default WorkflowNameEditor;
